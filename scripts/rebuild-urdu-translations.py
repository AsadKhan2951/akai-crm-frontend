import json
import os
import re
import time
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
EN_PATH = ROOT / "messages" / "en.json"
UR_PATH = ROOT / "messages" / "ur.json"
REPORT_PATH = ROOT / "docs" / "urdu-translation-review.md"
MODEL = "gpt-5-mini"
BATCH_SIZE = 35


def flatten(value, prefix=""):
    items = []
    if isinstance(value, dict):
        for key, child in value.items():
            path = f"{prefix}.{key}" if prefix else key
            items.extend(flatten(child, path))
    else:
        items.append((prefix, value))
    return items


def unflatten(items):
    root = {}
    for path, value in items:
        node = root
        parts = path.split(".")
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = value
    return root


def placeholders(text):
    return sorted(re.findall(r"\{[^{}]+\}", text))


def call_batch(client, batch):
    payload = [{"key": key, "english": value} for key, value in batch]
    prompt = (
        "Translate every English UI string to genuine, natural Urdu for Karachi shopkeepers and field sales staff. "
        "Return ONLY a JSON object mapping each exact key to its Urdu string. Keep the keys byte-for-byte unchanged. "
        "Keep product names, SKUs, technical terms commonly used in Karachi commerce (order, invoice, delivery, WhatsApp, PDF, AI), "
        "Western Arabic numerals, punctuation, and every placeholder such as {name}, {count}, or {amount} unchanged. "
        "Do not add keys, remove keys, transliterate Urdu into Latin letters, or add commentary. "
        "Some strings may be short labels, buttons, errors, or messages.\n\n"
        + json.dumps(payload, ensure_ascii=False)
    )
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are a precise Urdu localization editor. Output valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        max_completion_tokens=7000,
    )
    text = response.choices[0].message.content or "{}"
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.IGNORECASE)
    result = json.loads(text)
    if not isinstance(result, dict):
        raise ValueError("translation response was not an object")
    expected = {key for key, _ in batch}
    actual = set(result)
    if actual != expected:
        raise ValueError(f"translation key mismatch missing={sorted(expected-actual)} extra={sorted(actual-expected)}")
    for key, english in batch:
        translated = result[key]
        if not isinstance(translated, str) or not translated.strip():
            raise ValueError(f"empty translation for {key}")
        if placeholders(english) != placeholders(translated):
            raise ValueError(f"placeholder mismatch for {key}: {placeholders(english)} != {placeholders(translated)}")
    return [(key, result[key]) for key, _ in batch]


def main():
    source = json.loads(EN_PATH.read_text(encoding="utf-8"))
    leaves = flatten(source)
    client = OpenAI()
    translated = []
    review = []
    for start in range(0, len(leaves), BATCH_SIZE):
        batch = leaves[start : start + BATCH_SIZE]
        last_error = None
        for attempt in range(3):
            try:
                translated.extend(call_batch(client, batch))
                break
            except Exception as exc:
                last_error = exc
                time.sleep(2 * (attempt + 1))
        else:
            raise RuntimeError(f"batch {start // BATCH_SIZE + 1} failed: {last_error}")
        print(f"translated {min(start + BATCH_SIZE, len(leaves))}/{len(leaves)}", flush=True)

    urdu = unflatten(translated)
    UR_PATH.write_text(json.dumps(urdu, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    untranslated = [(key, value) for key, value in leaves if urdu[key.split(".")[0]] is None]
    review.append("# Urdu translation review\n")
    review.append("This file was generated from the exact `messages/en.json` leaf-key tree in controlled batches. It must receive human review before production use.\n")
    review.append(f"- English leaf strings: {len(leaves)}\n")
    review.append(f"- Urdu leaf strings: {len(flatten(urdu))}\n")
    review.append("- Key-tree parity: checked by the generation script.\n")
    review.append("- Placeholder parity: checked for every generated leaf.\n")
    review.append("\n## Review required\n\n")
    review.append("All generated Urdu values require a native-speaker review for terminology, tone, and Nastaliq rendering. No extra keys were created.\n")
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("".join(review), encoding="utf-8")


if __name__ == "__main__":
    main()

# GENERATED TRANSLATIONS REQUIRE REVIEW: the source of truth remains messages/en.json.
# This script never changes the English key tree or invents message keys.
