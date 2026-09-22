import { migrationPath } from "./helpers/backend";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { calculatePaidLoyaltyPoints, evaluateTradeSchemes, type SchemeCartLine, type SchemeInput } from "../lib/schemes/evaluator";

const product = (id: string, price = "1000.00", stock = "100") => ({ id, categoryId: "cat-care", brandId: "CASTA", collectionIds: ["collection-a"], unitPricePKR: price, stockQuantity: stock, loyaltyPointsPerUnit: 2 });
const line = (id: string, quantity: string, isFreeItem = false): SchemeCartLine => ({ product: product(id), quantity, isFreeItem });
const scheme = (overrides: Partial<SchemeInput> = {}): SchemeInput => ({
  id: "scheme-1", schemeType: "QUANTITY_FREE", scopeType: "PRODUCT", scopeIds: ["p1"], priority: 10, isStackable: false,
  budgetPKR: null, consumedPKR: "0.00", maxRedemptionsPerVendor: null, currentVendorRedemptions: 0,
  tiers: [{ id: "tier-1", minQuantity: "10", minValuePKR: null, freeProductId: "free-1", freeQuantity: "1", discountPercent: null, discountAmountPKR: null, displayOrder: 0 }],
  ...overrides,
});

describe("Phase 17 trade scheme evaluator", () => {
  it("returns no benefit and the nearly-unlocked message when the threshold is not met", () => {
    const result = evaluateTradeSchemes([scheme()], [line("p1", "8")], [product("free-1", "4500.00")]);
    expect(result.benefits).toEqual([]);
    expect(result.nearlyUnlocked).toEqual([{ schemeId: "scheme-1", addQuantity: "2.000", messageKey: "quantity" }]);
  });

  it("applies one free-item scheme and keeps its benefit traceable", () => {
    const result = evaluateTradeSchemes([scheme()], [line("p1", "10")], [product("free-1", "4500.00")]);
    expect(result.benefits[0]).toMatchObject({ benefitType: "FREE_ITEM", freeProductId: "free-1", freeQuantity: "1", benefitValuePKR: "4500.00" });
  });

  it("applies stackable schemes together", () => {
    const second = scheme({ id: "scheme-2", isStackable: true, schemeType: "FLAT_DISCOUNT", tiers: [{ id: "tier-2", minQuantity: null, minValuePKR: "5000", freeProductId: null, freeQuantity: null, discountPercent: null, discountAmountPKR: "500.00", displayOrder: 0 }] });
    const first = scheme({ isStackable: true });
    expect(evaluateTradeSchemes([first, second], [line("p1", "10")], [product("free-1", "4500.00")]).benefits).toHaveLength(2);
  });

  it("chooses the lower-priority-number non-stackable scheme", () => {
    const winner = scheme({ id: "winner", priority: 1, tiers: [{ id: "winner-tier", minQuantity: "10", minValuePKR: null, freeProductId: null, freeQuantity: null, discountPercent: null, discountAmountPKR: "900.00", displayOrder: 0 }] });
    const loser = scheme({ id: "loser", priority: 5, tiers: [{ id: "loser-tier", minQuantity: "10", minValuePKR: null, freeProductId: null, freeQuantity: null, discountPercent: null, discountAmountPKR: "1200.00", displayOrder: 0 }] });
    expect(evaluateTradeSchemes([loser, winner], [line("p1", "10")]).benefits.map((benefit) => benefit.schemeId)).toEqual(["winner"]);
  });

  it("skips a scheme when the remaining budget cannot cover the benefit", () => {
    const result = evaluateTradeSchemes([scheme({ budgetPKR: "4000.00", consumedPKR: "0.00" })], [line("p1", "10")], [product("free-1", "4500.00")]);
    expect(result.benefits).toEqual([]);
    expect(result.skipped).toEqual([{ schemeId: "scheme-1", reason: "budget" }]);
  });

  it("skips a scheme when the per-vendor redemption cap is reached", () => {
    const result = evaluateTradeSchemes([scheme({ maxRedemptionsPerVendor: 2, currentVendorRedemptions: 2 })], [line("p1", "10")], [product("free-1")]);
    expect(result.benefits).toEqual([]);
    expect(result.skipped).toEqual([{ schemeId: "scheme-1", reason: "vendor_cap" }]);
  });

  it("never awards loyalty points for free scheme lines", () => {
    expect(calculatePaidLoyaltyPoints([line("p1", "10"), line("free-1", "1", true)])).toBe(20);
  });

  it("documents the additive migration and loyalty exclusion boundary", () => {
    const migration = fs.readFileSync(migrationPath("0033_trade_schemes"), "utf8");
    const checkoutMigration = fs.readFileSync(migrationPath("0037_trade_schemes_vendor_checkout"), "utf8");
    const salesMigration = fs.readFileSync(migrationPath("0038_trade_schemes_sales_quote_checkout"), "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.schemes");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.scheme_applications");
    expect(migration).toContain("NOT ol.is_free_item");
    expect(migration).toContain("resolve_visible_products(p_customer_id)");
    expect(migration).toContain("scheme.activate");
    expect(checkoutMigration).toContain("create_vendor_order_from_cart_with_schemes");
    expect(checkoutMigration).toContain("apply_trade_scheme_to_order");
    expect(checkoutMigration).toContain("Free items are zero-price OrderLines");
    expect(salesMigration).toContain("create_sales_order_for_customer_with_schemes");
    expect(salesMigration).toContain("accept_vendor_quote_with_schemes");
  });

  it("keeps vendor scheme APIs permission-first and visible-product scoped", () => {
    const route = fs.readFileSync("app/api/vendor/schemes/preview/route.ts", "utf8");
    const preview = fs.readFileSync("lib/schemes/cart-preview.ts", "utf8");
    expect(route.indexOf('await requirePermission("scheme.view")')).toBeLessThan(route.indexOf("const preview ="));
    expect(preview).toContain('rpc("resolve_visible_products"');
    expect(preview).toContain("evaluateTradeSchemes");
  });
});
