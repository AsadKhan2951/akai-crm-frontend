export const PERMISSION_KEYS = [
  "product.view", "product.create", "product.update", "product.delete", "product.bulk_import", "product.view_cost", "product.manage_images",
  "category.view", "category.create", "category.update", "category.delete", "brand.view", "brand.create", "brand.update", "brand.delete", "collection.view", "collection.manage", "pricelist.view", "pricelist.create", "pricelist.activate",
  "customer.view", "customer.create", "customer.update", "customer.delete", "customer.reassign_agent", "customer.export", "customer.enrich", "vendorgroup.manage", "catalogvisibility.manage", "vendoraccount.create", "vendoraccount.deactivate",
  "lead.view", "lead.create", "lead.update", "lead.delete", "lead.import", "lead.reassign", "activity.view", "activity.create", "activity.delete", "followup.view", "followup.manage", "beat.view", "beat.manage", "beat.visit",
  "order.view", "order.create", "order.update_status", "order.approve", "order.cancel", "order.export", "quote.view", "quote.create", "quote.price", "quote.cancel",
  "ledger.view", "ledger.record_payment", "ledger.adjust", "collection.view", "collection.record", "collection.deposit", "collection.verify_deposit", "collection.cancel", "collection.reminder", "recoverytarget.manage", "creditlimit.manage", "financials.view_revenue", "financials.view_margin",
  "banner.view", "banner.manage", "scheme.view", "scheme.create", "scheme.activate", "scheme.analytics", "reward.manage", "loyalty.view", "redemption.request", "redemption.approve", "loyalty.adjust", "delivery.view", "delivery.create_run", "delivery.mark_delivered", "delivery.reconcile",
  "claim.view", "claim.create", "claim.review", "claim.approve", "warranty.manage", "dashboard.view", "report.build", "report.schedule", "report.export",
  "message.send", "message.campaign", "whatsapp.manage_templates", "whatsapp.kill_switch", "notification.view", "ai.chat", "ai.analytics", "ai.generate_content", "ai.manage_budget", "voice.capture", "voice.view", "pwa.sync", "delivery.view", "delivery.create_run", "delivery.mark_delivered", "delivery.reconcile",
  "user.view", "user.create", "user.update", "user.deactivate", "role.view", "role.create", "role.update", "role.delete", "settings.manage", "auditlog.view", "integration.manage", "impersonate.vendor",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type DataScope = "GLOBAL" | "TEAM" | "OWN" | "SELF";

export const SENSITIVE_PERMISSION_KEYS = new Set<PermissionKey>([
  "product.view_cost", "financials.view_margin", "pricelist.activate", "ledger.adjust", "loyalty.adjust", "collection.cancel", "customer.export", "role.create", "role.update", "user.create", "settings.manage", "impersonate.vendor", "whatsapp.kill_switch",
]);

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}
