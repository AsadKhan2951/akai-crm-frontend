import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignored = new Set(["node_modules", ".next", ".git"]);
const allowedServiceRole = new Set(["lib/admin", "scripts"]);
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".jsx"]);
const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) inspect(full);
  }
}

function inspect(file) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  const source = fs.readFileSync(file, "utf8");
  if (/service_role|SUPABASE_SERVICE_KEY/.test(source)) {
    const top = relative.split("/").slice(0, 2).join("/");
    if (!allowedServiceRole.has(top) && !relative.startsWith("scripts/")) violations.push(`${relative}: service-role reference outside approved system-job paths`);
  }
  if (/console\.log\s*\(/.test(source) && !relative.startsWith("scripts/") && !relative.startsWith("prisma/") && !relative.startsWith("tests/")) violations.push(`${relative}: console.log in production code`);
  if (/(?:parseFloat|Number)\s*\(\s*[^)]*(?:amountPKR|pricePKR|balancePKR|revenue|margin|costPKR|totalAmountPKR)/i.test(source)) violations.push(`${relative}: possible currency number conversion`);
}

walk(root);
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log("Repository policy check passed: no forbidden patterns found.");
