import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = ["README.md", "PROJECT_RULES.md", "Dockerfile", ".env.example", "docs/user-guides/sales-agent-en.md", "docs/user-guides/sales-agent-ur.md", "docs/user-guides/vendor-en.md", "docs/user-guides/vendor-ur.md"];
const requiredEnvNames = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_APP_URL", "CRON_SECRET"];
// Pages and routes referenced by the app/README but missing from the recovered source.
const historicalRequired = [
  "app/[locale]/auth/login/page.tsx",
  "app/[locale]/(vendor)/vendor/page.tsx",
  "app/[locale]/(vendor)/vendor/catalogue/VendorCatalogue.tsx",
  "app/api/vendor/catalogue-pdf/route.ts",
  "lib/pdf/vendor-catalogue.ts",
];
let failed = false;
function ok(label) { console.log(`PASS ${label}`); }
function fail(label) { failed = true; console.log(`BLOCKED ${label}`); }

for (const file of requiredFiles) {
  if (fs.existsSync(path.join(root, file))) ok(`required artifact exists: ${file}`);
  else fail(`required artifact missing: ${file}`);
}
const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
for (const name of requiredEnvNames) {
  if (new RegExp(`^${name}=`, "m").test(envExample)) ok(`environment name documented: ${name}`);
  else fail(`environment name missing from .env.example: ${name}`);
}
for (const file of historicalRequired) {
  if (fs.existsSync(path.join(root, file))) ok(`source present: ${file}`);
  else fail(`source missing: ${file}`);
}
if (fs.existsSync(path.join(root, ".git"))) ok("Git metadata exists");
else fail("Git metadata is absent; push this folder to GitHub first");
console.log(failed ? "\nDeployment readiness: BLOCKED — see the lines above." : "\nDeployment readiness: READY FOR STAGING CHECKS.");
process.exitCode = failed ? 1 : 0;
