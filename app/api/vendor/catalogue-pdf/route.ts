import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getVendorCataloguePdf, signVendorCataloguePdf } from "@/lib/pdf/vendor-catalogue";
import { enforceUserRateLimit, RateLimitExceeded } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Customer-scoped catalogue PDF (only products from resolveVisibleProducts(customerId)).
 * ?share=whatsapp opens WhatsApp with a signed link; the dealer chooses who to send it to.
 */
export async function GET(request: NextRequest) {
  await requirePermission("product.view");
  try {
    await enforceUserRateLimit("vendor-catalogue-pdf", 300, 10);
  } catch (error) {
    if (error instanceof RateLimitExceeded) return Response.json({ error: error.message }, { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } });
    throw error;
  }
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) return Response.json({ error: "Your Vendor account is not configured. Ask an AKAI administrator to link it." }, { status: 404 });
  const locale = request.nextUrl.searchParams.get("locale") === "ur" ? "ur" : "en";
  const result = await getVendorCataloguePdf(customerId, locale);

  if (request.nextUrl.searchParams.get("share") === "whatsapp" && result.storagePath) {
    const signedUrl = await signVendorCataloguePdf(result.storagePath);
    if (signedUrl) {
      const message = locale === "ur" ? `AKAI کا product catalogue: ${signedUrl}` : `AKAI product catalogue: ${signedUrl}`;
      return Response.redirect(`https://wa.me/?text=${encodeURIComponent(message)}`, 302);
    }
  }

  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  return new Response(Buffer.from(result.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="akai-catalogue-${day}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-AKAI-PDF-Cache": result.cache,
    },
  });
}
