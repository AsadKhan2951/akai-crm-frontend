import json
from pathlib import Path
for filename, labels in {"en.json": {"approvals":"Approvals","reports":"Reports"}, "ur.json": {"approvals":"Approvals","reports":"Reports"}}.items():
    path=Path("messages")/filename
    data=json.loads(path.read_text())
    data["portal"].update(labels)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n")
