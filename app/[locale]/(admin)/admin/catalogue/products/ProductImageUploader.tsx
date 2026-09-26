"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { setProductPrimaryImageAction } from "../actions";

export function ProductImageUploader({ productId }: { productId: string }) {
  const t = useTranslations("common");
  const tc = useTranslations("catalogue");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    setMessage(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMessage({ ok: false, text: t("imageOnly") }); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage({ ok: false, text: t("fileTooLarge") }); return; }
    startTransition(async () => {
      try {
        const body = new FormData(); body.set("file", file);
        const response = await fetch("/api/uploads/product", { method: "POST", body });
        const json = (await response.json()) as { path?: string; error?: string };
        if (!response.ok || !json.path) throw new Error(json.error ?? t("uploadError"));
        await setProductPrimaryImageAction(productId, json.path);
        setMessage({ ok: true, text: tc("saved") });
        if (input.current) input.current.value = "";
        router.refresh();
      } catch (error) {
        setMessage({ ok: false, text: error instanceof Error && error.message ? error.message : t("uploadError") });
      }
    });
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-primary">{tc("addImage")}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); }} className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 bg-white p-2" />
      </label>
      {pending ? <p className="text-sm text-muted-foreground">{t("uploading")}</p> : null}
      {message ? <p role="status" className={message.ok ? "text-sm font-medium text-primary" : "text-sm font-medium text-[#b42318]"}>{message.text}</p> : null}
    </div>
  );
}
