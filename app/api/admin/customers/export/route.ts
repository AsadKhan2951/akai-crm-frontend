import { requirePermission } from "@/lib/auth/server";
import { getCustomers } from "@/lib/admin/ops";
import type { CustomerView } from "@/lib/admin/types";

function csv(value: unknown) { const text = String(value ?? ""); return `"${text.replaceAll('"', '""')}"`; }

/** CSV export of the current Customers view and filters. RLS and customer.export apply. */
export async function GET(request: Request) {
  await requirePermission("customer.export");
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  let rows;
  try {
    ({ rows } = await getCustomers({ view: sp.view as CustomerView | undefined, q: sp.q, agent: sp.agent, area: sp.area, type: sp.type, status: sp.status, group: sp.group, page: 1, pageSize: 5000 }));
  } catch {
    return Response.json({ error: "Customers could not be exported. Refresh and try again." }, { status: 500 });
  }
  const header = ["business_name", "area_code", "customer_type", "status", "agent", "current_balance_pkr", "credit_limit_pkr", "data_complete", "missing", "duplicate_review", "internal"];
  const body = [header, ...rows.map((r) => [r.name, r.area, r.type, r.status, r.agentName, r.balance, r.creditLimit, r.dataComplete ? "yes" : "no", r.missing.join(" "), r.duplicateFlag ? "yes" : "no", r.isInternal ? "yes" : "no"].map(csv))]
    .map((row) => row.join(","))
    .join("\n");
  return new Response(`﻿${body}\n`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=akai-customers-${new Date().toISOString().slice(0, 10)}.csv` } });
}
