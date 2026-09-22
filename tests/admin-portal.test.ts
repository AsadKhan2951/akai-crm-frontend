import { migrationPath } from "./helpers/backend";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(migrationPath("0013_admin_portal"), "utf8");
const actions = readFileSync(resolve(process.cwd(), "app/[locale]/(admin)/admin/actions.ts"), "utf8");
const dashboard = readFileSync(resolve(process.cwd(), "app/[locale]/(admin)/admin/page.tsx"), "utf8");
const cron = readFileSync(resolve(process.cwd(), "app/api/cron/admin-reports/route.ts"), "utf8");
const analytics = readFileSync(resolve(process.cwd(), "lib/ai/admin.ts"), "utf8");

describe("Admin portal contracts", () => {
  it("adds only additive Admin tables and RLS policies", () => {
    for (const table of ["admin_report_definitions", "admin_report_runs", "admin_impersonation_sessions", "admin_anomaly_alerts", "admin_dashboard_cache", "admin_user_invites"]) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain("admin_dashboard_cache_read");
    expect(migration).toContain("admin_user_invites_write");
  });

  it("uses SQL aggregation and five-minute per-user dashboard cache", () => {
    expect(migration).toContain("admin_dashboard_summary");
    expect(migration).toContain("admin_dashboard_analytics");
    expect(migration).toContain("admin_sales_team_metrics");
    expect(migration).toContain("expires_at");
    expect(actions).toMatch(/approveAdminOrder\(formData: FormData\) \{\n  await requirePermission\("order\.approve"\)/);
    expect(dashboard).toContain('requirePermission("dashboard.view", { asNotFound: true })');
  });

  it("keeps approval, ledger, and impersonation work transactional and audited", () => {
    expect(migration).toContain("approve_admin_order");
    expect(migration).toContain("reject_admin_order");
    expect(migration).toContain("record_admin_ledger_payment");
    expect(migration).toContain("insert into public.audit_logs");
    expect(migration).toContain("admin_impersonation_sessions");
    expect(migration).toContain("expires_at <= started_at + interval '30 minutes'");
  });

  it("blocks free-form or destructive analytics and shows a read-only query", () => {
    expect(analytics).toContain("Only read-only analytics are allowed");
    expect(analytics).toContain("admin_customers_stopped_ordering");
    expect(analytics).toContain("admin_brand_revenue_comparison");
    expect(analytics).toContain("SELECT * FROM admin_");
    expect(analytics).not.toMatch(/supabase\.rpc\(question/);
  });

  it("keeps user invite creation separate from Auth account creation", () => {
    expect(migration).toContain("admin_user_invites");
    expect(actions).toContain("createAdminInvite");
    expect(actions).not.toContain(["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"));
    expect(actions).not.toContain("auth.admin");
  });

  it("restricts scheduled work to the cron secret and system-only functions", () => {
    expect(cron).toContain("requireCronSecret(request)");
    expect(cron).toContain("getSystemSupabaseClient()");
    expect(migration).toContain("revoke all on function public.queue_due_admin_reports() from public, authenticated");
    expect(migration).toContain("revoke all on function public.generate_admin_anomaly_alerts() from public, authenticated");
  });
});
