#!/usr/bin/env python3
"""Gera assets/catalog/exercicios.json a partir de data/catalogo-hevy-ia.csv (catálogo do projeto
hevy-ia) e tools/catalogo_pt.txt (nome em português de cada exercício, "Inglês|Português").

Uso: python3 tools/import_catalog.py
"image" é o link da imagem (jpg) do exercício, quando o CSV traz uma (os links de vídeo não entram).
O id é o slug do nome em português (mesma regra de slugify em src/domain/text.ts).
"""
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "catalogo-hevy-ia.csv"
PT_PATH = ROOT / "tools" / "catalogo_pt.txt"
OUT_PATH = ROOT / "assets" / "catalog" / "exercicios.json"


def slugify(text: str) -> str:
    plain = "".join(c for c in unicodedata.normalize("NFKD", text.strip()) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", plain.lower()).strip("-")


def key(value: str) -> str:
    return slugify(value)


def build() -> dict:
    pt = {}
    for line in PT_PATH.read_text(encoding="utf-8").splitlines():
        if line.strip():
            en, _, name = line.partition("|")
            pt[en.strip()] = name.strip()

    exercises = []
    seen = {}
    for row in csv.DictReader(CSV_PATH.open(encoding="utf-8")):
        en = row["name"].strip()
        if en not in pt:
            raise SystemExit(f"Sem tradução para: {en}")
        name = pt.pop(en)
        ex_id = slugify(name)
        if ex_id in seen:
            raise SystemExit(f"Nome repetido: {name} (de {en} e {seen[ex_id]})")
        seen[ex_id] = en
        secondary = [] if row["secondary_muscle"] in ("", "None") else [key(m) for m in row["secondary_muscle"].split(",")]
        # Só imagens (jpg). O CSV também traz mp4 (e marca um deles como "image"): ficam de fora.
        source = row["source"].strip()
        image = source if source.startswith("https://") and source.endswith(".jpg") else None
        exercises.append(
            {
                "id": ex_id,
                "name": name,
                "nameEn": en,
                "equipment": key(row["equipment"]),
                "muscle": key(row["primary_muscle"]),
                "secondary": secondary,
                "image": image,
            }
        )
    if pt:
        raise SystemExit(f"Traduções sem exercício no CSV: {sorted(pt)}")
    exercises.sort(key=lambda e: e["name"].lower())
    return {"format": "fitapp.catalog/v1", "source": "hevy-ia/exercices.csv", "exercises": exercises}


def main() -> int:
    data = build()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(data['exercises'])} exercícios em {OUT_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
