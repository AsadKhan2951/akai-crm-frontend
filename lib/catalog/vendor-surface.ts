import { requirePermission } from "@/lib/auth/server";
import { resolveVisibleProducts, type VisibleProduct } from "@/lib/catalog/resolve-visible-products";

export async function resolveVendorAiProductContext(customerId: string): Promise<VisibleProduct[]> {
  await requirePermission("ai.chat");
  return resolveVisibleProducts(customerId);
}

export { resolveVisibleProducts };
