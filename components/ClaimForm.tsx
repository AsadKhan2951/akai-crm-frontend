"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createClaimAction } from "@/lib/claims/actions";
import { VoiceRecorder } from "@/components/VoiceRecorder";

const CLAIM_TYPES = ["DAMAGED", "SHORT_SUPPLY", "WRONG_ITEM", "EXPIRED", "WARRANTY", "QUALITY"] as const;

type ClaimFormProps = { customerId: string; orderId?: string | null; productId?: string | null; voiceEnabled?: boolean };

export function ClaimForm({ customerId, orderId, productId, voiceEnabled = true }: ClaimFormProps) {
  const t = useTranslations("claims");
  const [type, setType] = useState<(typeof CLAIM_TYPES)[number]>("DAMAGED");
  const [product, setProduct] = useState(productId ?? "");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");
  const [voiceNoteId, setVoiceNoteId] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([""]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage("");
    const photos = photoUrls.filter(Boolean).slice(0, 5).map((url) => ({ url }));
    const lines = [{ productId: product.trim(), quantity, reasonNotes: description.trim() }];
    const formData = new FormData();
    formData.set("customerId", customerId);
    if (orderId) formData.set("orderId", orderId);
    formData.set("claimType", type);
    formData.set("description", description);
    formData.set("voiceNoteId", voiceNoteId);
    formData.set("linesJson", JSON.stringify(lines));
    formData.set("photosJson", JSON.stringify(photos));
    startTransition(async () => {
      try {
        await createClaimAction(formData);
        setMessage(t("submitted"));
        setDescription("");
        setVoiceNoteId("");
        setPhotoUrls([""]);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t("actionError"));
      }
    });
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-primary">{t("type")}</label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {CLAIM_TYPES.map((claimType) => <button key={claimType} type="button" onClick={() => setType(claimType)} className={`min-h-11 rounded-md border px-3 text-left text-sm ${type === claimType ? "border-[#15171c] bg-[#f1f0ec] font-semibold text-primary" : "border-slate-200 text-slate-600"}`}>{t(`types.${claimType}`)}</button>)}
        </div>
      </div>
      <label className="block text-sm font-medium text-primary">{t("product")}<input required value={product} onChange={(event) => setProduct(event.target.value)} placeholder={t("productIdPlaceholder")} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="block text-sm font-medium text-primary">{t("quantity")}<input required min="0.001" step="0.001" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label>
      {voiceEnabled ? <VoiceRecorder customerId={customerId} onDraft={(draft) => { if (draft.notes) setDescription(draft.notes); }} onVoiceNoteId={setVoiceNoteId} /> : null}
      <label className="block text-sm font-medium text-primary">{t("description")}<textarea required value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-slate-300 p-3" /></label>
      <div>
        <p className="text-sm font-medium text-primary">{t("photos")}</p>
        <p className="text-sm text-slate-500">{type === "DAMAGED" ? t("damagePhotoRequired") : t("upToFivePhotos")}</p>
        {photoUrls.map((url, index) => <input key={index} value={url} onChange={(event) => setPhotoUrls((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={t("photoUrlPlaceholder")} className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3" />)}
        {photoUrls.length < 5 ? <button type="button" onClick={() => setPhotoUrls((current) => [...current, ""])} className="mt-2 min-h-11 rounded-md border border-slate-300 px-3 text-sm text-primary">{t("addPhoto")}</button> : null}
      </div>
      <button disabled={isPending} className="min-h-11 rounded-lg bg-brand hover:bg-[#1a3ca8] px-4 font-semibold text-white disabled:opacity-60" type="submit">{isPending ? t("loading") : t("submit")}</button>
      {message ? <p role="status" className="text-sm font-medium text-primary">{message}</p> : null}
    </form>
  );
}
