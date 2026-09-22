import { migrationPath } from "./helpers/backend";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(migrationPath("0012_sales_portal"), "utf8");
const actions = readFileSync("app/[locale]/(sales)/sales/actions.ts", "utf8");
const ai = readFileSync("lib/ai/sales.ts", "utf8");
const calendarRoute = readFileSync("app/api/sales/calendar/route.ts", "utf8");

describe("Sales portal contracts", () => {
  it("prices requested quotes transactionally and records vendor notifications", () => {
    expect(migration).toContain("create or replace function public.price_sales_quote");
    expect(migration).toContain("status = 'QUOTED'");
    expect(migration).toContain("quoted_unit_price_pkr");
    expect(migration).toContain("create policy notifications_sales_insert");
    expect(migration).toContain("QUOTE_PRICED");
    expect(actions).toContain('await requirePermission("quote.price")');
  });

  it("keeps explicit Visit location capture optional and rejects location on other activity types", () => {
    expect(migration).toContain("p_type <> 'VISIT'");
    expect(migration).toContain("Location is only captured for an explicit visit log.");
    expect(migration).toContain("distance_from_customer_meters");
    expect(actions).toContain('await requirePermission("activity.create")');
    expect(readFileSync("app/[locale]/(sales)/sales/activity/ActivityForm.tsx", "utf8")).toContain("getCurrentPosition");
  });

  it("uses the canonical visibility resolver for Sales orders and snapshots prices into lines", () => {
    expect(migration).toContain("create or replace function public.create_sales_order_for_customer");
    expect(migration).toContain("public.resolve_visible_products(p_customer_id)");
    expect(migration).toContain("'SALES_AGENT'");
    expect(migration).toContain("unit_price_pkr");
    expect(actions).toContain('await requirePermission("order.create")');
    expect(readFileSync("lib/sales/queries.ts", "utf8")).toContain("resolveVisibleProducts(customerId)");
  });

  it("provides token-authenticated ICS output with stable follow-up UIDs", () => {
    expect(migration).toContain("create table public.calendar_feed_tokens");
    expect(migration).toContain("ensure_follow_up_calendar_uid");
    expect(calendarRoute).toContain("text/calendar");
    expect(calendarRoute).toContain("UID:");
  });

  it("keeps AI context current-user scoped and output draft-only", () => {
    expect(ai).toContain("getCustomerDetailData(customerId)");
    expect(ai).toContain("draftOnly: true");
    expect(ai).toContain("Never invent a customer figure");
    expect(actions).toContain('await requirePermission("ai.chat")');
  });
});
