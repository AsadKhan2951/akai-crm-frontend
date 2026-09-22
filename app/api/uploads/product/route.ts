import { requirePermission } from "@/lib/auth/server";
import { handleValidatedImageUpload } from "@/lib/security/image-upload";

export async function POST(request: Request) {
  await requirePermission("product.manage_images");
  return handleValidatedImageUpload(request, "product-images");
}
