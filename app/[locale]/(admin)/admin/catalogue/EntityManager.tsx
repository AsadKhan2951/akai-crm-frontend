import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { FlashMessage } from "@/components/admin/FlashMessage";
import { deleteCatalogueEntityAction, saveCatalogueEntityAction, toggleCatalogueEntityAction } from "./actions";

export type EntityRow = {
  id: string; name_en: string; name_ur: string; slug: string; display_order: number | null; is_active: boolean | null;
  image_url?: string | null; logo_url?: string | null; description?: string | null; notes?: string | null;
  starts_at?: string | null; ends_at?: string | null; product_count?: number;
};

const input = "mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3";

function toKarachiLocal(value: string | null | undefined) {
  if (!value) return "";
  const shifted = new Date(new Date(value).getTime() + 5 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

async function EntityFields({ table, row, locale }: { table: "brands" | "categories" | "collections"; row?: EntityRow; locale: string }) {
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const ta = await getTranslations({ locale, namespace: "catalogueAdmin" });
  return (
    <>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="locale" value={locale} />
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-primary">{t("nameEn")}<input name="nameEn" required defaultValue={row?.name_en} className={input} /></label>
        <label className="text-sm font-medium text-primary">{t("nameUr")}<input name="nameUr" required dir="rtl" defaultValue={row?.name_ur} className={input} /></label>
        {!row ? <label className="text-sm font-medium text-primary">{t("slug")}<input name="slug" placeholder={ta("slugHint")} className={input} /></label> : null}
        <label className="text-sm font-medium text-primary">{table === "brands" ? t("logo") : t("coverImage")} (URL)<input name="imageUrl" type="url" defaultValue={row?.logo_url ?? row?.image_url ?? ""} className={input} /></label>
        <label className="text-sm font-medium text-primary">{ta("displayOrder")}<input name="displayOrder" type="number" min={0} defaultValue={row?.display_order ?? 0} className={input} /></label>
        {table !== "brands" ? <label className="text-sm font-medium text-primary md:col-span-2">{ta("description")}<textarea name="description" defaultValue={row?.description ?? ""} className={`${input} min-h-20 py-2`} /></label> : null}
        {table !== "collections" ? <label className="text-sm font-medium text-primary md:col-span-2">{t("referenceAssociations")}<textarea name="notes" defaultValue={row?.notes ?? ""} className={`${input} min-h-16 py-2`} /></label> : null}
        {table === "collections" ? (
          <>
            <label className="text-sm font-medium text-primary">{t("startDate")}<input name="startsAt" type="datetime-local" defaultValue={toKarachiLocal(row?.starts_at)} className={input} /></label>
            <label className="text-sm font-medium text-primary">{t("endDate")}<input name="endsAt" type="datetime-local" defaultValue={toKarachiLocal(row?.ends_at)} className={input} /></label>
          </>
        ) : null}
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><input type="checkbox" name="isActive" defaultChecked={row ? row.is_active !== false : true} className="h-5 w-5" />{t("active")}</label>
      </div>
    </>
  );
}

export async function EntityManager({ locale, table, title, description, rows, createLabel, emptyLabel, status, code, canCreate, canUpdate, canDelete, q }: {
  locale: string; table: "brands" | "categories" | "collections"; title: string; description: string; rows: EntityRow[];
  createLabel: string; emptyLabel: string; status?: string; code?: string; canCreate: boolean; canUpdate: boolean; canDelete: boolean; q: string;
}) {
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const ta = await getTranslations({ locale, namespace: "catalogueAdmin" });
  const query = q.toLowerCase();
  const visible = rows.filter((r) => !query || `${r.name_en} ${r.name_ur} ${r.slug}`.toLowerCase().includes(query));
  return (
    <div className="space-y-6">
      <Link href="/admin/catalogue" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{t("catalogueTitle")}</Link>
      <PageHeader title={title} description={description} />
      <FlashMessage status={status} code={code} />
      {canCreate ? (
        <details className="rounded-lg border border-slate-200 bg-white p-4" open={rows.length === 0}>
          <summary className="min-h-11 cursor-pointer py-2 text-lg font-semibold text-primary">{createLabel}</summary>
          <form action={saveCatalogueEntityAction} className="mt-3 space-y-4">
            <EntityFields table={table} locale={locale} />
            <button type="submit" className="min-h-11 rounded-md bg-[#D6202C] px-5 font-semibold text-white">{createLabel}</button>
          </form>
        </details>
      ) : null}
      <form method="get" role="search" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder={ta("searchByName")} aria-label={ta("searchByName")} className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3" />
        <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{ta("search")}</button>
      </form>
      {visible.length === 0 ? <EmptyState title={emptyLabel} /> : (
        <ul className="space-y-3">
          {visible.map((row) => (
            <li key={row.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {row.logo_url || row.image_url ? <img src={(row.logo_url ?? row.image_url) as string} alt="" className="h-12 w-12 rounded-md border border-slate-200 object-contain" /> : null}
                  <div>
                    <p className="font-semibold text-primary">{row.name_en} · <span dir="rtl">{row.name_ur}</span></p>
                    <p className="text-sm text-muted-foreground"><bdi>{row.slug}</bdi>{row.product_count !== undefined ? <> · <bdi>{row.product_count}</bdi> {t("products")}</> : null}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${row.is_active !== false ? "bg-primary text-white" : "bg-slate-200 text-slate-700"}`}>{row.is_active !== false ? t("active") : t("inactive")}</span>
                  {canUpdate ? (
                    <form action={toggleCatalogueEntityAction}>
                      <input type="hidden" name="table" value={table} /><input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="isActive" value={String(row.is_active === false)} />
                      <button type="submit" className="min-h-11 rounded-md border border-slate-300 px-3 text-primary">{row.is_active !== false ? t("deactivate") : t("activate")}</button>
                    </form>
                  ) : null}
                  {canDelete ? (
                    <form action={deleteCatalogueEntityAction}>
                      <input type="hidden" name="table" value={table} /><input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={row.id} />
                      <button type="submit" className="min-h-11 rounded-md px-3 text-[#D6202C] underline-offset-4 hover:underline">{t("delete")}</button>
                    </form>
                  ) : null}
                </div>
              </div>
              {canUpdate ? (
                <details className="mt-3 border-t border-slate-100 pt-3">
                  <summary className="min-h-11 cursor-pointer py-2 font-medium text-primary">{t("edit")}</summary>
                  <form action={saveCatalogueEntityAction} className="mt-3 space-y-4">
                    <EntityFields table={table} row={row} locale={locale} />
                    <button type="submit" className="min-h-11 rounded-md bg-primary px-5 font-semibold text-white">{t("saveChanges")}</button>
                  </form>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
