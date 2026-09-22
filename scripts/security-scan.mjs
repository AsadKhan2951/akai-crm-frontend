import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignored = new Set(["node_modules", ".git", ".next", ".next/cache"]);
const forbiddenNamePattern = /(?:service_role|SUPABASE_SERVICE_KEY)/i;
const clientSecretPattern = /(?:sk-ant-[A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{12,}|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY)/;
const allowedPrefixes = ["lib/admin/", "scripts/", "prisma/migrations/", "tests/"];

function walk(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = path.relative(root, path.join(directory, entry.name)).replaceAll(path.sep, "/");
    if (ignored.has(relative) || relative.startsWith(".next/cache/")) continue;
    if (entry.isDirectory()) walk(path.join(directory, entry.name), result);
    else result.push(relative);
  }
  return result;
}

const repoHits = [];
for (const relative of walk(root)) {
  let content;
  try { content = fs.readFileSync(path.join(root, relative), "utf8"); } catch { continue; }
  content.split("\n").forEach((line, index) => {
    if (forbiddenNamePattern.test(line)) repoHits.push({ relative, line: index + 1, text: line.trim(), allowed: allowedPrefixes.some((prefix) => relative.startsWith(prefix)) || relative === ".env.example" });
  });
}
console.log("--- repository service-role name uses ---");
if (!repoHits.length) console.log("none");
for (const hit of repoHits) console.log(`${hit.allowed ? "ALLOWED" : "FORBIDDEN"} ${hit.relative}:${hit.line} ${hit.text}`);
const forbidden = repoHits.filter((hit) => !hit.allowed);

const clientDirectory = path.join(root, ".next", "static");
const clientHits = [];
if (fs.existsSync(clientDirectory)) {
  for (const relative of walk(clientDirectory)) {
    let content;
    try { content = fs.readFileSync(path.join(root, relative), "utf8"); } catch { continue; }
    if (clientSecretPattern.test(content)) clientHits.push(relative);
  }
}
console.log("--- client build secret scan ---");
console.log(clientHits.length ? clientHits.join("\n") : "no secret values or server-role key names found in .next/static");
if (forbidden.length || clientHits.length) process.exitCode = 1;
