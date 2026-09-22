import { migrationPath, backendPath } from "./helpers/backend";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(migrationPath("0012_sales_portal"), "utf8");
const schema = readFileSync(backendPath("prisma/schema.prisma"), "utf8");

describe("Sales portal migration contracts", () => {
  it("adds stage age, normalized lead matching, import batches, and rollback", () => {
    expect(migration).toContain('"stage_entered_at" timestamptz(6) not null default now()');
    expect(migration).toContain('"normalized_name" text');
    expect(migration).toContain("create table public.lead_import_batches");
    expect(migration).toContain("create or replace function public.rollback_lead_import");
    expect(migration).toContain("leads_import_rollback_delete");
    expect(migration).toContain("status = 'ROLLED_BACK'");
  });

  it("enforces lost and won lead lifecycle transitions", () => {
    expect(migration).toContain("create or replace function public.enforce_lead_lifecycle");
    expect(migration).toContain("A lost reason is required.");
    expect(migration).toContain("A won lead must link a customer.");
    expect(migration).toContain("create or replace function public.convert_lead_to_customer");
    expect(migration).toContain("set converted_customer_id = customer_id, stage = 'WON'");
  });

  it("keeps Sales aggregates in SQL and uses Karachi business dates", () => {
    expect(migration).toContain("create or replace view public.sales_today_metrics");
    expect(migration).toContain("create or replace function public.sales_daily_revenue");
    expect(migration).toContain("at time zone 'Asia/Karachi'");
    expect(migration).toContain("sum(o.total_pkr)");
    expect(migration).toContain("create or replace function public.customers_nearby");
    expect(migration).toContain("order by distance_meters");
  });

  it("keeps new Sales data scope-governed by existing permission and accessible-agent functions", () => {
    expect(migration).toContain("public.has_permission(auth.uid(), 'lead.import')");
    expect(migration).toContain("public.accessible_agent_ids(auth.uid())");
    expect(migration).toContain("create policy lead_import_batches_read");
    expect(migration).toContain("create policy calendar_feed_tokens_read");
    expect(migration).toContain("create index \"activities_visit_distance_idx\"");
  });

  it("declares the Prisma models and indexes for the additive migration", () => {
    expect(schema).toContain("model LeadImportBatch");
    expect(schema).toContain("model CalendarFeedToken");
    expect(schema).toContain("stageEnteredAt");
    expect(schema).toContain("@@index([assignedAgentId, stage, stageEnteredAt])");
    expect(schema).toContain("@@index([salesAgentId, revokedAt])");
  });
});
