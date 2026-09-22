"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { requestLoyaltyRedemptionAction } from "./actions";

type Reward = { id: string; name_en: string; name_ur: string; description_en: string | null; description_ur: string | null; reward_type: string; points_cost: number; discount_value_pkr: string | null; discount_percent: string | null; stock_limit: number | null; redeemed_count: number; ends_at: string | null };
type Transaction = { id: string; points: number; reason: string; created_at: string };
type Redemption = { id: string; reward_id: string; points_spent: number; status: string; requested_at: string; reward?: { name_en?: string; name_ur?: string } | null };

export function PointsView({ balance, rewards, transactions, redemptions }: { balance: number; rewards: Reward[]; transactions: Transaction[]; redemptions: Redemption[] }) {
  const t = useTranslations("loyalty");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const locale = typeof document === "undefined" ? "en" : document.documentElement.lang;
  const pendingRewardIds = new Set(redemptions.filter((item) => item.status === "REQUESTED" || item.status === "APPROVED").map((item) => item.reward_id));
  function requestReward(rewardId: string) {
    setMessage("");
    const form = new FormData(); form.set("rewardId", rewardId);
    startTransition(() => { void requestLoyaltyRedemptionAction(form).then(() => setMessage(t("requestSuccess"))).catch(() => setMessage(t("requestError"))); });
  }
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold text-primary">{t("title")}</h1><p className="text-muted-foreground">{t("description")}</p></header>
    <section className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-muted-foreground">{t("balance")}</p><p className="mt-2 text-4xl font-bold text-primary"><bdi>{balance}</bdi></p></section>
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4"><h2 className="text-lg font-semibold text-primary">{t("howItWorks")}</h2><p className="mt-2 text-muted-foreground">{t("explanation")}</p></section>
    {message ? <p role="status" className="rounded-md border border-slate-200 bg-white p-3 text-sm font-semibold text-primary">{message}</p> : null}
    <section className="space-y-3"><div><h2 className="text-xl font-semibold text-primary">{t("rewardsTitle")}</h2><p className="text-muted-foreground">{t("rewardsDescription")}</p></div>{rewards.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center"><p className="font-semibold">{t("noRewards")}</p><p className="text-muted-foreground">{t("noRewardsHint")}</p></div> : <div className="grid gap-4 md:grid-cols-2">{rewards.map((reward) => { const affordable = balance >= reward.points_cost; const near = Math.max(reward.points_cost - balance, 0); const requested = pendingRewardIds.has(reward.id); const name = locale === "ur" ? reward.name_ur : reward.name_en; const description = locale === "ur" ? reward.description_ur : reward.description_en; return <article key={reward.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-primary">{name}</h3><p className="mt-1 text-sm text-muted-foreground">{description || t("notAvailable")}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold"><bdi>{reward.points_cost}</bdi> {t("points")}</span></div>{near > 0 ? <p className="mt-3 text-sm text-muted-foreground">{t("nearMiss", { points: near })}</p> : <p className="mt-3 text-sm font-semibold text-primary">{t("available")}</p>}<div className="mt-4 flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground"><bdi>{reward.reward_type}</bdi>{reward.ends_at ? <> · <bdi>{new Date(reward.ends_at).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })}</bdi></> : null}</span><button type="button" disabled={!affordable || requested || pending} onClick={() => requestReward(reward.id)} className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white disabled:opacity-50">{requested ? t("requested") : t("requestReward")}</button></div></article>; })}</div>}</section>
    <section className="space-y-3"><h2 className="text-xl font-semibold text-primary">{t("transactions")}</h2>{transactions.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-6 text-muted-foreground">{t("noTransactions")}</p> : <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-start"><thead className="bg-slate-50"><tr><th className="p-3">{t("date")}</th><th className="p-3">{t("reason")}</th><th className="p-3">{t("points")}</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="p-3"><bdi>{new Date(item.created_at).toLocaleDateString()}</bdi></td><td className="p-3"><bdi>{item.reason}</bdi></td><td className="p-3 font-semibold"><bdi>{item.points > 0 ? "+" : ""}{item.points}</bdi></td></tr>)}</tbody></table></div>}</section>
  </div>;
}
