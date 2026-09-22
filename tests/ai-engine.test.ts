import { migrationPath } from "./helpers/backend";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const route = fs.readFileSync("app/api/ai/chat/route.ts", "utf8");
const engine = fs.readFileSync("lib/ai/engine.ts", "utf8");
const context = fs.readFileSync("lib/ai/context.ts", "utf8");
const limits = fs.readFileSync("lib/ai/limits.ts", "utf8");
const migration = fs.readFileSync(migrationPath("0024_ai_engine_foundation"), "utf8");

describe("Phase 13A secure shared AI engine", () => {
  it("checks ai.chat before reading the request body and never exposes the provider key", () => {
    expect(route.indexOf('await requirePermission("ai.chat")')).toBeGreaterThanOrEqual(0);
    expect(route.indexOf('await requirePermission("ai.chat")')).toBeLessThan(route.indexOf("request.json"));
    expect(route).toContain('if (surface === "ANALYTICS") await requirePermission("ai.analytics")');
    expect(route).not.toContain("ANTHROPIC_API_KEY");
    expect(engine).toContain("process.env.ANTHROPIC_API_KEY");
  });

  it("assembles context through the current Supabase session and mandatory visible-product resolver", () => {
    expect(context).toContain("getSupabaseServerClient");
    expect(context).toContain("resolveVisibleProducts(vendorAccount.customer_id)");
    expect(context).toContain("customers.select.current_user_rls");
    expect(context).not.toContain("getSystemSupabaseClient");
    expect(context).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("does not place permission-sensitive financial fields in context without permission", () => {
    expect(context).toContain('permissions.includes("financials.view_revenue")');
    expect(context).toContain('permissions.includes("financials.view_margin")');
    expect(context).toContain('permissions.includes("customer.view")');
    expect(context).toContain('permissions.includes("order.view")');
    expect(context).toContain('permissions.includes("ai.analytics") && permissions.includes("dashboard.view") && permissions.includes("financials.view_revenue") && permissions.includes("financials.view_margin")');
  });

  it("persists user and assistant history, streams provider output, and records usage", () => {
    expect(engine).toContain('stream: true');
    expect(engine).toContain('role: "assistant"');
    expect(engine).toContain('role: "user"');
    expect(engine).toContain("recordAiUsage");
    expect(engine).toContain("releaseAiReservation");
    expect(engine).toContain('content-type": "text/event-stream; charset=utf-8"');
    expect(engine).toContain("FALLBACK");
  });

  it("uses atomic database functions for rate limits and daily budget reservations", () => {
    expect(limits).toContain("ai_reserve_rate_limit");
    expect(limits).toContain("ai_reserve_token_budget");
    expect(limits).toContain("ai_record_usage");
    expect(limits).toContain("ai_release_token_budget");
    expect(migration).toContain("on conflict (user_id, window_start)");
    expect(migration).toContain("at time zone 'Asia/Karachi'");
    expect(migration).toContain("grant execute on function public.ai_reserve_token_budget(integer) to authenticated");
    expect(migration).toContain("revoke all on public.ai_rate_limit_buckets from authenticated");
  });

  it("keeps AI output read-only and traceable to query sources", () => {
    expect(context).toContain("Never claim to have changed");
    expect(context).toContain("When stating a figure, briefly name the evidence source");
    expect(engine).toContain("tool_calls_json: { trace }");
    expect(engine).toContain("The AI response could not be saved to history.");
  });
});
