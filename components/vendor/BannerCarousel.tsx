"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type VendorBanner = {
  id: string; title_en: string; title_ur: string; subtitle_en: string | null; subtitle_ur: string | null;
  image_url: string | null; image_url_ur: string | null; link_type: string; link_target_id: string | null; external_url: string | null; cta_type: string;
};

function bannerHref(banner: VendorBanner): string | null {
  switch (banner.link_type) {
    case "PRODUCT": return banner.link_target_id ? `/vendor/catalogue/${banner.link_target_id}` : null;
    case "CATEGORY": return banner.link_target_id ? `/vendor/catalogue?category=${banner.link_target_id}` : null;
    case "BRAND": return banner.link_target_id ? `/vendor/catalogue?brand=${banner.link_target_id}` : null;
    case "COLLECTION": return banner.link_target_id ? `/vendor/catalogue?collection=${banner.link_target_id}` : null;
    default: return null;
  }
}

export function BannerCarousel({ banners }: { banners: VendorBanner[] }) {
  const t = useTranslations("vendorBanners");
  const locale = useLocale();
  const [index, setIndex] = useState(0);
  const count = banners.length;

  useEffect(() => {
    if (count < 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => window.clearInterval(timer);
  }, [count]);

  if (count === 0) return null;
  const banner = banners[Math.min(index, count - 1)];
  const title = locale === "ur" ? banner.title_ur || banner.title_en : banner.title_en;
  const subtitle = locale === "ur" ? banner.subtitle_ur || banner.subtitle_en : banner.subtitle_en;
  const image = locale === "ur" ? banner.image_url_ur || banner.image_url : banner.image_url;
  const href = bannerHref(banner);
  const ctaLabel = banner.cta_type === "BUY_NOW" ? t("buyNow") : banner.cta_type === "REQUEST_QUOTE" ? t("requestQuote") : t("view");

  return (
    <section aria-roledescription="carousel" aria-label={t("promotions")} className="relative overflow-hidden rounded-lg border border-slate-200 bg-[#15171c] text-white">
      <div className="grid min-h-44 md:grid-cols-2" aria-live="polite" aria-label={t("slidePosition", { current: index + 1, total: count })}>
        <div className="flex flex-col justify-center gap-3 p-6">
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-200">{subtitle}</p> : null}
          {href ? <Link href={href as never} className="inline-flex min-h-11 w-fit items-center rounded-lg bg-brand hover:bg-[#1a3ca8] px-4 font-semibold text-white">{ctaLabel}</Link>
            : banner.external_url ? <a href={banner.external_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-fit items-center rounded-lg bg-brand hover:bg-[#1a3ca8] px-4 font-semibold text-white">{ctaLabel}</a> : null}
        </div>
        {image ? <img src={image} alt="" className="h-44 w-full object-cover md:h-full" loading={index === 0 ? "eager" : "lazy"} /> : null}
      </div>
      {count > 1 ? (
        <div className="absolute bottom-3 end-3 flex items-center gap-2">
          <button type="button" onClick={() => setIndex((i) => (i - 1 + count) % count)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-primary" aria-label={t("previous")}><ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" /></button>
          <button type="button" onClick={() => setIndex((i) => (i + 1) % count)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-primary" aria-label={t("next")}><ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" /></button>
        </div>
      ) : null}
    </section>
  );
}
