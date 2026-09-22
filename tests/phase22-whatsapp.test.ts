import { migrationPath } from "./helpers/backend";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyWhatsAppIntent, normalizeWhatsAppText } from "../lib/messaging/whatsapp-intent";

const engine = fs.readFileSync("lib/admin/whatsapp-assistant-system-job.ts", "utf8");
const migration = fs.readFileSync(migrationPath("0053_whatsapp_ordering_assistant"), "utf8");
const hardening = fs.readFileSync(migrationPath("0055_whatsapp_order_transaction_hardening"), "utf8");
const ceiling = fs.readFileSync(migrationPath("0056_whatsapp_order_ceiling"), "utf8");

const variations: Array<[string, string]> = [
  ["salam", "GREETING"], ["AOA bhai", "GREETING"], ["hello", "GREETING"], ["catalogue dikhao", "CATALOGUE"],
  ["CASTA microfibre ka rate kya hai", "QUOTE"], ["fog light DLAA ka bhav", "QUOTE"], ["price batao", "QUOTE"], ["products list", "CATALOGUE"],
  ["add 2 x 5", "ADD"], ["cart mein 1", "ADD"], ["2 quantity dal do", "ADD"], ["2 carton microfibre CASTA bhej do", "ORDER"],
  ["order kar do", "ORDER"], ["mangwa do", "ORDER"], ["place order", "ORDER"], ["yes", "CONFIRM"], ["haan ji", "CONFIRM"],
  ["theek hai kar do", "CONFIRM"], ["confirm", "CONFIRM"], ["order status", "STATUS"], ["mera order kahan hai", "STATUS"],
  ["delivery kab", "STATUS"], ["balance batao", "BALANCE"], ["mera udhaar", "BALANCE"], ["khata dikhao", "BALANCE"],
  ["claim damaged item", "CLAIM"], ["maal kam mila", "CLAIM"], ["warranty masla", "CLAIM"], ["agent se baat karni hai", "STOP"], ["band karo", "STOP"],
];

describe("Phase 22 WhatsApp ordering", () => {
  it.each(variations)("classifies %s", (message, expected) => {
    expect(classifyWhatsAppIntent(normalizeWhatsAppText(message))).toBe(expected);
  });

  it("requires explicit confirmation before the transactional order RPC", () => {
    expect(engine).toContain('if (intent === "CONFIRM" && existing?.state !== "CONFIRMING")');
    expect(engine).toContain('create_whatsapp_order');
    expect(engine).toContain('if (intent === "ORDER")');
    expect(engine).toContain('upsertSession(supabase, phone, customer.id, "CONFIRMING"');
  });

  it("limits WhatsApp ambiguity lists to five and uses the visible resolver", () => {
    expect(engine).toContain(".slice(0, 5)");
    expect(engine).toContain("resolveVisibleProducts(customer.id, supabase)");
  });

  it("has the required kill switch, expiry, and system transaction boundaries", () => {
    expect(migration).toContain("set_whatsapp_kill_switch");
    expect(migration).toContain("expires_at");
    expect(migration).toContain("create_whatsapp_order");
    expect(migration).toContain("placed_via");
    expect(hardening).toContain("stock_quantity = stock_quantity - line.quantity");
    expect(hardening).toContain("apply_trade_scheme_to_order");
    expect(ceiling).toContain("set_whatsapp_order_ceiling");
  });
});
