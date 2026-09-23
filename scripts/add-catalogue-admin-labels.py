"""Adds the catalogueAdmin namespace used by the rebuilt Admin catalogue screens. Existing keys win; safe to rerun."""
import json
from pathlib import Path

EN = {
    "restrictedByDefault": "Hidden until allowed",
    "ruleMode": {"ALLOW": "Allowed", "DENY": "Hidden"},
    "ruleInherited": "Follows the broader rule",
    "deny": "Hide",
    "currentOverrides": "Current product overrides",
    "chooseScope": "Choose a VendorGroup or vendor",
    "scopeHint": "A rule for a single vendor beats its VendorGroup rule. A product rule beats brand and category rules.",
    "linkTarget": "Link target (product, category, brand or collection)",
    "multiSelectHint": "Hold Ctrl (or Cmd) to choose more than one vendor.",
    "gettingStarted": "Start here: 1) create categories, 2) create brands, 3) add products, 4) create and activate a price list.",
    "searchByName": "Search by name",
    "search": "Search",
    "open": "Open",
    "add": "Add",
    "status": "Status",
    "allStatuses": "All statuses",
    "description": "Description",
    "displayOrder": "Display order",
    "slugHint": "Leave blank to create it from the English name",
    "chooseCollection": "Choose a collection",
    "basics": "Product details",
    "pricingStock": "Price and stock",
    "priceViaPriceList": "To change this price, add it to a DRAFT price list, approve it, then activate it.",
    "needCategoryFirst": "Create at least one category before adding products.",
    "pagination": "Pages",
    "previous": "Previous",
    "next": "Next",
    "pageOf": "Page {page} of {pages} · {total} products",
    "deleted": "Deleted.",
    "approved": "Price list approved. Activate it now or it will activate automatically on its effective date.",
    "rejected": "Price list rejected.",
    "activated": "Price list is now active. Product prices and open carts were updated.",
    "priceListHowTo": "How prices change: create a DRAFT (copies current prices) → edit the prices → approve → activate. Old orders keep their original prices.",
    "addProductToList": "Add a product to this list",
    "reject": "Reject",
    "rejectReason": "Reason for rejecting",
    "noItems": "No products in this price list",
    "noItemsHint": "Add products above, or create a new list with “Clone active list” ticked.",
    "scheduledHint": "This list is approved. It will activate automatically at its effective time, or you can activate it now.",
    "approvalHint": "Prices can be edited while the list is a DRAFT. An approver must approve it before activation.",
    "listStatus": {"DRAFT": "Draft", "SCHEDULED": "Scheduled", "ACTIVE": "Active", "SUPERSEDED": "Superseded"},
    "approvalStatus": {"NOT_REQUIRED": "No approval needed", "PENDING": "Waiting for approval", "APPROVED": "Approved", "REJECTED": "Rejected"},
}

UR = {
    "restrictedByDefault": "Allow کرنے تک چھپا",
    "ruleMode": {"ALLOW": "دکھایا جائے", "DENY": "چھپایا گیا"},
    "ruleInherited": "بڑے rule کے مطابق",
    "deny": "چھپائیں",
    "currentOverrides": "موجودہ product overrides",
    "chooseScope": "VendorGroup یا vendor منتخب کریں",
    "scopeHint": "ایک vendor کا rule اس کے VendorGroup کے rule پر غالب ہے۔ Product rule، brand اور category rules پر غالب ہے۔",
    "linkTarget": "Link target (product، category، brand یا collection)",
    "multiSelectHint": "ایک سے زیادہ vendors منتخب کرنے کے لیے Ctrl (یا Cmd) دبا کر رکھیں۔",
    "gettingStarted": "یہاں سے شروع کریں: 1) categories بنائیں، 2) brands بنائیں، 3) products شامل کریں، 4) price list بنا کر activate کریں۔",
    "searchByName": "نام سے تلاش کریں",
    "search": "تلاش",
    "open": "کھولیں",
    "add": "شامل کریں",
    "status": "Status",
    "allStatuses": "تمام statuses",
    "description": "تفصیل",
    "displayOrder": "ترتیب",
    "slugHint": "خالی چھوڑیں تو English نام سے بن جائے گا",
    "chooseCollection": "Collection منتخب کریں",
    "basics": "Product کی تفصیل",
    "pricingStock": "قیمت اور stock",
    "priceViaPriceList": "یہ قیمت بدلنے کے لیے اسے DRAFT price list میں شامل کریں، approve کریں، پھر activate کریں۔",
    "needCategoryFirst": "Products شامل کرنے سے پہلے کم از کم ایک category بنائیں۔",
    "pagination": "صفحات",
    "previous": "پچھلا",
    "next": "اگلا",
    "pageOf": "صفحہ {page} از {pages} · {total} products",
    "deleted": "Delete ہو گیا۔",
    "approved": "Price list approve ہو گئی۔ ابھی activate کریں یا effective date پر خود activate ہو جائے گی۔",
    "rejected": "Price list مسترد ہو گئی۔",
    "activated": "Price list active ہو گئی۔ Product prices اور کھلے carts update ہو گئے۔",
    "priceListHowTo": "قیمت کیسے بدلتی ہے: DRAFT بنائیں (موجودہ قیمتیں copy ہوں گی) ← قیمتیں edit کریں ← approve ← activate۔ پرانے orders کی قیمت نہیں بدلتی۔",
    "addProductToList": "اس list میں product شامل کریں",
    "reject": "مسترد کریں",
    "rejectReason": "مسترد کرنے کی وجہ",
    "noItems": "اس price list میں کوئی product نہیں",
    "noItemsHint": "اوپر سے products شامل کریں، یا “Clone active list” tick کر کے نئی list بنائیں۔",
    "scheduledHint": "یہ list approve ہو چکی ہے۔ Effective وقت پر خود activate ہوگی، یا ابھی activate کریں۔",
    "approvalHint": "DRAFT ہونے تک قیمتیں edit ہو سکتی ہیں۔ Activate سے پہلے approver کی منظوری ضروری ہے۔",
    "listStatus": {"DRAFT": "Draft", "SCHEDULED": "Scheduled", "ACTIVE": "Active", "SUPERSEDED": "پرانی"},
    "approvalStatus": {"NOT_REQUIRED": "منظوری ضروری نہیں", "PENDING": "منظوری کا انتظار", "APPROVED": "منظور", "REJECTED": "مسترد"},
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


if __name__ == "__main__":
    import sys
    extra_en, extra_ur = {}, {}
    if len(sys.argv) > 1:  # optional JSON file with {"en": {...}, "ur": {...}} for later screens
        extra = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
        extra_en, extra_ur = extra.get("en", {}), extra.get("ur", {})
    for locale, values in (("en", {**EN, **extra_en}), ("ur", {**UR, **extra_ur})):
        path = Path("messages") / f"{locale}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        added = fill(data.setdefault("catalogueAdmin", {}), values)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{locale}: catalogueAdmin +{added}")
