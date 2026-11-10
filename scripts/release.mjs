// Packs the extension, then uploads and publishes it to the Chrome Web Store.
// Needs credentials in .env (see .env.example). Usage: npm run release
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { pack } from "./pack.mjs";

const EXTENSION_ID = "jjniilllmpgdakgffiilihbjchglpjjp";
const REQUIRED_ENV = ["CLIENT_ID", "CLIENT_SECRET", "REFRESH_TOKEN", "PUBLISHER_ID"];

if (existsSync(".env")) process.loadEnvFile(".env");
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`Missing ${missing.join(", ")} in .env (see .env.example)`);
  process.exit(1);
}

const zip = pack();
const { status } = spawnSync(
  "npx",
  ["chrome-webstore-upload", "--source", zip, "--extension-id", EXTENSION_ID],
  { stdio: "inherit", shell: true },
);
process.exit(status ?? 1);
