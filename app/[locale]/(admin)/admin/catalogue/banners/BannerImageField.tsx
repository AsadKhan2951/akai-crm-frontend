"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

/** URL field with an optional upload button. Uploads go through the validated /api/uploads/product route. */
export function BannerImageField({ name, label, required = false, supabaseUrl }: { name: string; label: string; required?: boolean; supabaseUrl: string }) {
  const t = useTranslations("common");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError(t("imageOnly")); return; }
    if (file.size > 2 * 1024 * 1024) { setError(t("fileTooLarge")); return; }
    startTransition(async () => {
      try {
        const body = new FormData(); body.set("file", file);
        const response = await fetch("/api/uploads/product", { method: "POST", body });
        const json = (await response.json()) as { path?: string; error?: string };
        if (!response.ok || !json.path) throw new Error(json.error ?? t("uploadError"));
        setUrl(`${supabaseUrl}/storage/v1/object/public/product-images/${json.path.split("/").map(encodeURIComponent).join("/")}`);
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : t("uploadError"));
      }
    });
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-primary">{label}
        <input name={name} type="url" required={required} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3" />
      </label>
      <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={t("upload")} disabled={pending} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); }} className="block min-h-11 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" />
      {pending ? <p className="text-sm text-muted-foreground">{t("uploading")}</p> : null}
      {error ? <p role="alert" className="text-sm text-[#b42318]">{error}</p> : null}
      {url ? <img src={url} alt="" className="h-24 rounded-md border border-slate-200 object-cover" /> : null}
    </div>
  );
}
