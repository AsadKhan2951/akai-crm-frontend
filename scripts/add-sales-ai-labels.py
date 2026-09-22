import json
from pathlib import Path
for filename, values in {
  "en.json": {"draftFollowUp": "Draft follow-up", "draftOnlyHint": "Draft only. Edit it yourself before sending or saving.", "performance": "Performance"},
  "ur.json": {"draftFollowUp": "Follow-up کا draft", "draftOnlyHint": "یہ صرف draft ہے۔ Send یا save کرنے سے پہلے خود edit کریں۔", "performance": "Performance"}
}.items():
    path = Path("messages") / filename
    data = json.loads(path.read_text())
    data["sales"].update(values)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
