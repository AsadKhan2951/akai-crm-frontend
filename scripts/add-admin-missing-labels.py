import json
from pathlib import Path
for filename, extra in {
  "en.json": {"progress":"Enrichment progress","dataComplete":"Data complete","createdAt":"Created at","fullName":"Full name","phone":"Phone","email":"Email","preferredLocale":"Preferred locale","previous":"Previous","next":"Next","aiBudget":"Daily AI budget PKR"},
  "ur.json": {"progress":"Enrichment progress","dataComplete":"Data complete","createdAt":"Created at","fullName":"Full name","phone":"Phone","email":"Email","preferredLocale":"Preferred locale","previous":"Previous","next":"Next","aiBudget":"Daily AI budget PKR"},
}.items():
  path = Path("messages") / filename
  data = json.loads(path.read_text())
  data["admin"].update(extra)
  path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
