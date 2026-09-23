"""Adds the vendorPortal namespace used by the rebuilt Vendor pages. Existing keys win; safe to rerun."""
import json
from pathlib import Path

EN = {
    "welcome": "Welcome, {name}",
    "addedToCart": "Added to cart.",
    "addError": "The product could not be added. It may no longer be available. Try again.",
    "adding": "Adding…",
    "myQuotes": "My quotes",
    "offers": "Offers",
    "timesOrdered": "Ordered {count} times",
    "browseCatalogue": "Browse catalogue",
    "backToCatalogue": "Back to catalogue",
    "resultsCount": "Showing {shown} of {total} products",
    "quoteOnlyBadge": "Price on request",
    "noDescription": "No description yet.",
    "productNotFound": "Product not available",
    "productNotFoundHint": "This product is not in your catalogue. Browse the catalogue to find a similar product.",
    "continueShopping": "Continue shopping",
    "priceChangedTitle": "Some prices have changed",
    "priceChangedHint": "A new price list is active. Accept the new prices before placing the order.",
    "acceptPrices": "Accept new prices",
    "updateQuantity": "Update",
    "removeLine": "Remove",
    "checkoutTitle": "Checkout",
    "creditLimit": "Credit limit",
    "currentBalance": "Current balance",
    "pointsAvailable": "You have {points} points.",
    "quoteOnlyInCart": "Your cart has a price-on-request product. Request a quote for this cart instead of placing an order.",
    "quoteHint": "Need a special price? Request a quote for everything in this cart.",
    "quoteNotesPlaceholder": "Tell your Sales Agent what you need (optional)",
    "search": "Search",
    "searchOrders": "Search by order number",
    "product": "Product",
    "unitPrice": "Unit price",
    "lineTotal": "Line total",
    "discount": "Discount",
    "freeItem": "Free",
    "total": "Total",
    "rejectionReason": "Reason",
    "quoteNotFound": "Quote not found",
    "quoteNotFoundHint": "This quote is not available for your account.",
    "yourNotes": "Your notes",
    "waitingForPrice": "Waiting for price",
    "viewOrder": "View order",
    "orderStatus": {"DRAFT": "Draft", "PENDING_APPROVAL": "Waiting for approval", "PLACED": "Placed", "CONFIRMED": "Confirmed", "PICKED": "Packed", "DISPATCHED": "Dispatched", "DELIVERED": "Delivered", "CANCELLED": "Cancelled"},
    "quoteStatus": {"REQUESTED": "Requested", "IN_REVIEW": "In review", "QUOTED": "Price ready", "ACCEPTED": "Accepted", "REJECTED": "Declined", "EXPIRED": "Expired", "CONVERTED": "Ordered"},
    "ledgerType": {"INVOICE": "Invoice", "PAYMENT": "Payment", "CREDIT_NOTE": "Credit note", "ADJUSTMENT": "Adjustment"},
    "paymentMethod": {"BALANCE": "Balance", "CREDIT": "Credit"},
}

UR = {
    "welcome": "خوش آمدید، {name}",
    "addedToCart": "Cart میں شامل ہو گیا۔",
    "addError": "Product شامل نہیں ہو سکا۔ ہو سکتا ہے اب دستیاب نہ ہو۔ دوبارہ کوشش کریں۔",
    "adding": "شامل ہو رہا ہے…",
    "myQuotes": "میرے quotes",
    "offers": "Offers",
    "timesOrdered": "{count} بار order کیا",
    "browseCatalogue": "Catalogue دیکھیں",
    "backToCatalogue": "Catalogue پر واپس",
    "resultsCount": "{total} میں سے {shown} products",
    "quoteOnlyBadge": "قیمت درخواست پر",
    "noDescription": "ابھی تفصیل موجود نہیں۔",
    "productNotFound": "Product دستیاب نہیں",
    "productNotFoundHint": "یہ product آپ کے catalogue میں نہیں۔ ملتا جلتا product catalogue میں تلاش کریں۔",
    "continueShopping": "مزید خریداری",
    "priceChangedTitle": "کچھ قیمتیں بدل گئی ہیں",
    "priceChangedHint": "نئی price list لاگو ہو گئی ہے۔ Order دینے سے پہلے نئی قیمتیں قبول کریں۔",
    "acceptPrices": "نئی قیمتیں قبول کریں",
    "updateQuantity": "Update",
    "removeLine": "ہٹائیں",
    "checkoutTitle": "Checkout",
    "creditLimit": "Credit limit",
    "currentBalance": "موجودہ balance",
    "pointsAvailable": "آپ کے پاس {points} points ہیں۔",
    "quoteOnlyInCart": "آپ کے cart میں قیمت درخواست پر والا product ہے۔ Order کے بجائے اس cart کا quote منگوائیں۔",
    "quoteHint": "خاص قیمت چاہیے؟ پورے cart کا quote منگوائیں۔",
    "quoteNotesPlaceholder": "Sales Agent کو بتائیں آپ کو کیا چاہیے (اختیاری)",
    "search": "تلاش",
    "searchOrders": "Order number سے تلاش کریں",
    "product": "Product",
    "unitPrice": "فی یونٹ قیمت",
    "lineTotal": "کل رقم",
    "discount": "رعایت",
    "freeItem": "مفت",
    "total": "کل",
    "rejectionReason": "وجہ",
    "quoteNotFound": "Quote نہیں ملا",
    "quoteNotFoundHint": "یہ quote آپ کے account کے لیے دستیاب نہیں۔",
    "yourNotes": "آپ کے notes",
    "waitingForPrice": "قیمت کا انتظار",
    "viewOrder": "Order دیکھیں",
    "orderStatus": {"DRAFT": "Draft", "PENDING_APPROVAL": "Approval کا انتظار", "PLACED": "Order ہو گیا", "CONFIRMED": "Confirm", "PICKED": "Pack ہو گیا", "DISPATCHED": "روانہ", "DELIVERED": "Delivered", "CANCELLED": "منسوخ"},
    "quoteStatus": {"REQUESTED": "درخواست بھیجی", "IN_REVIEW": "زیرِ غور", "QUOTED": "قیمت تیار", "ACCEPTED": "قبول", "REJECTED": "مسترد", "EXPIRED": "میعاد ختم", "CONVERTED": "Order بن گیا"},
    "ledgerType": {"INVOICE": "Invoice", "PAYMENT": "Payment", "CREDIT_NOTE": "Credit note", "ADJUSTMENT": "Adjustment"},
    "paymentMethod": {"BALANCE": "Balance", "CREDIT": "Credit"},
}


def fill(target: dict, source: dict) -> int:
    added = 0
    for key, value in source.items():
        if isinstance(value, dict):
            target.setdefault(key, {})
            added += fill(target[key], value)
        elif key not in target:
            target[key] = value
            added += 1
    return added


for locale, values in (("en", EN), ("ur", UR)):
    path = Path("messages") / f"{locale}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    added = fill(data.setdefault("vendorPortal", {}), values)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{locale}: vendorPortal +{added}")
