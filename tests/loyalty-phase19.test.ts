import { migrationPath } from "./helpers/backend";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(migrationPath("0043_loyalty_rewards"), "utf8");

describe("Phase 19 loyalty and rewards", () => {
  it("uses one service function for cached loyalty balance mutations", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.apply_loyalty_delta");
    expect(migration).toContain("customers_loyalty_balance_guard");
    expect(migration).toContain("app.loyalty_balance_mutation");
    expect(migration).toContain("CHECK (loyalty_points_balance >= 0)");
  });

  it("earns only on delivered paid order lines and reverses on cancellation", () => {
    expect(migration).toContain("orders_loyalty_status_trigger");
    expect(migration).toContain("NEW.status='DELIVERED'");
    expect(migration).toContain("OLD.status='DELIVERED' AND NEW.status='CANCELLED'");
    expect(migration).toContain("AND NOT ol.is_free_item");
    expect(migration).toContain("order:'||p_order_id::text||':delivered");
    expect(migration).toContain("order:'||p_order_id::text||':reversed");
  });

  it("prevents direct transaction writes and scopes vendor requests by customer link", () => {
    const vendorScopeFix = fs.readFileSync(migrationPath("0044_loyalty_vendor_scope_fix"), "utf8");
    expect(migration).toContain("DROP POLICY IF EXISTS loyalty_transactions_business_manage");
    expect(migration).not.toContain("CREATE POLICY loyalty_transactions_business_manage");
    expect(migration).toContain("CREATE POLICY redemptions_vendor_request");
    expect(migration).toContain("EXISTS (SELECT 1 FROM public.customer_users cu");
    expect(migration).toContain("status='REQUESTED'");
    expect(vendorScopeFix).toContain("public.vendor_accounts");
    expect(vendorScopeFix).toContain("UNION ALL");
  });

  it("makes redemption approval atomic, single-use, and order-bound where needed", () => {
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS redemptions_one_pending_per_customer_reward_idx");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.approve_loyalty_redemption");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.reject_loyalty_redemption");
    expect(migration).toContain("A nominated order is required for this reward.");
    expect(migration).toContain("status='REQUESTED'");
    expect(migration).toContain("points_redeemed=points_redeemed+");
    expect(migration).toContain("is_free_item,redemption_id");
  });

  it("contains reconciliation, liability aggregation, and indexed dashboard paths", () => {
    const liabilityFix = fs.readFileSync(migrationPath("0045_loyalty_liability_basis_fix"), "utf8");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.reconcile_loyalty_balances");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.loyalty_liability_summary");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS customers_loyalty_positive_idx");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS redemptions_reward_status_idx");
    expect(liabilityFix).not.toContain("discount_percent/100");
    expect(liabilityFix).toContain("Percentage rewards need an order total");
  });

  it("keeps routes and actions permission-first and bilingual", () => {
    const vendorPage = fs.readFileSync("app/[locale]/(vendor)/vendor/points/page.tsx", "utf8");
    const vendorAction = fs.readFileSync("app/[locale]/(vendor)/vendor/points/actions.ts", "utf8");
    const adminAction = fs.readFileSync("app/[locale]/(admin)/admin/rewards/actions.ts", "utf8");
    const view = fs.readFileSync("app/[locale]/(vendor)/vendor/points/PointsView.tsx", "utf8");
    expect(vendorPage.indexOf('await requirePermission("loyalty.view"')).toBeLessThan(vendorPage.indexOf("const data = await getVendorLoyaltyData"));
    expect(vendorAction.indexOf('await requirePermission("redemption.request"')).toBeLessThan(vendorAction.indexOf("const supabase ="));
    expect(adminAction.indexOf('await requirePermission("reward.manage"')).toBeLessThan(adminAction.indexOf("const supabase ="));
    expect(view).toContain('useTranslations("loyalty")');
    expect(view).toContain("<bdi>");
  });
});
