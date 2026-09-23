import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getVendorCatalogue, getVendorCustomer, type CatalogueProduct } from "@/lib/vendor/queries";
import { formatPkr, formatQuantity } from "@/lib/format/money";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const CACHE_SECONDS = 24 * 60 * 60;
const BUCKET = "catalogue-pdfs";

const NAVY = rgb(0.086, 0.137, 0.247);
const SLATE = rgb(0.392, 0.455, 0.545);
const SURFACE = rgb(0.945, 0.961, 0.976);
const PAGE: [number, number] = [595, 842]; // A4 portrait
const MARGIN = 40;

/**
 * Standard PDF fonts only cover WinAnsi (Latin). Urdu script needs contextual shaping that
 * pdf-lib does not provide, so the PDF uses the English product fields for both locales.
 */
function latin(value: string | null | undefined) {
  return (value ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim();
}

function fit(font: PDFFont, text: string, size: number, maxWidth: number) {
  let value = text;
  while (value.length > 1 && font.widthOfTextAtSize(value, size) > maxWidth) value = value.slice(0, -2);
  return value === text ? value : `${value.trimEnd()}…`.replace("…", "...");
}

export async function buildVendorCataloguePdf({ customerName, products, generatedAt }: { customerName: string; products: CatalogueProduct[]; generatedAt: Date }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle("AKAI Product Catalogue");
  pdf.setAuthor("AKAI CRM");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dateText = new Intl.DateTimeFormat("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }).format(generatedAt);

  const columns = [
    { key: "sku", label: "SKU", x: MARGIN, width: 80 },
    { key: "name", label: "Product", x: MARGIN + 85, width: 220 },
    { key: "brand", label: "Brand", x: MARGIN + 310, width: 80 },
    { key: "pack", label: "Pack", x: MARGIN + 395, width: 45 },
    { key: "price", label: "Price (PKR)", x: MARGIN + 445, width: 70 },
  ] as const;

  let page: PDFPage = pdf.addPage(PAGE);
  let y = PAGE[1] - MARGIN;
  let pageNumber = 1;

  const footer = (target: PDFPage, n: number) => {
    target.drawText(`Page ${n} · Prices valid as of ${dateText} and may change with a new price list.`, { x: MARGIN, y: 24, size: 8, font: regular, color: SLATE });
  };
  const tableHeader = () => {
    page.drawRectangle({ x: MARGIN - 4, y: y - 5, width: PAGE[0] - 2 * MARGIN + 8, height: 18, color: NAVY });
    for (const col of columns) page.drawText(col.label, { x: col.x, y, size: 9, font: bold, color: rgb(1, 1, 1) });
    y -= 20;
  };
  const newPage = () => {
    footer(page, pageNumber);
    page = pdf.addPage(PAGE);
    pageNumber += 1;
    y = PAGE[1] - MARGIN;
    tableHeader();
  };

  page.drawText("AKAI Product Catalogue", { x: MARGIN, y, size: 22, font: bold, color: NAVY });
  y -= 22;
  page.drawText(fit(regular, `Prepared for ${latin(customerName) || "your account"}`, 11, PAGE[0] - 2 * MARGIN), { x: MARGIN, y, size: 11, font: regular, color: SLATE });
  y -= 14;
  page.drawText(`Generated ${dateText} (Asia/Karachi) · ${products.length} products`, { x: MARGIN, y, size: 9, font: regular, color: SLATE });
  y -= 26;

  const groups = new Map<string, CatalogueProduct[]>();
  for (const product of products) {
    const key = latin(product.category?.name_en) || "Other";
    groups.set(key, [...(groups.get(key) ?? []), product]);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  if (ordered.length === 0) {
    page.drawText("No products are currently available for your account.", { x: MARGIN, y, size: 12, font: regular, color: NAVY });
  }

  for (const [category, items] of ordered) {
    if (y < MARGIN + 80) newPage();
    page.drawText(category, { x: MARGIN, y, size: 13, font: bold, color: NAVY });
    y -= 18;
    tableHeader();
    items.sort((a, b) => latin(a.name_en).localeCompare(latin(b.name_en)));
    let shade = false;
    for (const item of items) {
      if (y < MARGIN + 30) newPage();
      if (shade) page.drawRectangle({ x: MARGIN - 4, y: y - 4, width: PAGE[0] - 2 * MARGIN + 8, height: 15, color: SURFACE });
      shade = !shade;
      const values: Record<(typeof columns)[number]["key"], string> = {
        sku: latin(item.sku),
        name: latin(item.name_en) || latin(item.sku),
        brand: latin(item.brand?.name_en) || "-",
        pack: item.pack_size ? `${formatQuantity(item.pack_size)} ${latin(item.unit_of_measure)}` : latin(item.unit_of_measure),
        price: item.is_quote_only ? "On request" : formatPkr(item.price_pkr, { withSymbol: false }),
      };
      for (const col of columns) {
        const text = fit(regular, values[col.key], 9, col.width);
        const x = col.key === "price" ? col.x + col.width - regular.widthOfTextAtSize(text, 9) : col.x;
        page.drawText(text, { x, y, size: 9, font: regular, color: NAVY });
      }
      y -= 15;
    }
    y -= 12;
  }
  footer(page, pageNumber);
  return pdf.save();
}

/** The only product source for a Vendor PDF: the customer-scoped visibility resolver. */
export async function resolveVendorPdfProducts(customerId: string) {
  return getVendorCatalogue(customerId);
}

export type VendorPdfResult = { bytes: Uint8Array; cache: "HIT" | "MISS" | "NONE"; storagePath: string | null };

/**
 * Returns the customer's catalogue PDF, cached for 24 hours per customer, active price list
 * and locale in the private catalogue-pdfs bucket. Runs as the signed-in Vendor (RLS applies).
 */
export async function getVendorCataloguePdf(customerId: string, locale: "en" | "ur"): Promise<VendorPdfResult> {
  const supabase = await getSupabaseServerClient();
  const now = new Date();
  const { data: activeListId } = await supabase.rpc("active_price_list_id");
  const activeList = activeListId ? { id: String(activeListId) } : null;

  if (activeList) {
    const { data: cached } = await supabase
      .from("catalogue_pdfs")
      .select("id,storage_path,cache_until")
      .eq("customer_id", customerId)
      .eq("price_list_id", activeList.id)
      .eq("locale", locale)
      .gt("cache_until", now.toISOString())
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cached?.storage_path) {
      const { data: file } = await supabase.storage.from(BUCKET).download(cached.storage_path);
      if (file) return { bytes: new Uint8Array(await file.arrayBuffer()), cache: "HIT", storagePath: cached.storage_path };
    }
  }

  const [customer, products] = await Promise.all([getVendorCustomer(customerId), resolveVendorPdfProducts(customerId)]);
  const bytes = await buildVendorCataloguePdf({ customerName: customer?.business_name ?? "", products, generatedAt: now });
  if (!activeList) return { bytes, cache: "NONE", storagePath: null };

  const storagePath = `vendors/${customerId}/${activeList.id}-${locale}.pdf`;
  const upload = await supabase.storage.from(BUCKET).upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });
  if (upload.error) return { bytes, cache: "NONE", storagePath: null };
  const cacheUntil = new Date(now.getTime() + CACHE_SECONDS * 1000).toISOString();
  const { data: existing } = await supabase.from("catalogue_pdfs").select("id").eq("customer_id", customerId).eq("price_list_id", activeList.id).eq("locale", locale).limit(1).maybeSingle();
  if (existing?.id) {
    await supabase.from("catalogue_pdfs").update({ storage_path: storagePath, generated_at: now.toISOString(), cache_until: cacheUntil }).eq("id", existing.id);
  } else {
    await supabase.from("catalogue_pdfs").insert({ customer_id: customerId, price_list_id: activeList.id, locale, storage_path: storagePath, generated_at: now.toISOString(), cache_until: cacheUntil });
  }
  return { bytes, cache: "MISS", storagePath };
}

/** A short-lived signed link the dealer can forward. Nothing is sent automatically. */
export async function signVendorCataloguePdf(storagePath: string, seconds = 24 * 60 * 60) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, seconds);
  return data?.signedUrl ?? null;
}
