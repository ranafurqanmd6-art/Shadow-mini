import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url));
export const commands=new Map();
for (const file of fs.readdirSync(path.join(here,"../commands")).filter(f=>f.endsWith(".js")).sort()) {
  try { const mod=await import(pathToFileURL(path.join(here,"../commands",file))); if(mod.command?.name) commands.set(mod.command.name.toLowerCase(),mod.command); }
  catch(e) { console.error(`[COMMAND LOAD] ${file}:`,e.message); }
}
