import "server-only";

import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserContext } from "@/lib/auth/server";
import type { Agent, AgentStat, ApprovalOrder, CustomerRow, CustomerStatus, CustomerType, CustomerView, OpsSummary } from "./types";

/**
 * Data for the redesigned Admin console (akai-admin-ui kit), mapped onto the AKAI schema.
 * Heavy aggregation runs in Postgres (admin_ops_summary, admin_nav_badges, migration 0066);
 * every call runs as the signed-in user, so RLS and permission checks apply.
 */

const n = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export type OpsSummaryResult = OpsSummary & {
  can: { revenue: boolean; ledger: boolean; collections: boolean };
  dataHealth: OpsSummary["dataHealth"] & { noArea: number };
};

const EMPTY_SUMMARY: OpsSummaryResult = {
  can: { revenue: false, ledger: false, collections: false },
  revenueMtd: 0, revenuePrevMonth: 0, revenueTarget: null, ordersMtd: 0, ordersPrevMonth: 0,
  pendingApprovals: { count: 0, amount: 0, overLimit: 0 }, activeCustomers: 0, receivables: 0,
  overdue30: { count: 0, amount: 0 }, overdue60: { count: 0, amount: 0 }, collectedMtd: 0, collectionTarget: null,
  pendingDeposits: { count: 0, amount: 0 }, bouncedCheques: { count: 0, amount: 0 },
  delivery: { confirmed: 0, picked: 0, dispatched: 0, deliveredToday: 0, failedToday: 0, delayedRuns: 0 },
  deliveredMtd: 0, revenueByMonth: [], revenueByCategory: [], topCustomers: [], agents: [], ageing: [], topOverdue: [],
  dataHealth: { dealerCount: 0, internalCount: 0, totalRecords: 0, completeProfiles: 0, withAgent: 0, areaVariants: 0, areaVariantsAfterMerge: 0, typeOther: 0, typeSuggestions: 0, duplicatesFlagged: 0, noArea: 0 },
};

type RawSummary = Record<string, unknown> & {
  can?: { revenue?: boolean; ledger?: boolean; collections?: boolean };
  pendingApprovals?: Record<string, unknown>; pendingDeposits?: Record<string, unknown>; bouncedCheques?: Record<string, unknown>;
  delivery?: Record<string, unknown>; dataHealth?: Record<string, unknown>;
  ageing?: Array<{ bucket: OpsSummary["ageing"][number]["bucket"]; amount: unknown; customers: unknown }>;
  revenueByMonth?: Array<{ month: string; value: unknown }>;
  revenueByCategory?: Array<{ name: string; nameUr?: string | null; value: unknown }>;
  topCustomers?: Array<{ name: string; area: string | null; value: unknown }>;
  topOverdue?: Array<{ customerId: string; name: string; area: string | null; agentName: string | null; amount: unknown; daysOverdue: unknown }>;
  agents?: Array<Record<string, unknown>>;
};

export const getOpsSummary = cache(async (): Promise<OpsSummaryResult> => {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_ops_summary");
  if (error || !data) {
    if (process.env.NODE_ENV !== "production") console.warn("[admin_ops_summary]", error?.message);
    return EMPTY_SUMMARY;
  }
  const raw = data as RawSummary;
  const ageing = (raw.ageing ?? []).map((b) => ({ bucket: b.bucket, amount: n(b.amount), customers: n(b.customers) }));
  const agg = (keys: string[]) => {
    const rows = ageing.filter((b) => keys.includes(b.bucket));
    return { count: rows.reduce((s, b) => s + b.customers, 0), amount: rows.reduce((s, b) => s + b.amount, 0) };
  };
  const pair = (value?: Record<string, unknown>) => ({ count: n(value?.count), amount: n(value?.amount) });
  const d = raw.delivery ?? {};
  const h = raw.dataHealth ?? {};
  const agents: AgentStat[] = (raw.agents ?? []).map((a) => ({
    id: String(a.id), name: String(a.name ?? "—"), beatLabel: (a.beatLabel as string | null) ?? null,
    revenue: n(a.revenue), orders: n(a.orders), visitsPlanned: n(a.visitsPlanned), visitsDone: n(a.visitsDone),
    collected: n(a.collected), collectionTarget: n(a.collectionTarget), profilesComplete: n(a.profilesComplete),
  }));
  return {
    can: { revenue: raw.can?.revenue === true, ledger: raw.can?.ledger === true, collections: raw.can?.collections === true },
    revenueMtd: n(raw.revenueMtd), revenuePrevMonth: n(raw.revenuePrevMonth), revenueTarget: null,
    ordersMtd: n(raw.ordersMtd), ordersPrevMonth: n(raw.ordersPrevMonth),
    pendingApprovals: { ...pair(raw.pendingApprovals), overLimit: n(raw.pendingApprovals?.overLimit) },
    activeCustomers: n(raw.activeCustomers), receivables: n(raw.receivables),
    overdue30: agg(["31_60", "61_90", "90_plus"]), overdue60: agg(["61_90", "90_plus"]),
    collectedMtd: n(raw.collectedMtd), collectionTarget: raw.collectionTarget == null ? null : n(raw.collectionTarget),
    pendingDeposits: pair(raw.pendingDeposits), bouncedCheques: pair(raw.bouncedCheques),
    delivery: { confirmed: n(d.confirmed), picked: n(d.picked), dispatched: n(d.dispatched), deliveredToday: n(d.deliveredToday), failedToday: n(d.failedToday), delayedRuns: n(d.delayedRuns) },
    deliveredMtd: n(raw.deliveredMtd),
    revenueByMonth: (raw.revenueByMonth ?? []).map((m) => ({ month: m.month, value: n(m.value) })),
    revenueByCategory: (raw.revenueByCategory ?? []).map((c) => ({ name: c.name, nameUr: c.nameUr ?? null, value: n(c.value) })),
    topCustomers: (raw.topCustomers ?? []).map((c) => ({ name: c.name, area: c.area, value: n(c.value) })),
    agents, ageing,
    topOverdue: (raw.topOverdue ?? []).map((o) => ({ customerId: o.customerId, name: o.name, area: o.area, agentName: o.agentName, amount: n(o.amount), daysOverdue: n(o.daysOverdue) })),
    dataHealth: {
      totalRecords: n(h.totalRecords), dealerCount: n(h.dealerCount), internalCount: n(h.internalCount), completeProfiles: n(h.completeProfiles),
      withAgent: n(h.withAgent), areaVariants: 0, areaVariantsAfterMerge: 0, typeOther: n(h.typeOther), typeSuggestions: n(h.typeSuggestions),
      duplicatesFlagged: n(h.duplicatesFlagged), noArea: n(h.noArea),
    },
  };
});

export type NavBadges = Partial<Record<"approvals" | "recovery" | "enrichment", number>>;

export const getNavBadges = cache(async (): Promise<NavBadges> => {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_nav_badges");
  if (error || !data) return {};
  const raw = data as Record<string, unknown>;
  return { approvals: n(raw.approvals), recovery: n(raw.recovery), enrichment: n(raw.enrichment) };
});

/** Sales agents with a display name (users.full_name, else agent code). */
export const getAgents = cache(async (): Promise<Agent[]> => {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("sales_agents").select("id,agent_code,territory,user:users!sales_agents_user_id_fkey(full_name)").order("agent_code");
  if (error) {
    const fallback = await supabase.from("sales_agents").select("id,agent_code,territory").order("agent_code");
    return (fallback.data ?? []).map((a) => ({ id: a.id as string, name: String(a.agent_code), beatLabel: (a.territory as string | null) ?? null }));
  }
  return (data ?? []).map((a) => {
    const user = (Array.isArray(a.user) ? a.user[0] : a.user) as { full_name?: string | null } | null;
    return { id: a.id as string, name: user?.full_name?.trim() || String(a.agent_code), beatLabel: (a.territory as string | null) ?? null };
  });
});

/** The signed-in admin for the sidebar footer. */
export async function getCurrentAdmin() {
  const context = await getCurrentUserContext();
  if (!context) return null;
  const name = context.fullName?.trim() || context.email || "Admin";
  const initials = name.split(/[\s@.]+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return { id: context.userId, name, role: context.roleName ?? "Administrator", initials };
}

/* ─── Approvals ─── */
export async function getApprovalQueue(): Promise<ApprovalOrder[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id,order_number,total_pkr,placed_at,created_at,customer_id,customer:customers!orders_customer_id_fkey(business_name,area_code,assigned_agent_id,current_balance_pkr,credit_limit_pkr),lines:order_lines(quantity,line_total_pkr,is_free_item,product:products(name_en,name_ur,sku))")
    .eq("status", "PENDING_APPROVAL")
    .order("placed_at", { ascending: true, nullsFirst: false })
    .limit(200);
  if (error) throw new Error("Approval queue could not be loaded.");
  const rows = (data ?? []) as unknown as Array<{
    id: string; order_number: string; total_pkr: string | number; placed_at: string | null; created_at: string; customer_id: string;
    customer: { business_name: string; area_code: string | null; assigned_agent_id: string | null; current_balance_pkr: string | number; credit_limit_pkr: string | number } | null;
    lines: Array<{ quantity: string | number; line_total_pkr: string | number; is_free_item: boolean; product: { name_en: string | null; name_ur: string | null; sku: string } | null }> | null;
  }>;
  const customerIds = [...new Set(rows.map((r) => r.customer_id))];
  const [agents, prior] = await Promise.all([
    getAgents(),
    customerIds.length
      ? supabase.from("orders").select("customer_id").in("customer_id", customerIds).in("status", ["PLACED", "CONFIRMED", "PICKED", "DISPATCHED", "DELIVERED"])
      : Promise.resolve({ data: [] as Array<{ customer_id: string }> }),
  ]);
  const agentMap = new Map(agents.map((a) => [a.id, a.name]));
  const hasPrior = new Set(((prior.data ?? []) as Array<{ customer_id: string }>).map((p) => p.customer_id));
  return rows.map((r) => ({
    id: r.id, orderNumber: r.order_number, placedAt: r.placed_at ?? r.created_at, total: n(r.total_pkr),
    customerName: r.customer?.business_name ?? "—", area: r.customer?.area_code ?? null,
    agentName: r.customer?.assigned_agent_id ? agentMap.get(r.customer.assigned_agent_id) ?? null : null,
    balance: n(r.customer?.current_balance_pkr), creditLimit: n(r.customer?.credit_limit_pkr),
    isFirstOrder: !hasPrior.has(r.customer_id),
    lines: (r.lines ?? []).map((l) => ({ name: l.product?.name_en || l.product?.sku || "—", nameUr: l.product?.name_ur ?? null, qty: n(l.quantity), total: n(l.line_total_pkr) })),
  }));
}

/* ─── Customers ─── */
export interface CustomerQuery { view?: CustomerView; q?: string; agent?: string; area?: string; type?: string; status?: string; group?: string; page?: number; pageSize?: number }

const CUSTOMER_COLS = "id,business_name,business_name_urdu,area_code,customer_type,customer_type_suggestion,status,assigned_agent_id,current_balance_pkr,credit_limit_pkr,data_complete,primary_phone,full_address,latitude,duplicate_review_required,is_internal_account";
const VIEWS: CustomerView[] = ["all", "incomplete", "unassigned", "duplicates", "internal"];

// PostgREST filter builder type is deep; keep the helper loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyView(query: any, view: CustomerView) {
  if (view === "incomplete") return query.eq("data_complete", false).eq("is_internal_account", false);
  if (view === "unassigned") return query.is("assigned_agent_id", null).eq("is_internal_account", false);
  if (view === "duplicates") return query.eq("duplicate_review_required", true);
  if (view === "internal") return query.eq("is_internal_account", true);
  return query.eq("is_internal_account", false);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, q: CustomerQuery) {
  let next = query;
  const search = (q.q ?? "").replace(/[(),%*\\]/g, " ").trim();
  if (search) next = next.or(`business_name.ilike.%${search}%,normalized_name.ilike.%${search}%,area_code.ilike.%${search}%,primary_phone.ilike.%${search}%,business_name_urdu.ilike.%${search}%`);
  if (q.agent === "none") next = next.is("assigned_agent_id", null);
  else if (q.agent) next = next.eq("assigned_agent_id", q.agent);
  if (q.area) next = next.eq("area_code", q.area);
  if (q.type) next = next.eq("customer_type", q.type);
  if (q.status) next = next.eq("status", q.status);
  if (q.group) next = next.eq("vendor_group_id", q.group);
  return next;
}

export async function getCustomers(query: CustomerQuery) {
  const supabase = await getSupabaseServerClient();
  const view = VIEWS.includes(query.view as CustomerView) ? (query.view as CustomerView) : "all";
  const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 5000);
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * pageSize;

  const countFor = async (v: CustomerView) => {
    const { count } = await applyView(supabase.from("customers").select("id", { count: "exact", head: true }), v);
    return count ?? 0;
  };
  const rowsQuery = applyFilters(applyView(supabase.from("customers").select(CUSTOMER_COLS, { count: "exact" }), view), query)
    .order("business_name").range(from, from + pageSize - 1);

  const [rowsResult, agents, areasResult, ...counts] = await Promise.all([
    rowsQuery,
    getAgents(),
    supabase.from("area_codes").select("code").order("code"),
    ...VIEWS.map(countFor),
  ]);
  if (rowsResult.error) throw new Error("Customer data could not be loaded.");
  const agentMap = new Map(agents.map((a) => [a.id, a.name]));
  const rows: CustomerRow[] = ((rowsResult.data ?? []) as Array<Record<string, unknown>>).map((c) => {
    const missing: CustomerRow["missing"] = [];
    if (!c.primary_phone) missing.push("phone");
    if (!c.full_address) missing.push("address");
    if (c.latitude == null) missing.push("location");
    const agentId = (c.assigned_agent_id as string | null) ?? null;
    return {
      id: String(c.id), name: String(c.business_name ?? "—"), area: (c.area_code as string | null) ?? null,
      type: c.customer_type as CustomerType, typeSuggestion: (c.customer_type_suggestion as CustomerType | null) ?? null,
      status: c.status as CustomerStatus, agentId, agentName: agentId ? agentMap.get(agentId) ?? null : null,
      balance: n(c.current_balance_pkr), creditLimit: n(c.credit_limit_pkr), dataComplete: c.data_complete === true,
      missing, duplicateFlag: c.duplicate_review_required === true, isInternal: c.is_internal_account === true,
    };
  });
  const countMap = Object.fromEntries(VIEWS.map((v, i) => [v, counts[i] as number])) as Record<CustomerView, number>;
  const areas = ((areasResult.data ?? []) as Array<{ code: string }>).map((a) => a.code);
  return { rows, total: rowsResult.count ?? rows.length, page, pageSize, counts: countMap, agents, areas, view };
}
