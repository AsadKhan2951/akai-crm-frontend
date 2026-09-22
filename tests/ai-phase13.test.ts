import { migrationPath } from "./helpers/backend";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const widget = fs.readFileSync("components/AIAssistantWidget.tsx", "utf8");
const catalogueUi = fs.readFileSync("components/AICatalogueSearch.tsx", "utf8");
const salesUi = fs.readFileSync("app/[locale]/(sales)/sales/SalesAiRecommendations.tsx", "utf8");
const shell = fs.readFileSync("components/PortalShell.tsx", "utf8");
const sales = fs.readFileSync("app/api/ai/sales/recommendations/route.ts", "utf8");
const catalogueRoute = fs.readFileSync("app/api/ai/catalogue-search/route.ts", "utf8");
const catalogue = fs.readFileSync("lib/ai/catalogue-search.ts", "utf8");
const contentRoute = fs.readFileSync("app/api/ai/content-draft/route.ts", "utf8");
const content = fs.readFileSync("lib/ai/content.ts", "utf8");
const indexes = fs.readFileSync(migrationPath("0027_ai_role_surfaces"), "utf8");
const en = JSON.parse(fs.readFileSync("messages/en.json", "utf8")) as { ai: Record<string, string> };
const ur = JSON.parse(fs.readFileSync("messages/ur.json", "utf8")) as { ai: Record<string, string> };

describe("Phase 13B-13F AI surfaces", () => {
  it("shows a permission-gated bilingual widget in all portal shells", () => {
    expect(shell).toContain('can("ai.chat") ? <AIAssistantWidget portal={portal} /> : null');
    expect(widget).toContain("/api/ai/chat");
    expect(widget).toContain("useTranslations(\"ai\")");
    expect(widget).toContain('dir={locale === "ur" ? "rtl" : "ltr"}');
    expect(widget).toContain("fixed bottom-20 end-4");
    expect(widget).toContain("draft");
    expect(catalogueUi).toContain('useTranslations("vendorAi")');
    expect(catalogueUi).toContain("<bdi>");
    expect(catalogueUi).not.toContain('>PKR <');
    expect(salesUi).toContain("/api/ai/sales/recommendations");
    expect(salesUi).toContain('useTranslations("sales")');
  });

  it("provides a transparent Sales recommendation formula from RLS-scoped sources", () => {
    expect(sales.indexOf('await requirePermission("ai.chat")')).toBeGreaterThan(sales.indexOf("export async function GET"));
    expect(sales.indexOf('await requirePermission("ai.chat")')).toBeLessThan(sales.indexOf("getSupabaseServerClient();"));
    expect(sales).toContain('await requirePermission("customer.view")');
    expect(sales).toContain("sales_customer_summary");
    expect(sales).toContain("follow_ups");
    expect(sales).toContain("quotes");
    expect(sales).toContain('formula: "contact gap + order gap + open follow-ups + open quotes"');
  });

  it("keeps catalogue AI search inside the visible product set and falls back at 3 seconds", () => {
    expect(catalogueRoute.indexOf('await requirePermission("ai.chat")')).toBeLessThan(catalogueRoute.indexOf("request.json"));
    expect(catalogue).toContain("resolveVisibleProducts");
    expect(catalogue).toContain("AbortSignal.timeout(3000)");
    expect(catalogue).toContain('source: "keyword"');
    expect(catalogue).toContain("allowedIds.has(id)");
    expect(catalogue).not.toContain("cost");
  });

  it("keeps content generation draft-only and requires traced price-list data", () => {
    expect(contentRoute.indexOf('await requirePermission("ai.generate_content")')).toBeLessThan(contentRoute.indexOf("request.json"));
    expect(contentRoute).toContain("priceListId");
    expect(contentRoute).toContain("can be traced to a database query");
    expect(content).toContain("draftOnly: true");
    expect(content).toContain("price_lists.select.current_user_rls");
    expect(content).toContain("Never invent a figure");
    expect(content).not.toContain("getSystemSupabaseClient");
  });

  it("keeps English and Urdu AI translation key trees equal", () => {
    expect(Object.keys(en.ai).sort()).toEqual(Object.keys(ur.ai).sort());
    expect(Object.values(en.ai).every((value) => typeof value === "string")).toBe(true);
    expect(Object.values(ur.ai).every((value) => typeof value === "string")).toBe(true);
  });

  it("documents indexes for every new role-surface filter or sort", () => {
    expect(indexes).toContain("follow_ups_is_completed_due_at_customer_id_idx");
    expect(indexes).toContain("quotes_status_created_at_customer_id_idx");
    expect(indexes).toContain("products_active_name_en_idx");
  });
});
