"""Restore translation keys that the app uses but messages/*.json lost.

The admin namespace was overwritten by a later settings-only edit, so the
original dashboard keys from add-admin-translations.py are merged back in.
Existing keys always win. Safe to run more than once.
"""
import json
from pathlib import Path

src = Path("scripts/add-admin-translations.py").read_text(encoding="utf-8")
ns: dict = {}
exec(src.split("for filename")[0], ns)
admin_base = {"en": ns["base"], "ur": ns["ur"]}

extra = {
  "en": {
    "admin": {"progress": "Progress", "email": "Email", "fullName": "Full name", "phone": "Phone", "preferredLocale": "Preferred language", "previous": "Previous", "next": "Next", "dataComplete": "Data complete", "draftRole": "Draft role with AI", "roleDraftDescription": "Describe the job and review the suggested permissions before saving.", "draftPermissions": "Suggested permissions", "createdAt": "Created", "audit": "Audit trail"},
    "portal": {"leads": "Leads", "customers": "Customers", "quotes": "Quotes", "approvals": "Approvals", "reports": "Reports"},
    "sales": {"commonCancel": "Cancel", "types": {"AUTO_PARTS": "Auto parts", "OIL_CHANGE": "Oil change", "CAR_WASH": "Car wash", "DETAILING": "Detailing", "PAINT_HARDWARE": "Paint & hardware", "FUEL_STATION": "Fuel station", "DISTRIBUTOR": "Distributor", "OTHER": "Other"}},
    "pwa": {"voiceUploadFailed": "The voice note could not be uploaded. It is saved on this phone and will retry when you are online."},
  },
  "ur": {
    "admin": {"progress": "Progress", "email": "Email", "fullName": "پورا نام", "phone": "فون", "preferredLocale": "پسندیدہ زبان", "previous": "پچھلا", "next": "اگلا", "dataComplete": "Data مکمل", "draftRole": "AI سے role کا draft", "roleDraftDescription": "کام بیان کریں اور save کرنے سے پہلے تجویز کردہ permissions دیکھیں۔", "draftPermissions": "تجویز کردہ permissions", "createdAt": "بنایا گیا", "audit": "Audit trail"},
    "portal": {"leads": "Leads", "customers": "Customers", "quotes": "Quotes", "approvals": "Approvals", "reports": "Reports"},
    "sales": {"commonCancel": "منسوخ کریں", "types": {"AUTO_PARTS": "Auto parts", "OIL_CHANGE": "Oil change", "CAR_WASH": "Car wash", "DETAILING": "Detailing", "PAINT_HARDWARE": "Paint اور hardware", "FUEL_STATION": "Petrol pump", "DISTRIBUTOR": "Distributor", "OTHER": "دیگر"}},
    "pwa": {"voiceUploadFailed": "Voice note upload نہیں ہو سکا۔ یہ فون میں محفوظ ہے اور online ہونے پر دوبارہ کوشش ہوگی۔"},
  },
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

for locale in ("en", "ur"):
    path = Path("messages") / f"{locale}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    added = fill(data.setdefault("admin", {}), admin_base[locale])
    added += fill(data, extra[locale])
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{locale}: added {added} keys")
