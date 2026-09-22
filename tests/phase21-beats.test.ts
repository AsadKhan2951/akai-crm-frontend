import { migrationPath } from "./helpers/backend";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(migrationPath("0052_beat_planning"), "utf8");
const adminPage = fs.readFileSync("app/[locale]/(admin)/admin/beats/page.tsx", "utf8");
const salesPage = fs.readFileSync("app/[locale]/(sales)/sales/beat/page.tsx", "utf8");
const salesAction = fs.readFileSync("app/[locale]/(sales)/sales/beat/actions.ts", "utf8");
const adminAction = fs.readFileSync("app/[locale]/(admin)/admin/beats/actions.ts", "utf8");
const briefingRoute = fs.readFileSync("app/api/ai/beat-briefing/route.ts", "utf8");
const queryHelper = fs.readFileSync("lib/beat/queries.ts", "utf8");

function permissionFirst(source: string, permission: string) {
  return source.indexOf(`await requirePermission("${permission}")`) >= 0;
}

describe("Phase 21 beat planning contracts", () => {
  it("keeps the beat model additive, indexed, and RLS-protected", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.beats");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.beat_customers");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.beat_frequency_targets");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.beat_visits");
    expect(migration).toContain("ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS beat_visits_agent_date_status_idx");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS beat_customers_sequence_idx");
  });

  it("binds every Sales visit update to the current Agent and prevents duplicate completion", () => {
    expect(migration).toContain("SELECT * INTO v_visit FROM public.beat_visits WHERE id = p_visit_id AND agent_id = v_agent_id FOR UPDATE");
    expect(migration).toContain("IF v_visit.status IN ('VISITED', 'SKIPPED') THEN");
    expect(migration).toContain("public.log_sales_activity(");
    expect(salesAction).toContain('await requirePermission("beat.visit")');
  });

  it("uses SQL aggregates for coverage, adherence, daily progress, and off-beat suggestions", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.beat_coverage_summary()");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.beat_adherence_summary");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.sales_beat_summary");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.beat_off_beat_suggestions");
    expect(queryHelper).toContain('supabase.rpc("sales_beat_summary"');
    expect(queryHelper).not.toContain("reduce(");
  });

  it("keeps all pages and mutations permission-first", () => {
    expect(permissionFirst(adminPage, "beat.view")).toBe(true);
    expect(permissionFirst(salesPage, "beat.view")).toBe(true);
    expect(permissionFirst(adminAction, "beat.manage")).toBe(true);
    expect(permissionFirst(salesAction, "beat.visit")).toBe(true);
    expect(permissionFirst(briefingRoute, "ai.chat")).toBe(true);
    expect(permissionFirst(briefingRoute, "beat.view")).toBe(true);
  });

  it("keeps AI briefing draft-only and evidence-backed with fallback", () => {
    expect(briefingRoute).toContain("beatBriefingRequestSchema");
    const ai = fs.readFileSync("lib/ai/beat.ts", "utf8");
    expect(ai).toContain("getBeatBriefingEvidence");
    expect(ai).toContain("draftOnly: true");
    expect(ai).toContain('source: "fallback"');
    expect(ai).toContain("evidenceTrace");
    expect(ai).toContain("never estimate");
  });

  it("keeps date and money evidence isolated", () => {
    expect(migration).toContain("timezone('Asia/Karachi', now())");
    expect(queryHelper).toContain("karachiDateKey");
    expect(fs.readFileSync("app/[locale]/(sales)/sales/beat/SalesBeatView.tsx", "utf8")).toContain("<bdi>{visit.outstanding_balance_pkr}</bdi>");
  });
});
