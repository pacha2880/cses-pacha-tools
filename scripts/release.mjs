// Packs the extension and submits it to the Chrome Web Store (API v2, service account).
// Needs SERVICE_ACCOUNT_KEY (the service account's JSON key, base64) and PUBLISHER_ID
// in .env or the environment (see README, "Publishing").
//
// Usage: npm run release [-- --status | --cancel-pending]
//   (no flag)         upload + submit, unless a review is already pending (then exit 0, do nothing)
//   --status          print the store status and exit
//   --cancel-pending  cancel a pending review first, then upload + submit
//
// Policy: at most one version in review. Cancelling a pending review would restart Google's
// queue on every small change, so a release that finds one pending is deferred; the scheduled
// run of the Release workflow submits the latest version once the review is over.
import { createSign } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { pack } from "./pack.mjs";

const EXTENSION_ID = "jjniilllmpgdakgffiilihbjchglpjjp";
const API = "https://chromewebstore.googleapis.com";

function env() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const missing = ["SERVICE_ACCOUNT_KEY", "PUBLISHER_ID"].filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Missing ${missing.join(", ")} in .env (see README, "Publishing")`);
  return {
    key: JSON.parse(Buffer.from(process.env.SERVICE_ACCOUNT_KEY, "base64").toString("utf8")),
    item: `publishers/${process.env.PUBLISHER_ID}/items/${EXTENSION_ID}`,
  };
}

// OAuth2 JWT-bearer flow for a service account, signed with node:crypto (no dependency).
async function accessToken(key) {
  const b64 = obj => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: key.client_email, scope: "https://www.googleapis.com/auth/chromewebstore", aud: key.token_uri, iat: now, exp: now + 3600 };
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64(claims)}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  const resp = await fetch(key.token_uri, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(`Token request failed: ${JSON.stringify(json)}`);
  return json.access_token;
}

function client(token) {
  return async (method, path, body, headers = {}) => {
    const resp = await fetch(`${API}${path}`, { method, body, headers: { Authorization: `Bearer ${token}`, ...headers } });
    const text = await resp.text();
    const json = text ? JSON.parse(text) : {};
    if (!resp.ok) throw new Error(`${method} ${path} -> ${resp.status}: ${text}`);
    return json;
  };
}

const describe = s => s ? `${s.state} (${(s.distributionChannels ?? []).map(c => `v${c.crxVersion} ${c.deployPercentage}%`).join(", ")})` : "none";

async function main(flag) {
  const { key, item } = env();
  const call = client(await accessToken(key));
  const status = await call("GET", `/v2/${item}:fetchStatus`);
  console.log(`Published: ${describe(status.publishedItemRevisionStatus)}`);
  console.log(`Submitted: ${describe(status.submittedItemRevisionStatus)}`);
  if (flag === "--status") return;

  if (status.submittedItemRevisionStatus?.state === "PENDING_REVIEW") {
    if (flag !== "--cancel-pending") {
      console.log("A version is still in review; not submitting another one (it would restart the review).");
      console.log("The scheduled Release run submits the latest version once the review is over.");
      return;
    }
    await call("POST", `/v2/${item}:cancelSubmission`);
    console.log("Cancelled the pending review.");
  }

  const zip = pack();
  let upload = await call("POST", `/upload/v2/${item}:upload`, readFileSync(zip), { "Content-Type": "application/zip" });
  for (let i = 0; upload.uploadState === "IN_PROGRESS" && i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const s = await call("GET", `/v2/${item}:fetchStatus`);
    upload = { ...upload, uploadState: s.lastAsyncUploadState };
  }
  if (upload.uploadState !== "SUCCEEDED") throw new Error(`Upload failed: ${JSON.stringify(upload)}`);
  console.log(`Uploaded v${upload.crxVersion ?? "?"}.`);

  const published = await call("POST", `/v2/${item}:publish`, JSON.stringify({}), { "Content-Type": "application/json" });
  console.log(`Submitted: ${published.state}`);
  // Tells the Release workflow to tag this version as released.
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "submitted=true\n");
  if (published.warningInfo) console.log(`Warnings: ${JSON.stringify(published.warningInfo)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2]).catch(e => {
    console.error(e.message);
    process.exit(1);
  });
}
