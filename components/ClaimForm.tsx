"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createClaimAction } from "@/lib/claims/actions";
import { VoiceRecorder } from "@/components/VoiceRecorder";

const CLAIM_TYPES = ["DAMAGED", "SHORT_SUPPLY", "WRONG_ITEM", "EXPIRED", "WARRANTY", "QUALITY"] as const;
const MAX_PHOTOS = 5;

export type ClaimFormOption = { id: string; label: string };
export type ClaimFormOrder = { id: string; label: string; productIds: string[] };
type Photo = { path: string; preview: string };
type ClaimFormProps = {
  customerId: string;
  orderId?: string | null;
  productId?: string | null;
  voiceEnabled?: boolean;
  products?: ClaimFormOption[];
  orders?: ClaimFormOrder[];
};

/** Shrink large phone photos to a JPEG under the 5MB upload limit before sending. */
async function prepareImage(file: File): Promise<File> {
  if (file.size <= 4 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("image");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

export function ClaimForm({ customerId, orderId, productId, voiceEnabled = true, products = [], orders = [] }: ClaimFormProps) {
  const t = useTranslations("claims");
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<(typeof CLAIM_TYPES)[number]>("DAMAGED");
  const [order, setOrder] = useState(orderId ?? "");
  const [product, setProduct] = useState(productId ?? "");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");
  const [voiceNoteId, setVoiceNoteId] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // With an order picked, only that order's products can be claimed (the database checks this too).
  const productChoices = useMemo(() => {
    const selected = orders.find((o) => o.id === order);
    return selected ? products.filter((p) => selected.productIds.includes(p.id)) : products;
  }, [order, orders, products]);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setMessage(null);
    try {
      for (const raw of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
        const file = await prepareImage(raw);
        const body = new FormData();
        body.set("file", file);
        const response = await fetch("/api/uploads/claim", { method: "POST", body });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.path) throw new Error(result.error || t("photoUploadError"));
        setPhotos((current) => [...current, { path: result.path, preview: URL.createObjectURL(file) }]);
      }
    } catch (error) {
      setMessage({ tone: "bad", text: error instanceof Error && error.message !== "image" ? error.message : t("photoUploadError") });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function submit() {
    setMessage(null);
    if (!product) { setMessage({ tone: "bad", text: t("chooseProduct") }); return; }
    if (type === "DAMAGED" && photos.length === 0) { setMessage({ tone: "bad", text: t("damagePhotoRequired") }); return; }
    const formData = new FormData();
    formData.set("customerId", customerId);
    if (order) formData.set("orderId", order);
    formData.set("claimType", type);
    formData.set("description", description);
    formData.set("voiceNoteId", voiceNoteId);
    formData.set("linesJson", JSON.stringify([{ productId: product, quantity, reasonNotes: description.trim() }]));
    formData.set("photosJson", JSON.stringify(photos.map((p) => ({ url: p.path }))));
    startTransition(async () => {
      try {
        await createClaimAction(formData);
        setMessage({ tone: "good", text: t("submitted") });
        setDescription("");
        setVoiceNoteId("");
        setPhotos([]);
        setQuantity("1");
        router.refresh();
      } catch (error) {
        setMessage({ tone: "bad", text: error instanceof Error ? error.message : t("actionError") });
      }
    });
  }

  const label = "flex flex-col gap-1.5 text-[13px] font-semibold text-ink-2";
  const control = "min-h-11 w-full font-normal text-ink";

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex flex-col gap-4 rounded-[10px] border border-line bg-surface p-4 md:p-5" noValidate>
      <h2 className="text-[15px] font-semibold">{t("raiseClaim")}</h2>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink-2">{t("type")}</span>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {CLAIM_TYPES.map((claimType) => (
            <button key={claimType} type="button" aria-pressed={type === claimType} onClick={() => setType(claimType)}
              className={`min-h-11 rounded-lg border px-3 text-start text-sm ${type === claimType ? "border-ink bg-sunken font-semibold text-ink" : "border-line text-ink-2"}`}>
              {t(`types.${claimType}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {orders.length ? (
          <label className={label}>{t("order")}
            <select value={order} onChange={(e) => { setOrder(e.target.value); setProduct(""); }} className={control}>
              <option value="">{t("noOrder")}</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
        ) : null}
        <label className={label}>{t("product")}
          <select required value={product} onChange={(e) => setProduct(e.target.value)} className={control}>
            <option value="">{t("chooseProduct")}</option>
            {productChoices.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label className={label}>{t("quantity")}
          <input required min="1" step="1" type="number" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={control} />
        </label>
      </div>

      {voiceEnabled ? <VoiceRecorder customerId={customerId} onDraft={(draft) => { if (draft.notes) setDescription(draft.notes); }} onVoiceNoteId={setVoiceNoteId} /> : null}
      <label className={label}>{t("description")}
        <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("descriptionHint")} className="w-full font-normal text-ink" />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-ink-2">{t("photos")}</span>
        <p className="text-xs text-muted">{type === "DAMAGED" ? t("damagePhotoRequired") : t("upToFivePhotos")}</p>
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <div key={photo.path} className="relative size-20 overflow-hidden rounded-lg border border-line bg-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.preview} alt="" className="size-full object-cover" />
              <button type="button" onClick={() => setPhotos((c) => c.filter((p) => p.path !== photo.path))} aria-label={t("removePhoto")}
                className="absolute end-1 top-1 flex size-6 items-center justify-center rounded-full bg-ink/80 text-white"><X className="size-3.5" /></button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading}
              className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#c9c7bf] text-xs font-medium text-ink-2 disabled:opacity-50">
              <ImagePlus className="size-5" aria-hidden="true" />{uploading ? "…" : t("addPhoto")}
            </button>
          ) : null}
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void addPhotos(e.target.files)} />
      </div>

      {message ? <p role={message.tone === "bad" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[13px] ${message.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{message.text}</p> : null}
      <div>
        <button disabled={isPending || uploading} className="min-h-11 rounded-lg bg-ink px-5 text-sm font-semibold text-white hover:bg-[#2b2f37] disabled:opacity-50" type="submit">{isPending ? t("loading") : t("submit")}</button>
      </div>
    </form>
  );
}
