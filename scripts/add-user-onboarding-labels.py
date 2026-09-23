"""Adds the userOnboarding namespace for the Admin Users screen. Existing keys win; safe to rerun."""
import json
from pathlib import Path

EN = {
    "step1": "Fill in this form and save. For a Vendor, choose their shop; for a Sales Agent, add their agent code.",
    "step2": "In Supabase → Authentication → Users → Add user, create the login with the same email and a password (tick Auto Confirm).",
    "step3": "The CRM links the login automatically. If the login already existed, it is linked as soon as you save this form.",
    "chooseRole": "Choose a role",
    "findShop": "Find the shop",
    "customerAccount": "Customer account (shop)",
    "chooseShop": "Choose the shop",
    "noCustomersYet": "No customers exist yet. Import or create customers first.",
    "agentCode": "Agent code",
    "agentCodeHint": "Short code used on customer lists, for example HARIS. Leave blank to use the first name.",
    "linkedNow": "User created and linked. They can log in now.",
    "alreadyActive": "This login is already an active CRM user.",
    "waitingForLogin": "User saved. Now create the login in Supabase Authentication with the same email — it will link automatically.",
    "pendingTitle": "Waiting for a login",
    "pendingHint": "These people are saved in the CRM but have no Supabase login yet. After creating the login, press Link now if it does not link automatically.",
    "linkNow": "Link now",
    "noUsers": "No users found",
    "activate": "Activate",
    "deactivate": "Deactivate",
}
UR = {
    "step1": "یہ form بھر کر save کریں۔ Vendor کے لیے اس کی دکان منتخب کریں؛ Sales Agent کے لیے agent code لکھیں۔",
    "step2": "Supabase → Authentication → Users → Add user میں اسی email اور password سے login بنائیں (Auto Confirm tick کریں)۔",
    "step3": "CRM login کو خود link کر دے گا۔ اگر login پہلے سے موجود ہو تو یہ form save کرتے ہی link ہو جائے گا۔",
    "chooseRole": "Role منتخب کریں",
    "findShop": "دکان تلاش کریں",
    "customerAccount": "Customer account (دکان)",
    "chooseShop": "دکان منتخب کریں",
    "noCustomersYet": "ابھی کوئی customer موجود نہیں۔ پہلے customers import یا create کریں۔",
    "agentCode": "Agent code",
    "agentCodeHint": "Customer lists میں استعمال ہونے والا مختصر code، مثلاً HARIS۔ خالی چھوڑیں تو پہلا نام استعمال ہوگا۔",
    "linkedNow": "User بن گیا اور link ہو گیا۔ اب login کر سکتے ہیں۔",
    "alreadyActive": "یہ login پہلے سے active CRM user ہے۔",
    "waitingForLogin": "User save ہو گیا۔ اب Supabase Authentication میں اسی email سے login بنائیں — خود link ہو جائے گا۔",
    "pendingTitle": "Login کا انتظار",
    "pendingHint": "یہ لوگ CRM میں save ہیں لیکن ان کا Supabase login ابھی نہیں بنا۔ Login بنانے کے بعد خود link نہ ہو تو Link now دبائیں۔",
    "linkNow": "ابھی link کریں",
    "noUsers": "کوئی user نہیں ملا",
    "activate": "Activate",
    "deactivate": "Deactivate",
}
for locale, values in (("en", EN), ("ur", UR)):
    path = Path("messages") / f"{locale}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    ns = data.setdefault("userOnboarding", {})
    added = 0
    for k, v in values.items():
        if k not in ns:
            ns[k] = v; added += 1
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{locale}: userOnboarding +{added}")
