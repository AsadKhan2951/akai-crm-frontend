import { migrationPath } from "./helpers/backend";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(migrationPath("0039_delivery_dispatch_pod"), "utf8");
const hardening = fs.readFileSync(migrationPath("0040_delivery_cod_token_hardening"), "utf8");
const driverLines = fs.readFileSync(migrationPath("0041_delivery_driver_lines"), "utf8");
const pickingStatus = fs.readFileSync(migrationPath("0042_delivery_picking_order_status"), "utf8");
const driverRoute = fs.readFileSync("app/api/driver/[token]/stop/route.ts", "utf8");
const deliveryActions = fs.readFileSync("app/[locale]/(admin)/admin/delivery/actions.ts", "utf8");
const driverView = fs.readFileSync("app/[locale]/driver/[token]/DriverView.tsx", "utf8");

describe("Phase 18 delivery and dispatch", () => {
  it("creates the delivery, picking, POD, and token schema with query indexes", () => {
    for (const table of ["picking_lists", "picking_list_lines", "picking_list_order_lines", "delivery_runs", "delivery_stops", "delivery_stop_lines", "delivery_run_tokens"]) expect(migration).toContain(`public.${table}`);
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("delivery_stops_run_status_sequence_idx");
    expect(migration).toContain("delivery_stops_customer_status_idx");
    expect(migration).toContain("picking_list_lines_product_idx");
  });

  it("keeps delivery writes transactional and permission/token scoped", () => {
    expect(migration).toContain("public.has_permission(auth.uid(),'delivery.create_run')");
    expect(migration).toContain("complete_delivery_stop_by_token");
    expect(migration).toContain("record_delivery_cod_collection");
    expect(hardening).toContain("p_cod_amounts jsonb");
    expect(hardening).toContain("t.token_hash=p_token_hash");
    expect(hardening).toContain("valid_on=(now() AT TIME ZONE 'Asia/Karachi')::date");
    expect(pickingStatus).toContain("status='PICKED'");
    expect(pickingStatus).toContain("Only picked orders can be added to a delivery run.");
    expect(migration).toContain("ON CONFLICT(stop_id,order_line_id) DO UPDATE");
  });

  it("does not infer COD from the existing balance/credit payment method", () => {
    expect(hardening).toContain("p_cod_amounts ->> o.id::text");
    expect(hardening).not.toContain("payment_method='CREDIT'");
    expect(hardening).not.toContain("payment_method <> 'CREDIT'");
  });

  it("routes driver writes through strict validation before the token RPC", () => {
    expect(driverRoute.indexOf("get_delivery_run_by_token")).toBeLessThan(driverRoute.indexOf("request.json"));
    expect(driverRoute).toContain("payloadSchema.safeParse");
    expect(driverRoute).toContain("complete_delivery_stop_by_token");
    expect(driverRoute).toContain("z.number().finite().min(-90).max(90)");
    expect(driverLines).toContain("get_delivery_stop_lines_by_token");
  });

  it("keeps Admin actions permission-first and UI figures isolated", () => {
    expect(deliveryActions.indexOf('await requirePermission("delivery.create_run")')).toBeLessThan(deliveryActions.indexOf("const supabase ="));
    expect(deliveryActions).toContain("create_delivery_run");
    expect(deliveryActions).toContain("create_picking_list");
    expect(driverView).toContain("navigator.geolocation.getCurrentPosition");
    expect(driverView).toContain("<bdi>");
  });

  it("keeps English and Urdu delivery key trees aligned", () => {
    const en = JSON.parse(fs.readFileSync("messages/en.json", "utf8")) as { delivery: Record<string, string> };
    const ur = JSON.parse(fs.readFileSync("messages/ur.json", "utf8")) as { delivery: Record<string, string> };
    expect(Object.keys(en.delivery).sort()).toEqual(Object.keys(ur.delivery).sort());
  });
});
