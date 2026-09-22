import { migrationPath } from "./helpers/backend";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(migrationPath("0009_vendor_portal_workflows"), "utf8");

describe("Vendor portal workflow contracts", () => {
  it("uses transactional, visibility-aware cart and order functions", () => {
    expect(migration).toContain("from public.carts");
    expect(migration).toContain("add_vendor_cart_line");
    expect(migration).toContain("create_vendor_order_from_cart");
    expect(migration).toContain("resolve_visible_products");
    expect(migration).toContain("vendor_cart_totals");
  });

  it("preserves quote prices through accept and conversion", () => {
    expect(migration).toContain("accept_vendor_quote");
    expect(migration).toContain("quoted_unit_price_pkr");
    expect(migration).toContain("price_list_item_id");
    expect(migration).toContain("status = 'CONVERTED'");
  });

  it("provides reorder, points redemption, and customer-scoped history boundaries", () => {
    expect(migration).toContain("reorder_vendor_order");
    expect(migration).toContain("request_vendor_redemption");
    expect(migration).toContain("vendor_reorder_products");
    expect(migration).toContain("vendor_customer_for_user");
  });

  it("keeps vendor PDF generation on the visible-product resolver path", () => {
    const helper = readFileSync(resolve(process.cwd(), "lib/pdf/vendor-catalogue.ts"), "utf8");
    expect(helper).toContain("resolveVendorPdfProducts");
    expect(helper).not.toContain("product_costs");
  });
});
