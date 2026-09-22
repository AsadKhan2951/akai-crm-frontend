import "server-only";

import { getSystemSupabaseClient } from "./system-job";
import { resolveVisibleProducts, type VisibleProduct } from "@/lib/catalog/resolve-visible-products";
import { classifyWhatsAppIntent, normalizeWhatsAppText } from "@/lib/messaging/whatsapp-intent";
import type { SupabaseClient } from "@supabase/supabase-js";

type WhatsAppReplyLocale = "en" | "ur";
type CartItem = { productId: string; quantity: string; priceAtAdd: string; nameEn: string; nameUr: string; sku: string };
type CartState = { items: CartItem[]; lastResults: string[] };
type IncomingMessage = { id: string; from: string; timestamp?: string; type?: string; text?: { body?: string } };

type CustomerRow = {
  id: string;
  business_name: string;
  whatsapp_phone: string | null;
  assigned_agent_id: string | null;
};

function detectedLocale(text: string): WhatsAppReplyLocale {
  return /[\u0600-\u06ff]/u.test(text) ? "ur" : "en";
}

function messageFor(locale: WhatsAppReplyLocale, en: string, ur: string) {
  return locale === "ur" ? ur : en;
}

function jsonCart(value: unknown): CartState {
  if (!value || typeof value !== "object") return { items: [], lastResults: [] };
  const row = value as Partial<CartState>;
  return {
    items: Array.isArray(row.items) ? row.items.filter((item): item is CartItem => Boolean(item && typeof item === "object" && typeof (item as CartItem).productId === "string" && typeof (item as CartItem).quantity === "string")) : [],
    lastResults: Array.isArray(row.lastResults) ? row.lastResults.filter((id): id is string => typeof id === "string") : [],
  };
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function productMatches(products: VisibleProduct[], query: string) {
  const normalized = normalizeWhatsAppText(query);
  const terms = normalized.split(" ").filter((term) => term.length > 1);
  return products.filter((product) => {
    const haystack = normalizeWhatsAppText(`${product.sku} ${product.name_en} ${product.name_ur} ${product.description_en ?? ""} ${product.description_ur ?? ""}`);
    return terms.length === 0 || terms.every((term) => haystack.includes(term));
  }).slice(0, 5);
}

function formatProducts(products: VisibleProduct[], locale: WhatsAppReplyLocale) {
  return products.map((product, index) => {
    const name = locale === "ur" ? product.name_ur || product.name_en : product.name_en;
    const quote = product.is_quote_only ? messageFor(locale, "(quote required)", "(quote درکار ہے)") : `${product.price_pkr} PKR`;
    return `${index + 1}. ${name} · ${product.sku} · ${quote}`;
  }).join("\n");
}

function extractSearchQuery(text: string) {
  return text
    .replace(/\b(catalogue?|catalog|products?|items?|search|find|dikhaye|dikhao|dikhado|show|price|rate|batao|please|plz|ka|ki|ke|kya|hai|chahiye)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNaturalOrder(text: string) {
  const quantityMatch = text.match(/^(\d+)\s*(?:carton|cartons|box|boxes|pcs|pieces|piece|x)?\b/i);
  const quantity = quantityMatch?.[1] ?? "1";
  const query = text
    .replace(/^\d+\s*(?:carton|cartons|box|boxes|pcs|pieces|piece|x)?\b/i, " ")
    .replace(/\b(bhej do|bhejdy|bhej dein|mangwa do|mangva do|order kar do|order kr do|order karo|order|please|plz|ka|ki|ke|rate|price|kya hai|chahiye)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { quantity, query };
}

function extractAdd(text: string, lastResults: string[]) {
  const match = text.match(/(?:add|dal|cart|qty|quantity)?\s*(\d+)\s*(?:x|qty|quantity|pcs|piece)?\s*(\d+)?/i);
  if (!match) return null;
  const index = Number.parseInt(match[1], 10) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= lastResults.length) return null;
  const quantity = match[2] && /^[0-9]+$/.test(match[2]) ? match[2] : "1";
  return { productId: lastResults[index], quantity };
}

function claimTypeFor(text: string) {
  if (containsAny(text, ["short", "kam mila", "quantity missing"])) return "SHORT_SUPPLY";
  if (containsAny(text, ["wrong", "galat", "different item"])) return "WRONG_ITEM";
  if (containsAny(text, ["expired", "expiry"])) return "EXPIRED";
  if (containsAny(text, ["warranty", "repair"])) return "WARRANTY";
  if (containsAny(text, ["quality", "quality issue"])) return "QUALITY";
  return "DAMAGED";
}

async function isEnabled(supabase: SupabaseClient) {
  const { data } = await supabase.from("settings").select("value_json").eq("key", "whatsapp.assistant").maybeSingle();
  const value = data?.value_json as { enabled?: boolean } | null;
  return value?.enabled !== false;
}

async function queueReply(supabase: SupabaseClient, phone: string, body: string, locale: WhatsAppReplyLocale, customerId: string | null) {
  const { data: latestInbound } = await supabase.from("message_logs").select("sent_at").eq("thread_key", phone).eq("direction", "INBOUND").order("sent_at", { ascending: false }).limit(1).maybeSingle();
  const latestInboundAt = latestInbound?.sent_at ? new Date(latestInbound.sent_at).getTime() : Date.now();
  const outsideCustomerWindow = Date.now() - latestInboundAt > 24 * 60 * 60 * 1000;
  if (outsideCustomerWindow) {
    const { data: approvedTemplate } = await supabase.from("message_templates").select("key,provider_template_name,body").eq("channel", "WHATSAPP").eq("key", "whatsapp_session_reopen").eq("approval_status", "APPROVED").eq("is_active", true).maybeSingle();
    if (!approvedTemplate) return;
    body = approvedTemplate.body;
  }
  const { error } = await supabase.from("message_logs").insert({
    channel: "WHATSAPP", direction: "OUTBOUND", customer_id: customerId, to_address: phone,
    body, template_name: outsideCustomerWindow ? "whatsapp_session_reopen" : null, status: "QUEUED", provider: "meta", thread_key: phone, next_attempt_at: new Date().toISOString(),
    metadata_json: { assistant: true, locale, outsideCustomerWindow },
  });
  if (error) throw new Error("WhatsApp response could not be queued.");
}

async function notifyUser(supabase: SupabaseClient, userId: string, titleEn: string, titleUr: string, bodyEn: string, bodyUr: string, linkUrl: string) {
  await supabase.from("notifications").insert({ user_id: userId, type: "WHATSAPP_ASSISTANT", title_en: titleEn, title_ur: titleUr, body: bodyEn, body_en: bodyEn, body_ur: bodyUr, link_url: linkUrl });
}

async function notifyAdminFallback(supabase: SupabaseClient, bodyEn: string, bodyUr: string) {
  const { data: roles } = await supabase.from("roles").select("id").eq("portal_access", "ADMIN").eq("is_active", true).limit(1);
  const roleId = roles?.[0]?.id;
  if (!roleId) return;
  const { data: admins } = await supabase.from("users").select("id").eq("role_id", roleId).eq("is_active", true).limit(5);
  for (const admin of admins ?? []) await notifyUser(supabase, admin.id, "WhatsApp handoff needed", "WhatsApp handoff درکار ہے", bodyEn, bodyUr, "/en/admin/communications");
}

async function loadCustomer(supabase: SupabaseClient, phone: string) {
  const { data } = await supabase.from("customers").select("id,business_name,whatsapp_phone,assigned_agent_id").eq("whatsapp_phone", phone).eq("is_internal_account", false).neq("status", "BLOCKED").maybeSingle();
  return (data as CustomerRow | null) ?? null;
}

async function loadAgentUserId(supabase: SupabaseClient, agentId: string | null) {
  if (!agentId) return null;
  const { data } = await supabase.from("sales_agents").select("user_id").eq("id", agentId).maybeSingle();
  return (data?.user_id as string | null | undefined) ?? null;
}

async function upsertSession(supabase: SupabaseClient, phone: string, customerId: string | null, state: string, cart: CartState, handoffUserId: string | null) {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { error } = await supabase.from("whatsapp_sessions").upsert({ phone, customer_id: customerId, state, cart_json: cart, last_message_at: new Date().toISOString(), expires_at: expiresAt, handed_off_to_user_id: handoffUserId }, { onConflict: "phone" });
  if (error) throw new Error("WhatsApp session could not be saved.");
}

async function loadSession(supabase: SupabaseClient, phone: string) {
  const { data } = await supabase.from("whatsapp_sessions").select("customer_id,state,cart_json,last_message_at,expires_at,handed_off_to_user_id").eq("phone", phone).maybeSingle();
  return data as { customer_id: string | null; state: string; cart_json: unknown; last_message_at: string; expires_at: string; handed_off_to_user_id: string | null } | null;
}

async function loadSchemeBenefits(supabase: SupabaseClient, customerId: string, locale: WhatsAppReplyLocale) {
  const { data: customer } = await supabase.from("customers").select("vendor_group_id").eq("id", customerId).maybeSingle();
  const { data } = await supabase.from("schemes").select("name_en,name_ur,audience_type,scope_ids").eq("is_active", true).lte("starts_at", new Date().toISOString()).gt("ends_at", new Date().toISOString()).order("priority", { ascending: true }).limit(20);
  const groupId = customer?.vendor_group_id as string | null | undefined;
  return (data ?? []).filter((scheme) => {
    if (scheme.audience_type === "ALL") return true;
    const scopeIds = Array.isArray(scheme.scope_ids) ? scheme.scope_ids : [];
    return scopeIds.includes(customerId) || (groupId ? scopeIds.includes(groupId) : false);
  }).slice(0, 3).map((scheme) => locale === "ur" ? (scheme.name_ur || scheme.name_en) : scheme.name_en);
}

function cartSummary(cart: CartState, locale: WhatsAppReplyLocale, schemes: string[]) {
  const lines = cart.items.map((item, index) => `${index + 1}. ${locale === "ur" ? item.nameUr || item.nameEn : item.nameEn} · ${item.quantity} · ${item.priceAtAdd} PKR`).join("\n");
  const schemeText = schemes.length ? `\n${messageFor(locale, "Available scheme benefits:", "Available scheme benefits:")}\n${schemes.map((name) => `• ${name}`).join("\n")}` : "";
  return `${messageFor(locale, "Your cart:", "آپ کا cart:")}\n${lines}${schemeText}\n\n${messageFor(locale, "Reply YES to place this order, QUOTE for a quotation, or STOP for an agent.", "order place کرنے کے لیے YES، quotation کے لیے QUOTE، یا agent کے لیے STOP لکھیں۔")}`;
}

async function handleVerifiedMessage(supabase: SupabaseClient, customer: CustomerRow, phone: string, message: IncomingMessage) {
  const raw = message.type === "text" ? message.text?.body?.trim() ?? "" : "";
  const locale = detectedLocale(raw);
  const text = normalizeWhatsAppText(raw);
  const existing = await loadSession(supabase, phone);
  const existingCart = existing ? jsonCart(existing.cart_json) : { items: [], lastResults: [] };
  const expired = Boolean(existing && new Date(existing.expires_at).getTime() <= Date.now() && existingCart.items.length);
  const cart = existing && !expired ? existingCart : { items: [], lastResults: [] };
  const agentUserId = await loadAgentUserId(supabase, customer.assigned_agent_id);
  const intent = classifyWhatsAppIntent(text);

  if (expired) {
    await queueReply(supabase, phone, messageFor(locale, "Your previous WhatsApp cart expired after 30 minutes of inactivity, so it was discarded. Reply catalogue to start again.", "آپ کا پچھلا WhatsApp cart 30 منٹ inactivity کے بعد expire ہو کر discard ہو گیا ہے۔ دوبارہ شروع کرنے کے لیے catalogue لکھیں۔"), locale, customer.id);
  }

  if (intent === "STOP" || intent === "HUMAN" || existing?.state === "AWAITING_HUMAN") {
    await upsertSession(supabase, phone, customer.id, "AWAITING_HUMAN", cart, agentUserId);
    if (agentUserId) await notifyUser(supabase, agentUserId, "WhatsApp customer needs an agent", "WhatsApp customer کو agent درکار ہے", `${customer.business_name} requested an agent on WhatsApp.`, `${customer.business_name} نے WhatsApp پر agent مانگا ہے۔`, `/en/sales/customers/${customer.id}`);
    await queueReply(supabase, phone, messageFor(locale, "An AKAI agent will reply here. Automated ordering is paused for this conversation.", "AKAI agent آپ کو جواب دے گا۔ اس گفتگو میں automated ordering روک دی گئی ہے۔"), locale, customer.id);
    return;
  }

  if (intent === "GREETING") {
    await upsertSession(supabase, phone, customer.id, "IDLE", cart, null);
    await queueReply(supabase, phone, messageFor(locale, `Wa Alaikum Assalam ${customer.business_name}. Reply with catalogue, order status, balance, quote, claim, or agent.`, `وعلیکم السلام ${customer.business_name}۔ catalogue، order status، balance، quote، claim یا agent لکھیں۔`), locale, customer.id);
    return;
  }

  if (intent === "BALANCE") {
    const { data } = await supabase.from("customers").select("current_balance_pkr,credit_limit_pkr").eq("id", customer.id).maybeSingle();
    const balance = String(data?.current_balance_pkr ?? "0.00");
    const limit = String(data?.credit_limit_pkr ?? "0.00");
    await queueReply(supabase, phone, messageFor(locale, `Your current balance is ${balance} PKR. Credit limit: ${limit} PKR. For a ledger PDF, reply agent.`, `آپ کا موجودہ balance ${balance} PKR ہے۔ Credit limit: ${limit} PKR۔ ledger PDF کے لیے agent لکھیں۔`), locale, customer.id);
    await upsertSession(supabase, phone, customer.id, "IDLE", cart, null);
    return;
  }

  if (intent === "STATUS") {
    const { data } = await supabase.from("orders").select("order_number,status,placed_at").eq("customer_id", customer.id).order("placed_at", { ascending: false }).limit(3);
    const rows = (data ?? []).map((order) => `${order.order_number}: ${order.status}`).join("\n");
    await queueReply(supabase, phone, rows ? messageFor(locale, `Recent orders:\n${rows}`, `حالیہ orders:\n${rows}`) : messageFor(locale, "No orders found.", "کوئی order نہیں ملا۔"), locale, customer.id);
    await upsertSession(supabase, phone, customer.id, "IDLE", cart, null);
    return;
  }

  if (intent === "ORDER" && cart.items.length === 0) {
    const products = await resolveVisibleProducts(customer.id, supabase);
    const natural = extractNaturalOrder(text);
    const matches = productMatches(products, natural.query);
    if (matches.length === 1 && !matches[0].is_quote_only) {
      const product = matches[0];
      const nextCart: CartState = {
        items: [{ productId: product.id, quantity: natural.quantity, priceAtAdd: product.price_pkr, nameEn: product.name_en, nameUr: product.name_ur, sku: product.sku }],
        lastResults: [product.id],
      };
      const schemes = await loadSchemeBenefits(supabase, customer.id, locale);
      await upsertSession(supabase, phone, customer.id, "CONFIRMING", nextCart, null);
      await queueReply(supabase, phone, cartSummary(nextCart, locale, schemes), locale, customer.id);
      return;
    }
    if (matches.length > 1) {
      const nextCart = { ...cart, lastResults: matches.map((product) => product.id) };
      await upsertSession(supabase, phone, customer.id, "BROWSING", nextCart, null);
      await queueReply(supabase, phone, `${messageFor(locale, "I found more than one product. Reply with a number:", "ایک سے زیادہ products ملے ہیں۔ number reply کریں:")}\n${formatProducts(matches, locale)}`, locale, customer.id);
      return;
    }
    await queueReply(supabase, phone, messageFor(locale, "I could not identify the product. Reply catalogue with the product name or SKU.", "product سمجھ نہیں آیا۔ product name یا SKU کے ساتھ catalogue لکھیں۔"), locale, customer.id);
    return;
  }

  if (intent === "CATALOGUE" || (intent === "QUOTE" && cart.items.length === 0)) {
    const products = await resolveVisibleProducts(customer.id, supabase);
    const query = extractSearchQuery(text);
    const matches = productMatches(products, query);
    const shown = matches.length ? matches : products.slice(0, 5);
    const nextCart = { ...cart, lastResults: shown.map((product) => product.id) };
    const heading = intent === "QUOTE" ? messageFor(locale, "Select a product number and quantity, then reply quote.", "product number اور quantity لکھیں، پھر quote لکھیں۔") : messageFor(locale, "Visible products:", "آپ کے لیے available products:");
    await queueReply(supabase, phone, `${heading}\n${formatProducts(shown, locale)}\n\n${messageFor(locale, "Example: add 2 x 5 · order · quote · stop", "مثال: add 2 x 5 · order · quote · stop")}`, locale, customer.id);
    await upsertSession(supabase, phone, customer.id, "BROWSING", nextCart, null);
    return;
  }

  if (intent === "ADD") {
    const addition = extractAdd(text, cart.lastResults);
    if (!addition) {
      await queueReply(supabase, phone, messageFor(locale, "Reply like: add 2 x 5, using the number from the last catalogue list.", "اس طرح reply کریں: add 2 x 5، پچھلی catalogue list کا number استعمال کریں۔"), locale, customer.id);
      return;
    }
    const products = await resolveVisibleProducts(customer.id, supabase);
    const product = products.find((item) => item.id === addition.productId);
    if (!product) {
      await queueReply(supabase, phone, messageFor(locale, "That product is no longer visible. Reply catalogue to refresh the list.", "یہ product اب available نہیں۔ list تازہ کرنے کے لیے catalogue لکھیں۔"), locale, customer.id);
      return;
    }
    const item: CartItem = { productId: product.id, quantity: addition.quantity, priceAtAdd: product.price_pkr, nameEn: product.name_en, nameUr: product.name_ur, sku: product.sku };
    const nextItems = cart.items.filter((existingItem) => existingItem.productId !== item.productId).concat(item);
    const nextCart = { items: nextItems, lastResults: cart.lastResults };
    const schemes = await loadSchemeBenefits(supabase, customer.id, locale);
    await upsertSession(supabase, phone, customer.id, "CONFIRMING", nextCart, null);
    await queueReply(supabase, phone, cartSummary(nextCart, locale, schemes), locale, customer.id);
    return;
  }

  if (intent === "ORDER" || intent === "QUOTE" || intent === "CONFIRM") {
    if (!cart.items.length) {
      await queueReply(supabase, phone, messageFor(locale, "Your cart is empty. Reply catalogue first.", "آپ کا cart خالی ہے۔ پہلے catalogue لکھیں۔"), locale, customer.id);
      return;
    }
    if (intent === "ORDER") {
      const schemes = await loadSchemeBenefits(supabase, customer.id, locale);
      await upsertSession(supabase, phone, customer.id, "CONFIRMING", cart, null);
      await queueReply(supabase, phone, cartSummary(cart, locale, schemes), locale, customer.id);
      return;
    }
    if (intent === "CONFIRM" && existing?.state !== "CONFIRMING") {
      await queueReply(supabase, phone, messageFor(locale, "There is no order waiting for confirmation. Reply catalogue to start one.", "confirmation کے لیے کوئی pending order نہیں۔ نیا order شروع کرنے کے لیے catalogue لکھیں۔"), locale, customer.id);
      return;
    }
    const lines = cart.items.map((item) => ({ product_id: item.productId, quantity: item.quantity }));
    if (intent === "QUOTE") {
      const { data, error } = await supabase.rpc("create_whatsapp_quote", { p_customer_id: customer.id, p_phone: phone, p_requested_by_user_id: agentUserId, p_lines: lines, p_notes: "Requested through WhatsApp assistant" });
      if (error || !data?.[0]) {
        await queueReply(supabase, phone, messageFor(locale, "The quote request could not be created. An agent has been notified.", "quote request create نہیں ہو سکی۔ agent کو اطلاع دے دی گئی ہے۔"), locale, customer.id);
        if (agentUserId) await notifyUser(supabase, agentUserId, "WhatsApp quote request failed", "WhatsApp quote request ناکام", `${customer.business_name} needs help with a WhatsApp quote request.`, `${customer.business_name} کو WhatsApp quote request میں مدد چاہیے۔`, `/en/sales/customers/${customer.id}`);
        return;
      }
      await upsertSession(supabase, phone, customer.id, "IDLE", { items: [], lastResults: [] }, null);
      await queueReply(supabase, phone, messageFor(locale, `Quote request ${data[0].quote_number} was sent to your AKAI agent.`, `Quote request ${data[0].quote_number} آپ کے AKAI agent کو بھیج دی گئی ہے۔`), locale, customer.id);
      return;
    }
    const { data, error } = await supabase.rpc("create_whatsapp_order", { p_customer_id: customer.id, p_phone: phone, p_placed_by_user_id: agentUserId, p_lines: lines, p_notes: "Placed through WhatsApp assistant" });
    if (error) {
      const needsAgent = error.message.includes("ORDER_CEILING_REQUIRES_AGENT");
      await upsertSession(supabase, phone, customer.id, needsAgent ? "AWAITING_HUMAN" : "BUILDING_CART", cart, needsAgent ? agentUserId : null);
      await queueReply(supabase, phone, needsAgent ? messageFor(locale, "This order is above the WhatsApp limit. Your AKAI agent will confirm it.", "یہ order WhatsApp limit سے زیادہ ہے۔ آپ کا AKAI agent اسے confirm کرے گا۔") : messageFor(locale, "The order could not be placed. Reply agent for help or catalogue to refresh.", "order place نہیں ہو سکا۔ help کے لیے agent یا catalogue لکھیں۔"), locale, customer.id);
      if (needsAgent && agentUserId) await notifyUser(supabase, agentUserId, "WhatsApp order needs agent confirmation", "WhatsApp order کے لیے agent confirmation درکار ہے", `${customer.business_name} requested an order above the WhatsApp ceiling.`, `${customer.business_name} نے WhatsApp ceiling سے زیادہ order مانگا ہے۔`, `/en/sales/customers/${customer.id}`);
      return;
    }
    const row = data?.[0];
    await upsertSession(supabase, phone, customer.id, "IDLE", { items: [], lastResults: [] }, null);
    await queueReply(supabase, phone, messageFor(locale, `Order ${row.order_number} placed. Total: ${row.total_pkr} PKR.`, `Order ${row.order_number} place ہو گیا۔ Total: ${row.total_pkr} PKR۔`), locale, customer.id);
    if (agentUserId) await notifyUser(supabase, agentUserId, "WhatsApp order placed", "WhatsApp order place ہو گیا", `${customer.business_name} placed order ${row.order_number}.`, `${customer.business_name} نے order ${row.order_number} place کیا ہے۔`, `/en/sales/customers/${customer.id}`);
    return;
  }

  if (intent === "CLAIM") {
    const claimType = claimTypeFor(text);
    const description = raw.length >= 8 ? raw : "Customer reported an issue through WhatsApp.";
    const firstLine = cart.items[0];
    const { data, error } = await supabase.rpc("create_whatsapp_claim", { p_customer_id: customer.id, p_phone: phone, p_raised_by_user_id: agentUserId, p_order_id: null, p_claim_type: claimType, p_description: description, p_product_id: firstLine?.productId ?? null, p_quantity: firstLine?.quantity ?? null });
    await upsertSession(supabase, phone, customer.id, "IDLE", { items: [], lastResults: [] }, null);
    if (error || !data?.[0]) {
      await queueReply(supabase, phone, messageFor(locale, "I could not create the claim yet. Reply agent and share the order number and photos.", "claim ابھی create نہیں ہو سکی۔ agent لکھیں اور order number اور photos share کریں۔"), locale, customer.id);
      return;
    }
    await queueReply(supabase, phone, messageFor(locale, `Claim ${data[0].claim_number} was submitted. Your AKAI agent will review it.`, `Claim ${data[0].claim_number} submit ہو گئی ہے۔ آپ کا AKAI agent اسے review کرے گا۔`), locale, customer.id);
    if (agentUserId) await notifyUser(supabase, agentUserId, "WhatsApp claim submitted", "WhatsApp claim submit ہو گئی", `${customer.business_name} submitted claim ${data[0].claim_number}.`, `${customer.business_name} نے claim ${data[0].claim_number} submit کی ہے۔`, `/en/sales/customers/${customer.id}`);
    return;
  }

  await queueReply(supabase, phone, messageFor(locale, "I can help with catalogue, orders, quotes, balance, delivery status, or claims. Reply agent to speak to a person.", "میں catalogue، orders، quotes، balance، delivery status یا claims میں مدد کر سکتا ہوں۔ انسان سے بات کے لیے agent لکھیں۔"), locale, customer.id);
  await upsertSession(supabase, phone, customer.id, "IDLE", cart, null);
}

export async function handleIncomingWhatsAppMessage(message: IncomingMessage) {
  const supabase = getSystemSupabaseClient();
  const phone = `+${message.from.replace(/\D/g, "")}`;
  const raw = message.type === "text" ? message.text?.body?.trim() ?? "" : "";
  const customer = await loadCustomer(supabase, phone);
  const { error: inboundError } = await supabase.from("message_logs").insert({ channel: "WHATSAPP", direction: "INBOUND", customer_id: customer?.id ?? null, to_address: phone, sender_address: phone, body: raw || `[${message.type ?? "unknown"} WhatsApp message]`, status: "RECEIVED", provider: "meta", provider_message_id: message.id, thread_key: phone, external_event_id: `message:${message.id}`, sent_at: message.timestamp ? new Date(Number.parseInt(message.timestamp, 10) * 1000).toISOString() : new Date().toISOString() });
  if (inboundError?.code === "23505") return;
  if (inboundError) throw new Error("Inbound WhatsApp message could not be stored.");

  if (!customer) {
    await upsertSession(supabase, phone, null, "AWAITING_HUMAN", { items: [], lastResults: [] }, null);
    await notifyAdminFallback(supabase, `Unverified WhatsApp number ${phone} sent: ${raw || "non-text message"}`, `غیر verified WhatsApp number ${phone} نے message بھیجا: ${raw || "non-text message"}`);
    await queueReply(supabase, phone, "This WhatsApp number is not linked to an AKAI dealer account. An AKAI team member will contact you.", "en", null);
    return;
  }
  if (!(await isEnabled(supabase))) {
    await queueReply(supabase, phone, "WhatsApp ordering is temporarily paused. An AKAI agent will reply.", "en", customer.id);
    return;
  }
  await handleVerifiedMessage(supabase, customer, phone, message);
}
