"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PortalShellName } from "@/components/PortalShell";

type ChatLine = { role: "user" | "assistant"; text: string };

type Props = { portal: PortalShellName };

function surfaceForPortal(portal: PortalShellName) {
  void portal;
  return "WIDGET";
}

export function AIAssistantWidget({ portal }: Props) {
  const t = useTranslations("ai");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intro = useMemo(() => portal === "vendor" ? t("firstRunVendor") : portal === "sales" ? t("firstRunSales") : t("firstRunAdmin"), [portal, t]);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = question.trim();
    if (!message || pending) return;
    setQuestion("");
    setError(null);
    setPending(true);
    setLines((current) => [...current, { role: "user", text: message }, { role: "assistant", text: "" }]);
    try {
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, surface: surfaceForPortal(portal), conversationId, locale }) });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || t("unavailable"));
      }
      if (!response.body) throw new Error(t("unavailable"));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pendingText = "";
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        pendingText += decoder.decode(result.value, { stream: true });
        const events = pendingText.split("\n\n");
        pendingText = events.pop() ?? "";
        for (const rawEvent of events) {
          const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          try {
            const data = JSON.parse(dataLine.slice(5).trim()) as { conversationId?: string; text?: string; message?: string };
            if (data.conversationId) setConversationId(data.conversationId);
            if (data.text) setLines((current) => current.map((line, index) => index === current.length - 1 ? { ...line, text: line.text + data.text } : line));
            if (data.message && rawEvent.startsWith("event: error")) setError(data.message);
          } catch { /* ignore non-JSON provider framing */ }
        }
      }
    } catch (requestError) {
      const messageText = requestError instanceof Error ? requestError.message : t("unavailable");
      setError(messageText);
      setLines((current) => current.map((line, index) => index === current.length - 1 && !line.text ? { ...line, text: t("unavailable") } : line));
    } finally {
      setPending(false);
    }
  }

  return <div className="fixed bottom-20 end-4 z-50 md:bottom-6" dir={locale === "ur" ? "rtl" : "ltr"}>
    {open ? <section className="mb-3 flex w-[min(92vw,420px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" aria-label={t("assistant")}>
      <header className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-white">
        <div className="flex items-center gap-2"><Bot className="h-5 w-5" aria-hidden="true" /><h2 className="font-semibold">{t("heading")}</h2></div>
        <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setOpen(false)} aria-label={t("close")}><X className="h-5 w-5" /></Button>
      </header>
      <div className="max-h-[min(60vh,480px)] space-y-3 overflow-y-auto p-4" aria-live="polite">
        {lines.length === 0 ? <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700"><p className="font-semibold text-primary">{t("draft")}</p><p className="mt-1">{intro}</p><p className="mt-2 text-slate-500">{t("empty")}</p></div> : null}
        {lines.map((line, index) => <div key={`${line.role}-${index}`} className={cn("rounded-md p-3 text-sm", line.role === "user" ? "ms-8 bg-primary text-white" : "me-8 bg-slate-100 text-slate-800")}><p className="whitespace-pre-wrap">{line.text || (pending && index === lines.length - 1 ? t("thinking") : "")}</p></div>)}
        {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
      </div>
      <form onSubmit={ask} className="flex gap-2 border-t border-slate-200 p-3">
        <input value={question} onChange={(event) => setQuestion(event.target.value)} disabled={pending} placeholder={t("placeholder")} aria-label={t("question")} className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm" />
        <Button type="submit" size="icon" disabled={pending || !question.trim()} aria-label={t("send")}><Send className="h-4 w-4" /></Button>
      </form>
    </section> : null}
    <Button type="button" size="icon" className="h-12 w-12 rounded-full shadow-lg" onClick={() => setOpen((value) => !value)} aria-label={open ? t("close") : t("open")}><Sparkles className="h-5 w-5" aria-hidden="true" /></Button>
  </div>;
}
