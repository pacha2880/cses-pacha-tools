// Bumps the patch version, validates, commits everything and pushes.
// On main, the push triggers .github/workflows/release.yml, which publishes to the store.
// Usage: npm run ship -- "commit message"
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pack } from "./pack.mjs";

const message = process.argv[2];
if (!message) {
  console.error('Usage: npm run ship -- "commit message"');
  process.exit(1);
}

const git = (...args) => execFileSync("git", args, { stdio: "inherit" });

const manifest = readFileSync("manifest.json", "utf8");
const versionRe = /("version":\s*")(\d+)\.(\d+)\.(\d+)(")/;
if (!versionRe.test(manifest)) throw new Error('manifest.json "version" must look like 1.2.3');
writeFileSync("manifest.json", manifest.replace(versionRe, (_, pre, major, minor, patch, post) => `${pre}${major}.${minor}.${+patch + 1}${post}`));

pack();
git("add", "-A");
git("commit", "-m", message);
git("push");
