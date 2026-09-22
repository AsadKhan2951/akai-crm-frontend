import { migrationPath } from "./helpers/backend";
import { describe, expect, it } from "vitest";
import fs from "node:fs";

const route = fs.readFileSync("app/api/vendor/catalogue-pdf/route.ts", "utf8");
const helper = fs.readFileSync("lib/pdf/vendor-catalogue.ts", "utf8");
const migration = fs.readFileSync(migrationPath("0011_vendor_pdf_cache"), "utf8");
const catalogue = fs.readFileSync("app/[locale]/(vendor)/vendor/catalogue/VendorCatalogue.tsx", "utf8");

describe("Vendor catalogue PDF safety contracts", () => {
  it("uses a 24-hour customer and active-price-list cache", () => {
    expect(helper).toContain("const CACHE_SECONDS = 24 * 60 * 60;");
    expect(helper).toContain('.eq("customer_id", customerId)');
    expect(helper).toContain('.eq("price_list_id", activeList.id)');
    expect(helper).toContain('.gt("cache_until", now.toISOString())');
    expect(migration).toContain("catalogue_pdfs_vendor_cache_idx");
  });

  it("never generates a Vendor PDF outside the shared visible-product gateway", () => {
    expect(helper).toContain("resolveVendorPdfProducts(customerId)");
    expect(helper).not.toContain('from("products")');
    expect(route).toContain('await requirePermission("product.view")');
  });

  it("provides an explicit, non-sending WhatsApp share intent", () => {
    expect(catalogue).toContain("share=whatsapp");
    expect(catalogue).toContain("shareWhatsApp");
    expect(route).toContain('request.nextUrl.searchParams.get("share") === "whatsapp"');
    expect(route).toContain("https://wa.me/?text=");
    expect(route).not.toContain("fetch(");
  });
});
