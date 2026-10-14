// Wallet adapter packages pull react-native, which brings its own @types/react@19 into nested
// node_modules. TypeScript then resolves two incompatible React type versions for this React 18 app.
// Removing the nested copies makes everything resolve to the top-level @types/react@18.
import fs from "node:fs";
import path from "node:path";

function walk(dir, depth = 0) {
  if (!fs.existsSync(dir) || depth > 6) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name === "react" && path.basename(dir) === "@types" && dir !== path.resolve("node_modules/@types")) {
      fs.rmSync(full, { recursive: true, force: true });
      console.log("removed nested", full);
      continue;
    }
    if (entry.name === ".bin") continue;
    walk(full, depth + 1);
  }
}
walk(path.resolve("node_modules"));
