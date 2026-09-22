import { migrationPath, backendPath } from "./helpers/backend";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { ImageValidationError, validateAndStripImage } from "../lib/security/image-validation";

const nextConfig = fs.readFileSync("next.config.mjs", "utf8");
const aiRoute = fs.readFileSync("app/api/ai/chat/route.ts", "utf8");
const catalogueAiRoute = fs.readFileSync("app/api/ai/catalogue-search/route.ts", "utf8");
const contentAiRoute = fs.readFileSync("app/api/ai/content-draft/route.ts", "utf8");
const salesAiRoute = fs.readFileSync("app/api/ai/sales/recommendations/route.ts", "utf8");
const syncRoute = fs.readFileSync("app/api/pwa/sync/route.ts", "utf8");
const receiptRoute = fs.readFileSync("app/api/sales/recovery/receipt/route.ts", "utf8");
const rateLimit = fs.readFileSync("lib/security/rate-limit.ts", "utf8");
const rateMigration = fs.readFileSync(migrationPath("0030_security_rate_limits"), "utf8");
const auditMigration = fs.readFileSync(migrationPath("0031_security_audit_triggers"), "utf8");
const validation = fs.readFileSync("lib/security/validation.ts", "utf8");
const scan = fs.readFileSync("scripts/security-scan.mjs", "utf8");
const passwordPolicy = fs.readFileSync("lib/security/password-policy.ts", "utf8");
const dataDoc = fs.readFileSync(backendPath("DATA.md"), "utf8");
const productUploadRoute = fs.readFileSync("app/api/uploads/product/route.ts", "utf8");
const sentryServer = fs.readFileSync("sentry.server.config.ts", "utf8");

function routeStartsWithPermission(route: string, permission: string, nextWork: string) {
  expect(route.indexOf(`requirePermission("${permission}")`)).toBeGreaterThanOrEqual(0);
  expect(route.indexOf(`requirePermission("${permission}")`)).toBeLessThan(route.indexOf(nextWork));
}

describe("Phase 15 security hardening contracts", () => {
  it("sets required security headers", () => {
    expect(nextConfig).toContain("Content-Security-Policy");
    expect(nextConfig).toContain("Strict-Transport-Security");
    expect(nextConfig).toContain("X-Frame-Options");
    expect(nextConfig).toContain("X-Content-Type-Options");
    expect(nextConfig).toContain("frame-ancestors 'none'");
    expect(nextConfig).toContain("object-src 'none'");
  });

  it("keeps permission checks before request work and adds rate limits", () => {
    routeStartsWithPermission(aiRoute, "ai.chat", "request.json");
    routeStartsWithPermission(syncRoute, "pwa.sync", "request.json");
    routeStartsWithPermission(receiptRoute, "collection.view", "new URL");
    expect(aiRoute).toContain("enforceUserRateLimit");
    expect(catalogueAiRoute).toContain("enforceUserRateLimit");
    expect(contentAiRoute).toContain("enforceUserRateLimit");
    expect(salesAiRoute).toContain("enforceUserRateLimit");
    expect(syncRoute).toContain("enforceRequestRateLimit");
    expect(receiptRoute).toContain("enforceRequestRateLimit");
    expect(rateLimit).toContain("consume_rate_limit");
    expect(rateMigration).toContain("rate_limit_buckets");
    expect(rateMigration).toContain("rate_limit_buckets_updated_at_idx");
    expect(rateMigration).toContain("security definer");
  });

  it("uses strict server-side Zod validation for high-risk JSON routes", () => {
    expect(validation).toContain(".strict()");
    expect(validation).toContain("aiChatRequestSchema");
    expect(validation).toContain("offlineSyncRequestSchema");
    expect(aiRoute).toContain("aiChatRequestSchema.safeParse");
    expect(syncRoute).toContain("offlineSyncRequestSchema.safeParse");
  });

  it("provides secret scanning and does not place server-role credentials in client code", () => {
    expect(scan).toContain(".next");
    expect(scan).toContain("lib/admin/");
    expect(scan).toContain("clientSecretPattern");
  });

  it("documents password, personal-data, access, third-party, and restore boundaries", () => {
    expect(passwordPolicy).toContain("password.length < 10");
    expect(passwordPolicy).toContain("COMMON_PASSWORDS");
    expect(dataDoc).toContain("## Stored data");
    expect(dataDoc).toContain("## Third parties");
    expect(dataDoc).toContain("## Access and retention");
    expect(dataDoc).toContain("## Backup and restore");
  });

  it("installs mutation audit coverage for every protected domain table", () => {
    for (const table of ["customers", "orders", "quotes", "ledger_entries", "payment_collections", "loyalty_transactions", "products", "price_lists", "catalog_visibility_rules", "roles", "role_permissions", "users"]) expect(auditMigration).toContain(`'${table}'`);
    expect(auditMigration).toContain("jsonb_build_object('before'");
    expect(auditMigration).toContain("auth.uid()");
    expect(auditMigration).toContain("audit_logs_entity_created_idx");
  });

  it("validates image bytes and strips JPEG EXIF segments", () => {
    const jpegWithExif = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66, 0xff, 0xd9]);
    expect(Array.from(validateAndStripImage(jpegWithExif, "image/jpeg"))).toEqual([0xff, 0xd8, 0xff, 0xd9]);
    expect(() => validateAndStripImage(new Uint8Array([0x89, 0x50]), "image/png")).toThrow(ImageValidationError);
    expect(productUploadRoute.indexOf('await requirePermission("product.manage_images")')).toBeLessThan(productUploadRoute.indexOf("return handleValidatedImageUpload"));
  });

  it("configures optional Sentry capture without sending PII", () => {
    expect(sentryServer).toContain("SENTRY_DSN");
    expect(sentryServer).toContain("sendDefaultPii: false");
    expect(sentryServer).toContain("delete event.user");
    expect(sentryServer).toContain("delete event.request.headers");
  });

  it("has a route-group error boundary for every portal", () => {
    for (const portal of ["admin", "sales", "vendor"]) expect(fs.existsSync(`app/[locale]/(${portal})/error.tsx`)).toBe(true);
  });
});
