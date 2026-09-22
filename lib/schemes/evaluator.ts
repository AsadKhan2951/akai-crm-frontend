import Decimal from "decimal.js";

export type SchemeProduct = {
  id: string;
  categoryId: string;
  brandId: string | null;
  collectionIds: string[];
  unitPricePKR: string;
  stockQuantity: string;
  loyaltyPointsPerUnit: number;
};

export type SchemeCartLine = {
  product: SchemeProduct;
  quantity: string;
  isFreeItem?: boolean;
};

export type SchemeTierInput = {
  id: string;
  minQuantity: string | null;
  minValuePKR: string | null;
  freeProductId: string | null;
  freeQuantity: string | null;
  discountPercent: string | null;
  discountAmountPKR: string | null;
  displayOrder: number;
};

export type SchemeInput = {
  id: string;
  schemeType: "QUANTITY_FREE" | "SLAB_DISCOUNT" | "BUNDLE" | "CATEGORY_TARGET" | "FLAT_DISCOUNT";
  scopeType: "PRODUCT" | "CATEGORY" | "BRAND" | "COLLECTION" | "ORDER_VALUE";
  scopeIds: string[];
  priority: number;
  isStackable: boolean;
  budgetPKR: string | null;
  consumedPKR: string;
  maxRedemptionsPerVendor: number | null;
  currentVendorRedemptions: number;
  tiers: SchemeTierInput[];
};

export type SchemeBenefit = {
  schemeId: string;
  tierId: string;
  benefitType: "FREE_ITEM" | "DISCOUNT_PERCENT" | "DISCOUNT_AMOUNT";
  benefitValuePKR: string;
  freeProductId: string | null;
  freeQuantity: string | null;
  eligible: true;
  priority: number;
  isStackable: boolean;
};

export type SchemeEvaluation = {
  benefits: SchemeBenefit[];
  nearlyUnlocked: Array<{ schemeId: string; addQuantity: string; messageKey: "quantity" | "value" }>;
  skipped: Array<{ schemeId: string; reason: "budget" | "vendor_cap" | "free_stock" | "not_eligible" | "no_benefit" }>;
};

const decimal = (value: string | null | undefined) => new Decimal(value ?? "0");
const money = (value: Decimal) => value.toDecimalPlaces(2).toFixed(2);
const minimum = (left: Decimal, right: Decimal) => left.lte(right) ? left : right;

function lineMatchesScope(line: SchemeCartLine, scheme: SchemeInput) {
  if (scheme.scopeType === "ORDER_VALUE") return true;
  if (scheme.scopeType === "PRODUCT") return scheme.scopeIds.includes(line.product.id);
  if (scheme.scopeType === "CATEGORY") return scheme.scopeIds.includes(line.product.categoryId);
  if (scheme.scopeType === "BRAND") return line.product.brandId !== null && scheme.scopeIds.includes(line.product.brandId);
  return line.product.collectionIds.some((id) => scheme.scopeIds.includes(id));
}

function rankTier(tier: SchemeTierInput) {
  return decimal(tier.minQuantity ?? tier.minValuePKR ?? "0");
}

function bestEligibleTier(scheme: SchemeInput, quantity: Decimal, value: Decimal) {
  return scheme.tiers
    .filter((tier) => (tier.minQuantity === null || quantity.gte(decimal(tier.minQuantity))) && (tier.minValuePKR === null || value.gte(decimal(tier.minValuePKR))))
    .sort((left, right) => {
      const threshold = rankTier(right).cmp(rankTier(left));
      return threshold || left.displayOrder - right.displayOrder || left.id.localeCompare(right.id);
    })[0] ?? null;
}

function benefitFor(scheme: SchemeInput, tier: SchemeTierInput, matchingValue: Decimal, products: Map<string, SchemeProduct>): SchemeBenefit | null {
  if (tier.freeProductId && tier.freeQuantity) {
    const freeProduct = products.get(tier.freeProductId);
    if (!freeProduct || decimal(freeProduct.stockQuantity).lt(decimal(tier.freeQuantity))) return null;
    return {
      schemeId: scheme.id,
      tierId: tier.id,
      benefitType: "FREE_ITEM",
      benefitValuePKR: money(decimal(freeProduct.unitPricePKR).mul(decimal(tier.freeQuantity))),
      freeProductId: tier.freeProductId,
      freeQuantity: tier.freeQuantity,
      eligible: true,
      priority: scheme.priority,
      isStackable: scheme.isStackable,
    };
  }
  if (tier.discountPercent) {
    return {
      schemeId: scheme.id,
      tierId: tier.id,
      benefitType: "DISCOUNT_PERCENT",
      benefitValuePKR: money(minimum(matchingValue.mul(decimal(tier.discountPercent)).div(100), matchingValue)),
      freeProductId: null,
      freeQuantity: null,
      eligible: true,
      priority: scheme.priority,
      isStackable: scheme.isStackable,
    };
  }
  if (tier.discountAmountPKR) {
    return {
      schemeId: scheme.id,
      tierId: tier.id,
      benefitType: "DISCOUNT_AMOUNT",
      benefitValuePKR: money(minimum(decimal(tier.discountAmountPKR), matchingValue)),
      freeProductId: null,
      freeQuantity: null,
      eligible: true,
      priority: scheme.priority,
      isStackable: scheme.isStackable,
    };
  }
  return null;
}

export function evaluateTradeSchemes(schemes: SchemeInput[], cart: SchemeCartLine[], catalogueProducts: SchemeProduct[] = []): SchemeEvaluation {
  const products = new Map([...catalogueProducts, ...cart.map((line) => line.product)].map((product) => [product.id, product]));
  const candidates: SchemeBenefit[] = [];
  const skipped: SchemeEvaluation["skipped"] = [];
  const nearlyUnlocked: SchemeEvaluation["nearlyUnlocked"] = [];

  for (const scheme of schemes) {
    const scopedLines = cart.filter((line) => !line.isFreeItem && lineMatchesScope(line, scheme));
    const matchingQuantity = scopedLines.reduce((total, line) => total.add(decimal(line.quantity)), new Decimal(0));
    const matchingValue = scopedLines.reduce((total, line) => total.add(decimal(line.quantity).mul(decimal(line.product.unitPricePKR))), new Decimal(0));
    const tier = bestEligibleTier(scheme, matchingQuantity, matchingValue);
    if (!tier) {
      const nextTier = scheme.tiers
        .filter((candidate) => candidate.minQuantity !== null && decimal(candidate.minQuantity).gt(matchingQuantity))
        .sort((left, right) => decimal(left.minQuantity).cmp(decimal(right.minQuantity)))[0];
      if (nextTier?.minQuantity) nearlyUnlocked.push({ schemeId: scheme.id, addQuantity: decimal(nextTier.minQuantity).sub(matchingQuantity).toFixed(3), messageKey: "quantity" });
      else skipped.push({ schemeId: scheme.id, reason: "not_eligible" });
      continue;
    }
    const benefit = benefitFor(scheme, tier, matchingValue, products);
    if (!benefit) {
      skipped.push({ schemeId: scheme.id, reason: tier.freeProductId ? "free_stock" : "no_benefit" });
      continue;
    }
    if (scheme.maxRedemptionsPerVendor !== null && scheme.currentVendorRedemptions >= scheme.maxRedemptionsPerVendor) {
      skipped.push({ schemeId: scheme.id, reason: "vendor_cap" });
      continue;
    }
    if (scheme.budgetPKR !== null && decimal(scheme.consumedPKR).add(decimal(benefit.benefitValuePKR)).gt(decimal(scheme.budgetPKR))) {
      skipped.push({ schemeId: scheme.id, reason: "budget" });
      continue;
    }
    candidates.push(benefit);
  }

  const stackable = candidates.filter((benefit) => benefit.isStackable);
  const nonStackable = candidates.filter((benefit) => !benefit.isStackable).sort((left, right) => left.priority - right.priority || decimal(right.benefitValuePKR).cmp(decimal(left.benefitValuePKR)) || left.schemeId.localeCompare(right.schemeId));
  const benefits = nonStackable.length > 0 ? [...stackable, nonStackable[0]] : stackable;
  return { benefits, nearlyUnlocked, skipped };
}

export function calculatePaidLoyaltyPoints(cart: SchemeCartLine[]) {
  return cart.reduce((total, line) => line.isFreeItem ? total : total + Math.floor(Number(decimal(line.quantity).mul(line.product.loyaltyPointsPerUnit).toString())), 0);
}
