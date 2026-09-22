import { requirePermission } from "@/lib/auth/server";
import { handleValidatedImageUpload } from "@/lib/security/image-upload";

export async function POST(request: Request) {
  await requirePermission("claim.create");
  return handleValidatedImageUpload(request, "claim-photos");
}
