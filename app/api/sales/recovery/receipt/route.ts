import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { enforceRequestRateLimit, RateLimitExceeded } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  await requirePermission("collection.view");
  try { await enforceRequestRateLimit(request, "receipt-pdf", 60, 20); } catch (error) { if (error instanceof RateLimitExceeded) return Response.json({ error: error.message }, { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } }); throw error; }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Receipt id is required." }, { status: 400 });
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("payment_collections").select("receipt_number,amount_pkr,method,collected_at,customer:customers(business_name)").eq("id", id).maybeSingle();
  if (error || !data) return Response.json({ error: "Receipt not found or outside your scope." }, { status: 404 });
  const customer = Array.isArray(data.customer) ? data.customer[0] : data.customer;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("AKAI PAYMENT RECEIPT", { x: 60, y: 760, size: 20, font, color: rgb(0.086, 0.137, 0.247) });
  page.drawText(`Receipt: ${String(data.receipt_number)}`, { x: 60, y: 710, size: 12, font });
  page.drawText(`Customer: ${String(customer?.business_name ?? "")}`, { x: 60, y: 680, size: 12, font });
  page.drawText(`Amount PKR: ${String(data.amount_pkr)}`, { x: 60, y: 650, size: 12, font });
  page.drawText(`Method: ${String(data.method)}`, { x: 60, y: 620, size: 12, font });
  page.drawText(`Collected: ${new Date(String(data.collected_at)).toISOString()}`, { x: 60, y: 590, size: 12, font });
  page.drawText("This receipt confirms collection recording. Clearance follows the deposit and verification process.", { x: 60, y: 530, size: 9, font, maxWidth: 470 });
  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${String(data.receipt_number)}.pdf"`, "Cache-Control": "private, no-store" } });
}
