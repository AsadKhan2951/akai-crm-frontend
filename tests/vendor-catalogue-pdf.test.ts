import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("vendor catalogue PDF", () => {
  it("renders a multi-page PDF from the visible product list only", async () => {
    const { buildVendorCataloguePdf } = await import("@/lib/pdf/vendor-catalogue");
    const products = Array.from({ length: 120 }, (_, index) => ({
      id: `id-${index}`, sku: `SKU-${index}`, name_en: `Product ${index} – “special”`, name_ur: "ہارن", description_en: null, description_ur: null,
      category_id: index % 2 ? "c1" : "c2", brand_id: "b1", unit_of_measure: "PCS", pack_size: "1.000", price_pkr: "1234.50", compare_at_price_pkr: null,
      loyalty_points_per_unit: 0, stock_quantity: "5", low_stock_threshold: "1", is_active: true, is_quote_only: index === 3, created_at: "", updated_at: "",
      image_url: null, category: { id: "c", name_en: index % 2 ? "Horns" : "Car Care", name_ur: "" }, brand: { id: "b1", name_en: "CASTA", name_ur: "" },
    }));
    const bytes = await buildVendorCataloguePdf({ customerName: "Test Shop ہارن", products, generatedAt: new Date("2026-09-23T10:00:00Z") });
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
    const { writeFileSync } = await import("node:fs");
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, bytes);
  });
});
