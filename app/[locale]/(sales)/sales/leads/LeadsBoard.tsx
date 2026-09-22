"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { createSalesLead, convertSalesLead, importSalesLeads, previewSalesLeadDuplicates, rollbackSalesLeadImport, updateSalesLeadStage } from "../actions";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"] as const;
type Stage = typeof STAGES[number];
type Lead = { id: string; business_name: string; contact_name: string; phone: string; area_code: string; estimated_value_pkr: string; stage: Stage; days_in_stage: number; ai_score: string | number | null; ai_score_reason: string | null };
type Agent = { id: string; agent_code: string };
type CsvRow = { source_row: string; businessName: string; contactName: string; phone: string; email: string; areaCode: string; fullAddress: string; estimatedValuePKR: string; duplicate?: string | null };

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && text[index + 1] === '"' && quoted) { cell += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = ""; continue;
    }
    cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return `+92${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("92")) return `+${digits}`;
  return value.trim();
}

function normalizedHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function stageLabel(stage: string, t: ReturnType<typeof useTranslations>) {
  return t(`stageLabels.${stage}` as never);
}

function leadMatches(rows: CsvRow[], matches: Array<{ row_index: number; match_type: string; matched_name: string }>) {
  const byRow = new Map<number, string>();
  matches.forEach((match) => byRow.set(match.row_index, `${match.match_type}: ${match.matched_name}`));
  return rows.map((row, index) => ({ ...row, duplicate: byRow.get(Number.parseInt(row.source_row, 10)) ?? byRow.get(index + 2) ?? null }));
}

export function LeadsBoard({ leads, agents, canImport }: { leads: Lead[]; agents: Agent[]; canImport: boolean }) {
  const t = useTranslations("sales");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [converting, setConverting] = useState<Lead | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [duplicateRows, setDuplicateRows] = useState<CsvRow[]>([]);
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.id ?? "");
  const [batchId, setBatchId] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const grouped = useMemo(() => Object.fromEntries(STAGES.map((stage) => [stage, leads.filter((lead) => lead.stage === stage)])) as Record<Stage, Lead[]>, [leads]);

  function moveLead(lead: Lead, stage: Stage) {
    setErrorMessage("");
    if (stage === "WON") { setConverting(lead); return; }
    const lostReason = stage === "LOST" ? window.prompt(t("lostReason"))?.trim() ?? "" : "";
    if (stage === "LOST" && !lostReason) { setErrorMessage(t("lostReasonRequired")); return; }
    const formData = new FormData(); formData.set("leadId", lead.id); formData.set("stage", stage); if (lostReason) formData.set("lostReason", lostReason);
    startTransition(() => { void updateSalesLeadStage(formData).catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : t("errors.generic"))); });
  }

  async function handleFile(file: File) {
    setErrorMessage("");
    const rows = parseCsv(await file.text());
    if (rows.length < 2) { setErrorMessage(t("importError")); return; }
    const headers = rows[0].map(normalizedHeader);
    const findColumn = (names: string[]) => headers.findIndex((header) => names.includes(header));
    const businessIndex = findColumn(["businessname", "business", "company", "name"]);
    const contactIndex = findColumn(["contactname", "contact", "contactperson"]);
    const phoneIndex = findColumn(["phone", "mobile", "primaryphone", "whatsapp"]);
    const emailIndex = findColumn(["email", "emailaddress"]);
    const areaIndex = findColumn(["areacode", "area", "territory"]);
    const addressIndex = findColumn(["fulladdress", "address"]);
    const valueIndex = findColumn(["estimatedvalue", "estimatedvaluepkr", "value", "valuepkr"]);
    if (businessIndex < 0 || phoneIndex < 0 || areaIndex < 0) { setErrorMessage(t("importError")); return; }
    const mapped = rows.slice(1).map((row, index) => ({
      source_row: String(index + 2), businessName: row[businessIndex] ?? "", contactName: contactIndex >= 0 ? row[contactIndex] ?? "" : row[businessIndex] ?? "", phone: normalizePhone(row[phoneIndex] ?? ""), email: emailIndex >= 0 ? row[emailIndex] ?? "" : "", areaCode: row[areaIndex] ?? "", fullAddress: addressIndex >= 0 ? row[addressIndex] ?? "" : "", estimatedValuePKR: valueIndex >= 0 ? row[valueIndex] ?? "0" : "0",
    })).filter((row) => row.businessName || row.phone);
    setCsvRows(mapped); setDuplicateRows([]); setBatchId(crypto.randomUUID()); setImportMessage("");
    startTransition(() => { void previewSalesLeadDuplicates(mapped).then((matches) => setDuplicateRows(leadMatches(mapped, matches))).catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : t("errors.generic"))); });
  }

  function confirmImport() {
    if (!selectedAgent || !csvRows.length || csvRows.some((row) => !row.businessName || !/^\+92\d{10}$/.test(row.phone) || !row.areaCode)) { setErrorMessage(t("importError")); return; }
    const formData = new FormData(); formData.set("batchId", batchId); formData.set("assignedAgentId", selectedAgent); formData.set("sourceFilename", fileRef.current?.files?.[0]?.name ?? "sales-leads.csv");
    formData.set("rowsJson", JSON.stringify(csvRows));
    startTransition(() => { void importSalesLeads(formData).then((result) => setImportMessage(`${t("importComplete")} ${result.insertedCount}.`)).catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : t("importError"))); });
  }

  function rollbackBatch() {
    const formData = new FormData(); formData.set("batchId", batchId);
    startTransition(() => { void rollbackSalesLeadImport(formData).then((result) => setImportMessage(`${t("rollbackImport")}: ${result.deletedCount}`)).catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : t("errors.generic"))); });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("leadsTitle")} description={t("leadsDescription")} actions={canImport ? <Button type="button" onClick={() => setImportOpen((value) => !value)}>{t("importLeads")}</Button> : undefined} />
      {canImport && importOpen ? <section className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4" aria-label={t("importLeads")}>
        <div><h2 className="font-semibold text-primary">{t("importLeads")}</h2><p className="text-sm text-muted-foreground">{t("importDescription")}</p></div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="block min-h-11 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} aria-label={t("chooseFile")} />
        {agents.length > 0 ? <label className="block text-sm font-medium text-primary">{t("assignedAgent") ?? "Sales Agent"}<select className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3" value={selectedAgent} onChange={(event) => setSelectedAgent(event.target.value)}>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.agent_code}</option>)}</select></label> : null}
        {csvRows.length > 0 ? <div className="space-y-3"><p className="text-sm text-muted-foreground"><bdi>{csvRows.length}</bdi> {t("importedRows")}</p><div className="max-h-72 overflow-auto rounded-md border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-2">#</th><th className="p-2">{t("businessName")}</th><th className="p-2">{t("phone")}</th><th className="p-2">{t("area")}</th><th className="p-2">{t("duplicate")}</th></tr></thead><tbody>{duplicateRows.map((row) => <tr key={row.source_row} className="border-t border-slate-100"><td className="p-2"><bdi>{row.source_row}</bdi></td><td className="p-2">{row.businessName}</td><td className="p-2"><bdi>{row.phone}</bdi></td><td className="p-2">{row.areaCode}</td><td className="p-2 text-sm text-muted-foreground">{row.duplicate ?? t("noDuplicate")}</td></tr>)}</tbody></table></div><div className="flex flex-wrap gap-2"><Button type="button" onClick={confirmImport} disabled={isPending}>{t("confirmImport")}</Button>{batchId && importMessage ? <Button type="button" variant="outline" onClick={rollbackBatch} disabled={isPending}>{t("rollbackImport")}</Button> : null}</div></div> : null}
        {importMessage ? <p className="text-sm font-medium text-primary" role="status">{importMessage}</p> : null}{errorMessage ? <p className="text-sm font-medium text-[#D6202C]" role="alert">{errorMessage}</p> : null}
      </section> : null}
      <section className="space-y-3" aria-label={t("leadsTitle")}>
        <div className="flex flex-col gap-3 sm:flex-row"><input className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3" placeholder={t("searchLeads")} aria-label={t("searchLeads")} /><Button type="button" variant="outline" onClick={() => document.getElementById("new-lead-form")?.scrollIntoView({ behavior: "smooth" })}>{t("newLead")}</Button></div>
        <div className="grid gap-3 overflow-x-auto md:grid-cols-4 xl:grid-cols-7">
          {STAGES.map((stage) => <div key={stage} className="min-w-[250px] rounded-lg bg-slate-50 p-3" onDragOver={(event) => event.preventDefault()} onDrop={() => { const lead = leads.find((item) => item.id === draggedId); if (lead) moveLead(lead, stage); setDraggedId(null); }}><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-primary">{stageLabel(stage, t)}</h2><span className="rounded-full bg-white px-2 py-1 text-sm text-muted-foreground"><bdi>{grouped[stage].length}</bdi></span></div>{grouped[stage].map((lead) => <article key={lead.id} draggable onDragStart={() => setDraggedId(lead.id)} className="mb-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><p className="font-semibold text-primary">{lead.business_name}</p><p className="text-sm text-muted-foreground">{lead.area_code} · <bdi>PKR {lead.estimated_value_pkr}</bdi></p><p className="text-xs text-muted-foreground"><bdi>{lead.days_in_stage}</bdi> {t("daysInStage")}</p>{lead.ai_score !== null ? <p className="mt-2 text-sm text-primary">{t("aiScore")}: <bdi>{lead.ai_score}</bdi>{lead.ai_score_reason ? <span className="block text-xs text-muted-foreground">{lead.ai_score_reason}</span> : null}</p> : null}<div className="mt-3 md:hidden"><select className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-2 text-sm" value={lead.stage} onChange={(event) => moveLead(lead, event.target.value as Stage)} aria-label={t("stage")}>{STAGES.map((option) => <option key={option} value={option}>{stageLabel(option, t)}</option>)}</select></div></article>)}</div>)}
        </div>
        {leads.length === 0 ? <EmptyState title={t("noLeads")} description={t("noLeadsHint")} /> : null}
      </section>
      <section id="new-lead-form" className="rounded-lg border border-slate-200 bg-white p-4"><h2 className="mb-3 font-semibold text-primary">{t("newLead")}</h2><form action={createSalesLead} className="grid gap-3 md:grid-cols-2"><input name="businessName" required placeholder={t("businessName")} className="min-h-11 rounded-md border border-slate-300 px-3" /><input name="contactName" required placeholder={t("contactName")} className="min-h-11 rounded-md border border-slate-300 px-3" /><input name="phone" required placeholder={t("phone")} className="min-h-11 rounded-md border border-slate-300 px-3" /><input name="email" type="email" placeholder={t("email")} className="min-h-11 rounded-md border border-slate-300 px-3" /><input name="areaCode" required placeholder={t("area")} className="min-h-11 rounded-md border border-slate-300 px-3" /><input name="estimatedValuePKR" placeholder={t("estimatedValue")} className="min-h-11 rounded-md border border-slate-300 px-3" /><textarea name="fullAddress" placeholder={t("fullAddress")} className="min-h-24 rounded-md border border-slate-300 px-3 py-2 md:col-span-2" /><Button type="submit" className="md:col-span-2">{t("createLead")}</Button></form></section>
      {converting ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/30 p-4"><div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg"><h2 className="text-lg font-semibold text-primary">{t("convertToCustomer")}</h2><p className="mt-1 text-sm text-muted-foreground">{converting.business_name}</p><form action={convertSalesLead} className="mt-4 space-y-3"><input type="hidden" name="leadId" value={converting.id} /><select name="customerType" className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3"><option value="OTHER">Other</option><option value="AUTO_PARTS">Auto parts</option><option value="OIL_CHANGE">Oil change</option><option value="CAR_WASH">Car wash</option><option value="DETAILING">Detailing</option><option value="FUEL_STATION">Fuel station</option></select><div className="flex gap-2"><Button type="submit">{t("convertToCustomer")}</Button><Button type="button" variant="outline" onClick={() => setConverting(null)}>{t("commonCancel") ?? "Cancel"}</Button></div></form></div></div> : null}
    </div>
  );
}
