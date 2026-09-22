import { migrationPath } from "./helpers/backend";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(migrationPath("0046_returns_claims_warranty"), "utf8");
const reporting = fs.readFileSync(migrationPath("0047_claim_reporting_notifications"), "utf8");
const aiEvidence = fs.readFileSync(migrationPath("0048_claim_ai_evidence"), "utf8");
const actions = fs.readFileSync("lib/claims/actions.ts", "utf8");
const aiRoute = fs.readFileSync("app/api/ai/claim-draft/route.ts", "utf8");
const aiHelper = fs.readFileSync("lib/ai/claims.ts", "utf8");
const vendorPage = fs.readFileSync("app/[locale]/(vendor)/vendor/claims/page.tsx", "utf8");
const warrantyJob = fs.readFileSync("lib/admin/warranty-system-job.ts", "utf8");
const slaMigration = fs.readFileSync(migrationPath("0049_claim_sla_permission_hardening"), "utf8");
const slaJob = fs.readFileSync("lib/admin/claims-system-job.ts", "utf8");

describe("Phase 20 claims and warranty contracts", () => {
  it("keeps claims photo limits and damage-photo requirement in the database boundary", () => {
    expect(migration).toContain("jsonb_array_length(p_photo_urls) > 5");
    expect(migration).toContain("p_claim_type='DAMAGED'");
    expect(migration).toContain("claim_photos");
  });

  it("uses transactional ledger delta for credit notes and stock-safe replacements", () => {
    expect(migration).toContain("apply_customer_ledger_delta");
    expect(migration).toContain("FOR UPDATE OF p");
    expect(migration).toContain("stock_quantity=stock_quantity-line_row.quantity");
    expect(migration).toContain("status='RESOLVED'");
  });

  it("auto-creates one short-supply claim per delivery stop line and notifies linked vendors", () => {
    expect(reporting).toContain("source_delivery_stop_line_id");
    expect(reporting).toContain("claim_status_notification_trigger");
    expect(reporting).toContain("customer_users");
  });

  it("keeps claim actions permission-first and warranty registration consent explicit", () => {
    expect(actions.indexOf('requirePermission("claim.create")')).toBeGreaterThanOrEqual(0);
    expect(actions.indexOf('requirePermission("claim.view")')).toBeGreaterThanOrEqual(0);
    expect(actions.indexOf('requirePermission("warranty.manage")')).toBeGreaterThanOrEqual(0);
    expect(actions).toContain("p_consent");
  });

  it("keeps AI draft-only, evidence-traceable, RLS-scoped, and non-mutating", () => {
    expect(aiRoute.indexOf('await requirePermission("claim.view")')).toBeGreaterThanOrEqual(0);
    expect(aiRoute.indexOf('await requirePermission("ai.generate_content")')).toBeGreaterThanOrEqual(0);
    expect(aiHelper).toContain("draftOnly: true");
    expect(aiHelper).toContain("evidenceTrace");
    expect(aiEvidence).toContain("claim_root_cause_groups");
    expect(aiHelper).not.toContain("supabase.from(\"claims\").update");
  });

  it("does not hardcode vendor-facing claim copy and schedules expiry reminders as a system job", () => {
    expect(vendorPage).toContain("getTranslations(\"claims\")");
    expect(vendorPage).not.toContain("No claims yet");
    expect(warrantyJob).toContain("getSystemSupabaseClient");
    expect(warrantyJob).toContain("WARRANTY_EXPIRY");
  });

  it("keeps approval separate from review and schedules Asia/Karachi SLA breach alerts", () => {
    expect(slaMigration).toContain("has_permission(auth.uid(),'claim.approve')");
    expect(slaMigration).toContain("has_permission(auth.uid(),'claim.review')");
    expect(slaMigration).toContain("Asia/Karachi");
    expect(slaJob).toContain("claim_sla_breach_rows");
    expect(slaJob).toContain("CLAIM_SLA_BREACH");
  });
});
