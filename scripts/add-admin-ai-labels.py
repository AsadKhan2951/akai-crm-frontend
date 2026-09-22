import json
from pathlib import Path
for filename, labels in {
  "en.json": {"draftRole":"Draft role with AI","roleDraftDescription":"Describe the role and its data access…","draftPermissions":"Draft permissions"},
  "ur.json": {"draftRole":"AI سے role کا draft","roleDraftDescription":"Role اور data access بیان کریں…","draftPermissions":"Draft permissions"},
}.items():
    path=Path("messages")/filename
    data=json.loads(path.read_text())
    data["admin"].update(labels)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n")
