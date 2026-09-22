import { requirePermission } from "@/lib/auth/server";
import { handleValidatedImageUpload } from "@/lib/security/image-upload";

export async function POST(request: Request) {
  await requirePermission("collection.record");
  return handleValidatedImageUpload(request, "collection-photos");
}
