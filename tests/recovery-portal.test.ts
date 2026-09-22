import { migrationPath } from "./helpers/backend";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(migrationPath("0014_payment_recovery"), "utf8");
const hardening = readFileSync(migrationPath("0015_recovery_hardening"), "utf8");
const corrections = ["0016_recovery_summary_fix", "0017_recovery_audit_fix", "0018_recovery_audit_columns_fix", "0019_recovery_deposit_scope_fix", "0020_recovery_deposit_id_fix", "0021_recovery_bounce_audit_fix"].map((folder) => readFileSync(migrationPath(folder), "utf8")).join("\n");
const actions = readFileSync("app/[locale]/(sales)/sales/recovery/actions.ts", "utf8");
const salesView = readFileSync("app/[locale]/(sales)/sales/recovery/RecoveryView.tsx", "utf8");
const adminView = readFileSync("app/[locale]/(admin)/admin/recovery/AdminRecoveryView.tsx", "utf8");
const receiptRoute = readFileSync("app/api/sales/recovery/receipt/route.ts", "utf8");

function occurrences(source: string, needle: string) {
  return source.split(needle).length - 1;
}

describe("Phase 11 recovery contracts", () => {
  it("records collections through a permission-first transaction with strict Decimal SQL and sequential monthly receipts", () => {
    expect(actions).toContain('await requirePermission("collection.record")');
    expect(migration).toContain("create table public.collection_receipt_counters");
    expect(migration).toContain("on conflict(month) do update set last_number=public.collection_receipt_counters.last_number+1");
    expect(migration).toContain("AKAI-R-");
    expect(migration).toContain("abs(p_amount_pkr)::numeric(12,2)");
    expect(migration).toContain("insert into public.audit_logs");
  });

  it("requires exact selected totals for deposits and verifies them transactionally", () => {
    expect(actions).toContain('await requirePermission("collection.deposit")');
    expect(actions).toContain("p_total_amount_pkr: totalAmountPKR");
    expect(migration).toContain("select coalesce(sum(pc.amount_pkr),0)::numeric(12,2) into selected_total");
    expect(migration).toContain("if selected_total <> p_total_amount_pkr then raise exception");
    expect(migration).toContain("select agent_id,total_amount_pkr into deposit_agent,verified_total from public.cash_deposits where id=p_deposit_id and status='PENDING' for update");
  });

  it("moves a cash balance exactly once on verification and never on collection recording or deposit submission", () => {
    const verifyFn = migration.slice(migration.indexOf("create or replace function public.verify_cash_deposit"), migration.indexOf("create or replace function public.clear_cheque_collection"));
    expect(occurrences(verifyFn, "public.apply_customer_ledger_delta(")).toBe(1);
    const recordFn = migration.slice(migration.indexOf("create or replace function public.record_payment_collection"), migration.indexOf("create or replace function public.submit_cash_deposit"));
    const depositFn = migration.slice(migration.indexOf("create or replace function public.submit_cash_deposit"), migration.indexOf("create or replace function public.verify_cash_deposit"));
    expect(recordFn).not.toContain("apply_customer_ledger_delta");
    expect(depositFn).not.toContain("apply_customer_ledger_delta");
    expect(verifyFn).toContain("update public.payment_collections set ledger_entry_id=public.apply_customer_ledger_delta");
    expect(verifyFn).toContain("for update loop");
    expect(verifyFn).toContain("where id=p_deposit_id and status='PENDING'");
  });

  it("keeps cheque clearing explicit and creates a reversal without overwriting the original payment link", () => {
    expect(migration).toContain("if collection_row.method='CHEQUE' then");
    expect(migration).toContain("update public.payment_collections set status='DEPOSITED'");
    expect(migration).toContain("create or replace function public.clear_cheque_collection");
    expect(hardening).toContain("reversal_entry_id := public.apply_customer_ledger_delta");
    expect(hardening).toContain("original_ledger_entry_id");
    expect(hardening).toContain("update public.payment_collections set status='BOUNCED',bounced_reason");
  });

  it("keeps reminder queueing opt-out/dispute safe and gives admins deposited-cheque controls", () => {
    expect(hardening).toContain("set_collection_reminder_preference");
    expect(hardening).toContain("coalesce(crp.opted_out,false)=false");
    expect(hardening).toContain("coalesce(crp.open_dispute,false)=false");
    expect(hardening).toContain("admin_deposited_cheques");
    expect(corrections).toContain("admin_recovery_summary");
    expect(corrections).toContain("recovery_audit");
    expect(corrections).toContain("gen_random_uuid()");
    expect(adminView).toContain("clearRecoveryCheque");
    expect(adminView).toContain("bounceRecoveryCheque");
  });

  it("generates a scoped receipt and exposes it only after collection recording", () => {
    expect(receiptRoute).toContain('await requirePermission("collection.view")');
    expect(receiptRoute).toContain('from("payment_collections")');
    expect(receiptRoute).toContain("application/pdf");
    expect(receiptRoute).toContain("Cache-Control");
    expect(salesView).toContain("/api/sales/recovery/receipt");
    expect(salesView).toContain("recordRecoveryCollection");
  });

  it("keeps bilingual recovery catalogues structurally identical", () => {
    const en = JSON.parse(readFileSync("messages/en.json", "utf8")) as Record<string, unknown>;
    const ur = JSON.parse(readFileSync("messages/ur.json", "utf8")) as Record<string, unknown>;
    expect(Object.keys(en)).toEqual(Object.keys(ur));
    expect(readFileSync("docs/urdu-translation-review.md", "utf8")).toContain("human review");
  });
});
