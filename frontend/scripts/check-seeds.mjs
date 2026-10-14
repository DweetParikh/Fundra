// Verifies that the seeds used by the frontend match program/programs/fundra/src/constants.rs.
// The frontend reads seeds from the IDL (generated from constants.rs); this script checks that the
// copied IDL is not stale, and that constants.rs still has exactly the expected seed list.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rs = fs.readFileSync(path.join(here, "../../program/programs/fundra/src/constants.rs"), "utf8");
const idl = JSON.parse(fs.readFileSync(path.join(here, "../src/lib/anchor/idl/fundra.json"), "utf8"));

const fromRs = {};
for (const m of rs.matchAll(/pub const (\w+_SEED): &\[u8\] = b"([^"]*)";/g)) fromRs[m[1]] = m[2];

const expected = [
  "PLATFORM_CONFIG_SEED", "CAMPAIGN_SEED", "VAULT_AUTHORITY_SEED", "VAULT_SEED",
  "REWARD_MINT_SEED", "CONTRIBUTOR_SEED", "MILESTONE_SEED",
];

let ok = true;
for (const name of expected) {
  const r = fromRs[name];
  const c = idl.constants.find((x) => x.name === name);
  if (r === undefined) { console.error(`constants.rs is missing ${name}`); ok = false; continue; }
  if (!c) { console.error(`IDL is missing ${name}; run npm run sync:idl`); ok = false; continue; }
  const idlStr = Buffer.from(JSON.parse(c.value)).toString("utf8");
  if (idlStr !== r) { console.error(`${name}: constants.rs="${r}" but IDL="${idlStr}" (stale IDL? run npm run sync:idl)`); ok = false; }
  else console.log(`ok  ${name} = "${r}"`);
}
process.exit(ok ? 0 : 1);
