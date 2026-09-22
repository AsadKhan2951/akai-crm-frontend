import json
from pathlib import Path
for filename, values in {
  "en.json": {"visitsTitle": "Visit oversight", "visitsDescription": "Review explicit visit captures and distance from the customer location.", "noVisits": "No visits logged yet.", "noVisitsHint": "Visits will appear after Sales Agents explicitly log a Visit.", "agent": "Sales Agent", "customer": "Customer", "distanceWarning": "Distance warning"},
  "ur.json": {"visitsTitle": "Visit oversight", "visitsDescription": "Explicit Visit captures اور customer location سے distance review کریں۔", "noVisits": "ابھی کوئی Visit log نہیں ہوئی۔", "noVisitsHint": "Sales Agent کے explicit Visit log کرنے کے بعد visits یہاں آئیں گی۔", "agent": "Sales Agent", "customer": "Customer", "distanceWarning": "Distance warning"}
}.items():
    path = Path("messages") / filename
    data = json.loads(path.read_text())
    data["sales"].update(values)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
