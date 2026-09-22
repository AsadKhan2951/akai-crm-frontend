import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { validateAndStripImage } from "@/lib/security/image-validation";

export async function handleValidatedImageUpload(request: Request, bucket: "product-images" | "claim-photos" | "collection-photos") {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose an image file before uploading." }, { status: 400 });
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Your session expired. Log in again." }, { status: 401 });
  try {
    const cleanBytes = validateAndStripImage(new Uint8Array(await file.arrayBuffer()), file.type);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80) || "image";
    const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, cleanBytes, { contentType: file.type, upsert: false });
    if (error) return Response.json({ error: "The image could not be uploaded. Check the file and try again." }, { status: 400 });
    return Response.json({ path });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The image could not be validated." }, { status: 400 });
  }
}
