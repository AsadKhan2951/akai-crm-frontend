import { migrationPath } from "./helpers/backend";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const salesManifest = fs.readFileSync("app/[locale]/manifest.ts", "utf8");
const vendorManifest = fs.readFileSync("app/[locale]/vendor/manifest.ts", "utf8");
const worker = fs.readFileSync("public/sw.js", "utf8");
const queue = fs.readFileSync("lib/pwa/offline-queue.ts", "utf8");
const readCache = fs.readFileSync("lib/pwa/read-cache.ts", "utf8");
const syncRoute = fs.readFileSync("app/api/pwa/sync/route.ts", "utf8");
const syncMigration = fs.readFileSync(migrationPath("0028_pwa_offline_sync"), "utf8");
const shell = fs.readFileSync("components/PortalShell.tsx", "utf8");
const pwaClient = fs.readFileSync("components/pwa/PWAClient.tsx", "utf8");
const activityForm = fs.readFileSync("app/[locale]/(sales)/sales/activity/ActivityForm.tsx", "utf8");
const recoveryView = fs.readFileSync("app/[locale]/(sales)/sales/recovery/RecoveryView.tsx", "utf8");
const orderView = fs.readFileSync("app/[locale]/(sales)/sales/orders/new/OrderOnBehalf.tsx", "utf8");
const en = JSON.parse(fs.readFileSync("messages/en.json", "utf8")) as { pwa: Record<string, string>; portal: Record<string, string> };
const ur = JSON.parse(fs.readFileSync("messages/ur.json", "utf8")) as { pwa: Record<string, string>; portal: Record<string, string> };

describe("Phase 14 PWA and mobile contracts", () => {
  it("defines separate install scopes and required AKAI icons", () => {
    expect(salesManifest).toContain('start_url: `/${safeLocale}/sales`');
    expect(salesManifest).toContain('scope: `/${safeLocale}/sales/`');
    expect(vendorManifest).toContain('start_url: `/${safeLocale}/vendor`');
    expect(vendorManifest).toContain('scope: `/${safeLocale}/vendor/`');
    for (const source of [salesManifest, vendorManifest]) {
      expect(source).toContain("akai-icon-192.png");
      expect(source).toContain("akai-icon-512.png");
      expect(source).toContain("akai-icon-maskable-512.png");
      expect(source).toContain('theme_color: "#16233F"');
      expect(source).toContain('display: "standalone"');
    }
  });

  it("preserves push notifications while implementing user-scoped caching and offline fallback", () => {
    expect(worker).toContain("self.addEventListener(\"push\"");
    expect(worker).toContain("self.addEventListener(\"notificationclick\"");
    expect(worker).toContain("SET_USER_SCOPE");
    expect(worker).toContain("CLEAR_USER_SCOPE");
    expect(worker).toContain("networkFirst");
    expect(worker).toContain("cacheFirst");
    expect(worker).toContain("/en/offline");
    expect(worker).toContain("/ur/offline");
    expect(worker).toContain("API_CACHE_PREFIX");
  });

  it("queues writes in IndexedDB and syncs with an idempotency key", () => {
    expect(queue).toContain("indexedDB.open");
    expect(queue).toContain("idempotencyKey");
    expect(queue).toContain("last-write-wins");
    expect(syncRoute.indexOf('await requirePermission("pwa.sync")')).toBeLessThan(syncRoute.indexOf("request.json"));
    expect(syncRoute).toContain("process_offline_operation");
    expect(syncMigration).toContain("offline_sync_receipts");
    expect(syncMigration).toContain("p_idempotency_key");
    expect(syncMigration).toContain("create_sales_order_for_customer");
    expect(syncMigration).toContain("record_payment_collection");
    expect(readCache).toContain("cacheOfflineRead");
    expect(readCache).toContain("const cacheKey = `${userId}:${key}`");
  });

  it("queues Sales activity while offline and preserves the online server action", () => {
    expect(activityForm).toContain("navigator.onLine");
    expect(activityForm).toContain('enqueueOfflineOperation(auth.user.id, "activity"');
    expect(activityForm).toContain("logSalesActivity");
    expect(recoveryView).toContain('enqueueOfflineOperation(auth.user.id, "collection"');
    expect(recoveryView).toContain("recordRecoveryCollection");
    expect(orderView).toContain('enqueueOfflineOperation(auth.user.id, "salesOrder"');
    expect(orderView).toContain("createSalesOrderOnBehalf");
    expect(pwaClient).toContain("registerOfflineExecutor");
    expect(pwaClient).toContain("/api/pwa/sync");
  });

  it("provides five-item mobile navigation for Sales and Vendor and keeps locale keys parallel", () => {
    expect(shell).toContain("mobileNav");
    expect(shell).toContain('portal !== "admin"');
    for (const key of ["mobileToday", "mobileLeads", "mobileCustomers", "mobileOrders", "mobileMore", "mobileHome", "mobileCatalogue", "mobileCart", "mobileVendorOrders"]) {
      expect(en.portal[key]).toBeTruthy();
      expect(ur.portal[key]).toBeTruthy();
    }
    expect(Object.keys(en.pwa).sort()).toEqual(Object.keys(ur.pwa).sort());
  });
});
