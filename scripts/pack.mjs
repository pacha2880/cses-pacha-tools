// Validates the extension and zips exactly the files manifest.json references
// into dist/cses-pacha-tools-v<version>.zip. Usage: npm run pack
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { Script } from "node:vm";
import { zipSync } from "fflate";

export function pack() {
  const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
  const { version } = manifest;
  if (!/^\d+(\.\d+){0,3}$/.test(version)) throw new Error(`Invalid version "${version}"`);

  const files = new Set(["manifest.json", ...Object.values(manifest.icons ?? {})]);
  for (const cs of manifest.content_scripts ?? []) {
    for (const f of [...(cs.css ?? []), ...(cs.js ?? [])]) files.add(f);
  }
  for (const war of manifest.web_accessible_resources ?? []) {
    for (const f of war.resources ?? []) files.add(f);
  }
  for (const f of files) {
    if (!existsSync(f)) throw new Error(`manifest.json references missing file: ${f}`);
  }

  // Content scripts share one scope: compile them together, in load order, to catch
  // syntax errors and duplicate top-level declarations (both break the extension in Chrome).
  for (const cs of manifest.content_scripts ?? []) {
    new Script((cs.js ?? []).map(f => readFileSync(f, "utf8")).join("\n"), { filename: "content-scripts" });
  }

  const zip = zipSync(Object.fromEntries([...files].map(f => [f, readFileSync(f)])));
  mkdirSync("dist", { recursive: true });
  const out = `dist/cses-pacha-tools-v${version}.zip`;
  writeFileSync(out, zip);
  console.log(`Packed ${files.size} files -> ${out}`);
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) pack();
