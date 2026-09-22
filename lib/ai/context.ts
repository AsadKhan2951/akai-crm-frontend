import "server-only";

import { resolveVisibleProducts, type VisibleProduct } from "@/lib/catalog/resolve-visible-products";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserPermissionKeys } from "@/lib/auth/server";
import type { AiSurface } from "@/lib/types/db-enums";

export type AiLocale = "en" | "ur";
export type AiContext = {
  actor: { id: string; name: string; locale: AiLocale; role: string | null };
  surface: AiSurface;
  permissions: string[];
  evidence: Record<string, unknown>;
  trace: string[];
};

function localeOf(value: unknown): AiLocale { return value === "ur" ? "ur" : "en"; }

function productSummary(product: VisibleProduct) {
  return { id: product.id, sku: product.sku, nameEn: product.name_en, nameUr: product.name_ur, categoryId: product.category_id, brandId: product.brand_id, pricePKR: product.price_pkr, isQuoteOnly: product.is_quote_only, stockQuantity: product.stock_quantity };
}

export async function assembleCurrentUserAiContext(surface: AiSurface): Promise<AiContext> {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Your session expired. Log in again before using the AI assistant.");
  const [{ data: actor, error: actorError }, permissionKeys] = await Promise.all([
    supabase.from("users").select("id,full_name,preferred_locale,role_id").eq("id", user.id).single(),
    getCurrentUserPermissionKeys(),
  ]);
  if (actorError || !actor) throw new Error("Your user profile could not be loaded. Refresh and try again.");
  let roleName: string | null = null;
  if (actor.role_id) {
    const { data: role } = await supabase.from("roles").select("name").eq("id", actor.role_id).maybeSingle();
    roleName = role?.name ?? null;
  }
  const permissionKeyList = permissionKeys as string[];
  const permissions: string[] = [...new Set<string>(permissionKeyList)].sort();
  const context: AiContext = { actor: { id: actor.id, name: actor.full_name, locale: localeOf(actor.preferred_locale), role: roleName }, surface, permissions, evidence: {}, trace: ["users.current_user", "permission_keys.current_user"] };

  if (surface === "CATALOG_SEARCH") {
    if (!permissions.includes("product.view")) throw new Error("You do not have catalogue permission for AI search.");
    const { data: vendorAccount } = await supabase.from("vendor_accounts").select("customer_id").eq("user_id", user.id).maybeSingle();
    if (vendorAccount?.customer_id) {
      const visibleProducts = await resolveVisibleProducts(vendorAccount.customer_id);
      context.evidence = { visibleProducts: visibleProducts.slice(0, 500).map(productSummary), visibleProductCount: visibleProducts.length };
      context.trace.push("resolve_visible_products(current_vendor_customer)");
    }
    return context;
  }

  if (surface === "WIDGET" || surface === "COMPOSE" || surface === "ANALYTICS") {
    if (permissions.includes("customer.view")) {
      const { data: customers, error } = await supabase.from("customers").select("id,business_name,area_code,customer_type,status,assigned_agent_id,current_balance_pkr").neq("is_internal_account", true).order("business_name", { ascending: true }).limit(250);
      if (error) throw new Error("Your permitted customer context could not be loaded.");
      context.evidence = { customers: customers ?? [], customerCount: customers?.length ?? 0 };
      context.trace.push("customers.select.current_user_rls");
    }
    if (permissions.includes("lead.view")) {
      const { data: leads, error } = await supabase.from("leads").select("id,business_name,area_code,stage,assigned_agent_id").order("business_name", { ascending: true }).limit(250);
      if (error) throw new Error("Your permitted lead context could not be loaded.");
      context.evidence = { ...context.evidence, leads: leads ?? [], leadCount: leads?.length ?? 0 };
      context.trace.push("leads.select.current_user_rls");
    }
    if (permissions.includes("order.view")) {
      const { data: orders, error } = await supabase.from("orders").select("id,customer_id,order_number,status,created_at,placed_at,total_pkr").order("created_at", { ascending: false }).limit(250);
      if (error) throw new Error("Your permitted order context could not be loaded.");
      context.evidence = { ...context.evidence, orders: orders ?? [], orderCount: orders?.length ?? 0 };
      context.trace.push("orders.select.current_user_rls");
    }
    if (permissions.includes("quote.view")) {
      const { data: quotes, error } = await supabase.from("quotes").select("id,customer_id,quote_number,status,valid_until,created_at,converted_order_id").order("created_at", { ascending: false }).limit(250);
      if (error) throw new Error("Your permitted quote context could not be loaded.");
      context.evidence = { ...context.evidence, quotes: quotes ?? [], quoteCount: quotes?.length ?? 0 };
      context.trace.push("quotes.select.current_user_rls");
    }
    if (permissions.includes("followup.view")) {
      const { data: followUps, error } = await supabase.from("follow_ups").select("id,customer_id,lead_id,due_at,priority,note,is_completed").order("due_at", { ascending: true }).limit(250);
      if (error) throw new Error("Your permitted follow-up context could not be loaded.");
      context.evidence = { ...context.evidence, followUps: followUps ?? [] };
      context.trace.push("follow_ups.select.current_user_rls");
    }
    if (permissions.includes("activity.view")) {
      const { data: activities, error } = await supabase.from("activities").select("id,customer_id,lead_id,type,disposition,notes,occurred_at").order("occurred_at", { ascending: false }).limit(250);
      if (error) throw new Error("Your permitted activity context could not be loaded.");
      context.evidence = { ...context.evidence, activities: activities ?? [] };
      context.trace.push("activities.select.current_user_rls");
    }
    if (permissions.includes("ledger.view")) {
      const { data: ledger, error } = await supabase.from("ledger_entries").select("id,customer_id,type,amount_pkr,reference_number,description,entry_date").order("entry_date", { ascending: false }).limit(250);
      if (error) throw new Error("Your permitted ledger context could not be loaded.");
      context.evidence = { ...context.evidence, ledgerEntries: ledger ?? [] };
      context.trace.push("ledger_entries.select.current_user_rls");
    }
    if (permissions.includes("loyalty.view")) {
      const { data: loyalty, error } = await supabase.from("loyalty_transactions").select("id,customer_id,points,reason,created_at").order("created_at", { ascending: false }).limit(250);
      if (error) throw new Error("Your permitted loyalty context could not be loaded.");
      context.evidence = { ...context.evidence, loyaltyTransactions: loyalty ?? [] };
      context.trace.push("loyalty_transactions.select.current_user_rls");
    }
    if (permissions.includes("financials.view_revenue")) {
      const { data: revenue, error } = await supabase.from("revenue_snapshots").select("snapshot_date,total_revenue_pkr").order("snapshot_date", { ascending: false }).limit(120);
      if (error) throw new Error("Your permitted revenue context could not be loaded.");
      context.evidence = { ...context.evidence, revenueSnapshots: revenue ?? [] };
      context.trace.push("revenue_snapshots.select.current_user_rls");
    }
    if (permissions.includes("financials.view_margin")) {
      const { data: margins, error } = await supabase.from("margin_snapshots").select("snapshot_date,total_margin_pkr,margin_percent").order("snapshot_date", { ascending: false }).limit(120);
      if (error) throw new Error("Your permitted margin context could not be loaded.");
      context.evidence = { ...context.evidence, marginSnapshots: margins ?? [] };
      context.trace.push("margin_snapshots.select.current_user_rls");
    }
    if (permissions.includes("ai.analytics") && permissions.includes("dashboard.view") && permissions.includes("financials.view_revenue") && permissions.includes("financials.view_margin")) {
      const { getAdminDashboardData } = await import("@/lib/admin/queries");
      const dashboard = await getAdminDashboardData();
      context.evidence = { ...context.evidence, dashboard };
      context.trace.push("admin_dashboard_summary.current_user_rls", "admin_dashboard_analytics.current_user_rls");
    }
  }
  if (surface === "WIDGET" || surface === "COMPOSE") {
    const { data: vendorAccount } = await supabase.from("vendor_accounts").select("customer_id").eq("user_id", user.id).maybeSingle();
    if (vendorAccount?.customer_id) {
      const visibleProducts = await resolveVisibleProducts(vendorAccount.customer_id);
      context.evidence = { ...context.evidence, visibleProducts: visibleProducts.slice(0, 500).map(productSummary), visibleProductCount: visibleProducts.length };
      context.trace.push("resolve_visible_products(current_vendor_customer)");
    }
  }
  return context;
}

function roleInstruction(role: string | null) {
  if (role === "Vendor") return "You are assisting a vendor. Discuss only that vendor's visible products, own orders, own quotes, own ledger, and own loyalty evidence. Never discuss another vendor, another customer, internal cost, margin, or an absent product. Do not promise delivery dates.";
  if (role === "Sales Agent" || role === "Sales Manager") return "You are assisting Sales. Discuss only customers, leads, activities, follow-ups, orders, quotes, and catalogue evidence returned for this user. Explain the reason for a call recommendation and keep every follow-up as a draft for human review.";
  if (role === "Administrator" || role === "Accounts / Recovery Officer" || role === "Analyst") return "You are assisting an internal user. Use only permitted evidence. Do not reveal revenue or margin figures unless the corresponding permission is present in the evidence.";
  return "Use only the evidence returned for the current user and do not broaden the user's scope.";
}

export function aiSystemPrompt(locale: AiLocale, role: string | null = null) {
  const language = locale === "ur" ? "Urdu. Keep common Karachi business terms such as invoice, order, delivery, payment, and product in English where natural." : "English.";
  return `You are the AKAI CRM assistant. Reply in ${language}.
${roleInstruction(role)}
This is a read-only assistant. Never claim to have changed a customer, order, quote, price, stock, balance, permission, or message. Never place an order, send a message, or save a record.
Use only the JSON evidence supplied by the application. Do not estimate, infer, or invent figures, names, dates, balances, prices, margins, or order history. If the evidence does not contain an answer, say that the data is not available.
The evidence was assembled by queries executed as the current authenticated user under database Row Level Security. Do not discuss records that are absent from the evidence.
When stating a figure, briefly name the evidence source in square brackets, for example [orders.select.current_user_rls]. Be concise and practical.`;
}
