import { getTranslations } from "next-intl/server";

/** Shows the result of a redirect-after-post catalogue action (?status=saved|error&code=...). */
export async function FlashMessage({ status, code }: { status?: string; code?: string }) {
  if (!status) return null;
  const t = await getTranslations("catalogueAdmin");
  const tc = await getTranslations("catalogue");
  const errorKeys = ["invalid", "duplicate", "saveFailed", "deleteBlocked", "noPermission"] as const;
  if (status === "error") {
    const key = errorKeys.find((k) => k === code) ?? "saveFailed";
    return <p role="alert" className="rounded-md border border-[#b42318] bg-white p-3 text-sm font-medium text-[#b42318]">{tc(`errors.${key}` as never)}</p>;
  }
  const messages: Record<string, string> = { saved: tc("saved"), deleted: t("deleted"), approved: t("approved"), rejected: t("rejected"), activated: t("activated") };
  return <p role="status" className="rounded-md border border-slate-300 bg-white p-3 text-sm font-medium text-primary">{messages[status] ?? tc("saved")}</p>;
}
