import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "dist");
const lucideSource = path.join(root, "node_modules", "lucide-static", "font");
const lucideDest = path.join(root, "css", "vendor", "lucide");

if (!existsSync(lucideSource)) {
  throw new Error("lucide-static is not installed. Run npm install first.");
}

mkdirSync(lucideDest, { recursive: true });
for (const file of readdirSync(lucideSource)) {
  cpSync(path.join(lucideSource, file), path.join(lucideDest, file));
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const file of readdirSync(root)) {
  if (file.endsWith(".html")) {
    cpSync(path.join(root, file), path.join(dist, file));
  }
}

cpSync(path.join(root, "css"), path.join(dist, "css"), { recursive: true });
cpSync(path.join(root, "js"), path.join(dist, "js"), { recursive: true });

console.log("Built static site into dist/");
