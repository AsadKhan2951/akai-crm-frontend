import json
from pathlib import Path
labels = {
  "en.json": {
    "assignedAgent": "Sales Agent",
    "date": "Date",
    "stageLabels": {"NEW": "New", "CONTACTED": "Contacted", "QUALIFIED": "Qualified", "PROPOSAL_SENT": "Proposal sent", "NEGOTIATION": "Negotiation", "WON": "Won", "LOST": "Lost"},
    "activityTypes": {"CALL": "Call", "WHATSAPP": "WhatsApp", "EMAIL": "Email", "VISIT": "Visit", "NOTE": "Note", "MEETING": "Meeting"},
    "dispositions": {"CONNECTED": "Connected", "NO_ANSWER": "No answer", "BUSY": "Busy", "WRONG_NUMBER": "Wrong number", "CALLBACK_REQUESTED": "Callback requested", "NOT_INTERESTED": "Not interested", "INTERESTED": "Interested", "ORDER_PLACED": "Order placed", "QUOTE_REQUESTED": "Quote requested", "FOLLOW_UP_SCHEDULED": "Follow-up scheduled", "COMPLAINT": "Complaint", "PAYMENT_COLLECTED": "Payment collected"},
    "selectContact": "Select customer or lead",
    "customerContact": "Customer",
    "leadContact": "Lead",
    "location": "Location",
    "noPhone": "No phone number is saved for this contact.",
    "noWhatsapp": "No WhatsApp number is saved for this customer.",
  },
  "ur.json": {
    "assignedAgent": "Sales Agent",
    "date": "Date",
    "stageLabels": {"NEW": "نیا", "CONTACTED": "رابطہ ہو گیا", "QUALIFIED": "Qualified", "PROPOSAL_SENT": "Proposal بھیج دیا", "NEGOTIATION": "Negotiation", "WON": "WON", "LOST": "LOST"},
    "activityTypes": {"CALL": "Call", "WHATSAPP": "WhatsApp", "EMAIL": "Email", "VISIT": "Visit", "NOTE": "Note", "MEETING": "Meeting"},
    "dispositions": {"CONNECTED": "رابطہ ہو گیا", "NO_ANSWER": "جواب نہیں ملا", "BUSY": "مصروف", "WRONG_NUMBER": "غلط نمبر", "CALLBACK_REQUESTED": "Callback کی درخواست", "NOT_INTERESTED": "دلچسپی نہیں", "INTERESTED": "دلچسپی ہے", "ORDER_PLACED": "Order place ہو گیا", "QUOTE_REQUESTED": "Quote کی درخواست", "FOLLOW_UP_SCHEDULED": "Follow-up مقرر ہے", "COMPLAINT": "Complaint", "PAYMENT_COLLECTED": "Payment collect ہو گئی"},
    "selectContact": "Customer یا lead منتخب کریں",
    "customerContact": "Customer",
    "leadContact": "Lead",
    "location": "Location",
    "noPhone": "اس contact کا phone number محفوظ نہیں ہے۔",
    "noWhatsapp": "اس customer کا WhatsApp number محفوظ نہیں ہے۔",
  }
}
for filename, additions in labels.items():
    path = Path("messages") / filename
    data = json.loads(path.read_text())
    data["sales"].update(additions)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
