import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(root, "node_modules", "lucide-static", "font");
const dest = path.join(root, "css", "vendor", "lucide");

if (!existsSync(source)) {
  throw new Error("lucide-static is not installed. Run npm install first.");
}

mkdirSync(dest, { recursive: true });
for (const file of readdirSync(source)) {
  cpSync(path.join(source, file), path.join(dest, file));
}

console.log("Copied Lucide font files to css/vendor/lucide");
