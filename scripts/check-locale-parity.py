import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
en = json.loads((root / "messages/en.json").read_text(encoding="utf-8"))
ur = json.loads((root / "messages/ur.json").read_text(encoding="utf-8"))


def flatten(value, prefix=""):
    out = {}
    if isinstance(value, dict):
        for key, child in value.items():
            path = f"{prefix}.{key}" if prefix else key
            out.update(flatten(child, path))
    else:
        out[prefix] = value
    return out


en_flat = flatten(en)
ur_flat = flatten(ur)
missing = sorted(set(en_flat) - set(ur_flat))
extra = sorted(set(ur_flat) - set(en_flat))
identical = sorted(key for key in set(en_flat) & set(ur_flat) if isinstance(en_flat[key], str) and en_flat[key] == ur_flat[key])
print(f"EN_LEAF_KEYS={len(en_flat)}")
print(f"UR_LEAF_KEYS={len(ur_flat)}")
print(f"MISSING_KEYS={len(missing)}")
print("MISSING_LIST=" + json.dumps(missing, ensure_ascii=False))
print(f"EXTRA_KEYS={len(extra)}")
print("EXTRA_LIST=" + json.dumps(extra, ensure_ascii=False))
print(f"IDENTICAL_VALUES={len(identical)}")
print("IDENTICAL_LIST=" + json.dumps(identical, ensure_ascii=False))
