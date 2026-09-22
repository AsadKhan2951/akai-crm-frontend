import { requirePermission } from "@/lib/auth/server";
import { previewCurrentVendorCartSchemes } from "@/lib/schemes/cart-preview";

export async function GET() {
  await requirePermission("scheme.view");
  const preview = await previewCurrentVendorCartSchemes();
  return Response.json(preview);
}
