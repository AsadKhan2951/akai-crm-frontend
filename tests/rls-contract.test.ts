import { migrationPath } from "./helpers/backend";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(migrationPath("0002_permission_access"), "utf8");
const businessMigration = readFileSync(migrationPath("0003_business_schema"), "utf8");
const priceListMigration = readFileSync(migrationPath("0006_versioned_price_lists"), "utf8");
const roleBuilderRoute = readFileSync(resolve(process.cwd(), "app/[locale]/(admin)/admin/settings/roles/page.tsx"), "utf8");
const visibleProductResolver = readFileSync(resolve(process.cwd(), "lib/catalog/resolve-visible-products.ts"), "utf8");
const visibilityMigration = readFileSync(migrationPath("0007_vendor_visibility_banners"), "utf8");
const purchaseSuggestionMigration = readFileSync(migrationPath("0008_vendor_purchase_suggestions"), "utf8");
const vendorSurface = readFileSync(resolve(process.cwd(), "lib/catalog/vendor-surface.ts"), "utf8");

describe("permission migration contract", () => {
  it("defines the required current-user security functions", () => {
    expect(migration).toMatch(/create or replace function public\.has_permission/);
    expect(migration).toMatch(/create or replace function public\.role_scope/);
    expect(migration).toMatch(/create or replace function public\.accessible_agent_ids/);
    expect(migration).toMatch(/create or replace function public\.user_permission_version/);
    expect(migration).toMatch(/create or replace function public\.permission_keys/);
  });

  it("defines owner-scope RLS policies and isolates sensitive cost and margin data", () => {
    expect(migration).toMatch(/create policy customers_select[\s\S]*role_scope\(auth\.uid\(\)\) = 'GLOBAL'/);
    expect(migration).toMatch(/create policy leads_select[\s\S]*accessible_agent_ids/);
    expect(migration).toMatch(/create policy product_costs_select[\s\S]*product\.view_cost/);
    expect(migration).toMatch(/create policy margin_snapshots_select[\s\S]*financials\.view_margin/);
  });

  it("defines dependency, privilege, Administrator survivor, audit, and revocation protections", () => {
    expect(migration).toMatch(/create trigger role_permissions_dependency/);
    expect(migration).toMatch(/create trigger role_permissions_revoke_dependents/);
    expect(migration).toMatch(/create trigger roles_privilege_boundary/);
    expect(migration).toMatch(/create trigger users_self_role_boundary/);
    expect(migration).toMatch(/create trigger roles_admin_survivor/);
    expect(migration).toMatch(/create trigger users_admin_survivor/);
    expect(migration).toMatch(/create trigger role_permissions_bump_version/);
    expect(migration).toMatch(/create trigger audit_role_permissions/);
  });

  it("protects role-permission inserts from privilege escalation", () => {
    expect(migration).toMatch(/target_permission_key[\s\S]*not public\.has_permission\(actor, target_permission_key\)/);
    expect(migration).toMatch(/role_permissions_insert[\s\S]*public\.has_permission\(auth\.uid\(\), 'role\.create'\) or public\.has_permission\(auth\.uid\(\), 'role\.update'\)/);
  });

  it("protects the role builder with a server-side not-found guard", () => {
    expect(roleBuilderRoute).toContain('requirePermission("role.create", { asNotFound: true })');
  });

  it("defines the business schema and owner-scoped policy contracts", () => {
    for (const table of ["area_codes", "vendor_groups", "vendor_accounts", "brands", "categories", "collections", "product_images", "product_collections", "price_lists", "price_list_items", "price_list_item_costs", "catalog_visibility_rules", "promo_banners", "promo_banner_audiences", "banner_events", "order_lines", "quote_lines", "ledger_entries", "loyalty_transactions", "rewards", "redemptions", "message_logs", "ai_conversations", "ai_messages", "ai_usage", "settings", "notifications"]) {
      expect(businessMigration).toMatch(new RegExp(`(?:create table|alter table) public\\.${table}`));
    }
    expect(businessMigration).toMatch(/create policy customers_business_read[\s\S]*accessible_agent_ids/);
    expect(businessMigration).toMatch(/create policy orders_business_read[\s\S]*accessible_agent_ids/);
    expect(businessMigration).toMatch(/create policy leads_business_read[\s\S]*accessible_agent_ids/);
    expect(businessMigration).toMatch(/create policy product_costs_read[\s\S]*product\.view_cost/);
    expect(businessMigration).toMatch(/create policy price_list_item_costs_read[\s\S]*product\.view_cost/);
    expect(businessMigration).toMatch(/create or replace function public\.resolve_visible_products/);
    expect(businessMigration).toMatch(/create or replace view public\.vendor_products[\s\S]*p\.price_pkr[\s\S]*p\.updated_at/);
    expect(visibleProductResolver).toContain("supabase.rpc(\"resolve_visible_products\"");
  });

  it("defines versioned pricing and historical-price contracts", () => {
    expect(priceListMigration).toContain("prevent_product_price_edit");
    expect(priceListMigration).toContain("Product price is managed by an active price list.");
    expect(priceListMigration).toContain("price_list_id uuid");
    expect(priceListMigration).toContain("prevent_order_line_price_change");
    expect(priceListMigration).toContain("Order line price is immutable after creation.");
    expect(priceListMigration).toContain("prevent_held_quote_price_change");
    expect(priceListMigration).toContain("Quoted price is held until the quote validity date.");
    expect(priceListMigration).toContain("effective_product_price");
    expect(priceListMigration).toContain("activate_due_price_lists");
    expect(priceListMigration).toContain("SUPERSEDED");
  });

  it("defines cart review gates, announcement queueing, and PDF regeneration contracts", () => {
    expect(priceListMigration).toContain("refresh_cart_prices");
    expect(priceListMigration).toContain("acknowledge_cart_price_changes");
    expect(priceListMigration).toContain("assert_cart_ready_for_checkout");
    expect(priceListMigration).toContain("Review the price changes in this cart before checkout.");
    expect(priceListMigration).toContain("create_price_announcement");
    expect(priceListMigration).toContain("queue_price_announcement");
    expect(priceListMigration).toContain("catalogue-pdfs");
  });

  it("defines most-specific vendor visibility, banner, cart, and preview contracts", () => {
    expect(visibilityMigration).toContain("create or replace function public.resolve_visible_products");
    expect(visibilityMigration).toMatch(/VENDOR.*PRODUCT[\s\S]*VENDOR.*BRAND[\s\S]*VENDOR.*CATEGORY[\s\S]*GROUP.*PRODUCT[\s\S]*GROUP.*BRAND[\s\S]*GROUP.*CATEGORY/);
    expect(visibilityMigration).toContain("resolve_visible_banners");
    expect(visibilityMigration).toContain("remove_invisible_cart_lines");
    expect(visibilityMigration).toContain("visible_product_count_for_scope");
    expect(visibilityMigration).toContain("preview_visible_products");
    expect(visibilityMigration).toContain("banner_performance");
    expect(visibilityMigration).toContain("coalesce(nullif(metadata->>'size', ''), '0')::bigint <= case when bucket_id = 'banner-images' then 2097152");
    expect(vendorSurface).toContain("resolveVisibleProducts(customerId)");
  });

  it("defines purchase-history suggestion as SQL-only and non-mutating", () => {
    expect(purchaseSuggestionMigration).toContain("create or replace function public.vendor_purchase_category_suggestion");
    expect(purchaseSuggestionMigration).toContain("group by c.id, c.name_en, c.name_ur");
    expect(purchaseSuggestionMigration).toContain("limit 2");
    expect(purchaseSuggestionMigration).toContain("catalogvisibility.manage");
    expect(purchaseSuggestionMigration).not.toContain("insert into public.catalog_visibility_rules");
    expect(purchaseSuggestionMigration).not.toContain("update public.catalog_visibility_rules");
  });

  it("enables RLS across the authorization and owner-scoped tables", () => {
    for (const table of ["users", "roles", "permissions", "role_permissions", "sales_agents", "products", "product_costs", "customers", "orders", "quotes", "revenue_snapshots", "margin_snapshots", "leads", "activities", "follow_ups", "collections", "claims", "beat_visits"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
  });
});
