#!/usr/bin/env python3
"""Converte a planilha do ciclo (xlsx) no formato de ciclo do app (fitapp.cycle/v1).

Uso:
    python3 tools/import_plan.py data/ciclo_out26_jan27.xlsx assets/plan/ciclo_out26_jan27.json

O JSON gerado é o mesmo formato que o Claude (treinador) usa para montar ciclos
novos — ver docs/formato-ciclo.md. A planilha só é necessária para este ciclo.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
import unicodedata

import openpyxl

FORMAT = "fitapp.cycle/v1"

WEEKDAYS = {
    "segunda": 1, "terça": 2, "terca": 2, "quarta": 3, "quinta": 4,
    "sexta": 5, "sábado": 6, "sabado": 6, "domingo": 7,
}
WEEKDAY_ABBR = {"seg": 1, "ter": 2, "qua": 3, "qui": 4, "sex": 5, "sáb": 6, "sab": 6, "dom": 7}

DASHES = {"—", "–", "-", ""}

# ---------------------------------------------------------------------------
# Parsers de célula (puros, testados em tools/test_import_plan.py)
# ---------------------------------------------------------------------------


def _num(s: str) -> float:
    return float(s.replace(",", "."))


def _clean_num(x: float):
    return int(x) if float(x).is_integer() else x


def parse_range(text: str):
    """'8-12' -> {min:8,max:12}; '4' -> {min:4,max:4}."""
    m = re.fullmatch(r"\s*(\d+(?:[.,]\d+)?)\s*(?:-\s*(\d+(?:[.,]\d+)?))?\s*", text)
    if not m:
        return None
    lo = _num(m.group(1))
    hi = _num(m.group(2)) if m.group(2) else lo
    return {"min": _clean_num(lo), "max": _clean_num(hi)}


def parse_sets_reps(text):
    """Séries x reps. Retorna dict com sets, reps, durationSec, perSide e text."""
    raw = str(text).strip() if text is not None else ""
    out = {"text": raw, "sets": None, "reps": None, "durationSec": None, "perSide": False}
    m = re.fullmatch(r"(\d+(?:-\d+)?)\s*x\s*(.*)", raw)
    if not m:
        return out
    out["sets"] = parse_range(m.group(1))
    rest = m.group(2).strip()
    if rest.endswith("/lado"):
        out["perSide"] = True
        rest = rest[: -len("/lado")].strip()
    rest = rest.strip("()").strip()
    rest = re.sub(r"^,?\s*segura\s*", "", rest)
    sec = re.fullmatch(r"(\d+(?:-\d+)?)\s*s", rest)
    if sec:
        out["durationSec"] = parse_range(sec.group(1))
    else:
        out["reps"] = parse_range(rest)
    return out


def parse_load(value):
    """Carga: número, faixa '205-210', '100+', '+5kg', 'leve', 'peso corporal', '—'."""
    if value is None:
        return {"kg": None, "text": "—", "mode": "none"}
    if isinstance(value, (int, float)):
        v = _clean_num(value)
        return {"kg": {"min": v, "max": v}, "text": str(v), "mode": "fixed"}
    raw = str(value).strip()
    if raw in DASHES:
        return {"kg": None, "text": "—", "mode": "none"}
    r = parse_range(raw)
    if r:
        return {"kg": r, "text": raw, "mode": "fixed"}
    m = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*\+", raw)
    if m:
        v = _clean_num(_num(m.group(1)))
        return {"kg": {"min": v, "max": v}, "text": raw, "mode": "progressive"}
    m = re.fullmatch(r"\+\s*(\d+(?:[.,]\d+)?)\s*kg", raw)
    if m:
        v = _clean_num(_num(m.group(1)))
        return {"kg": {"min": v, "max": v}, "text": raw, "mode": "added"}
    if raw.lower() == "peso corporal":
        return {"kg": None, "text": raw, "mode": "bodyweight"}
    return {"kg": None, "text": raw, "mode": "text"}


def parse_pct(value):
    """'76,5%' -> {min:0.765,max:0.765}; '102-105%' -> faixa; '—' -> None."""
    if value is None:
        return None
    raw = str(value).strip().rstrip("%").strip()
    r = parse_range(raw)
    if not r:
        return None
    return {"min": round(r["min"] / 100, 4), "max": round(r["max"] / 100, 4)}


def parse_rpe(value):
    """'6.5-7' / '≤7.5' / '8' / '—'."""
    if value is None:
        return None
    raw = str(value).strip()
    if raw in DASHES:
        return None
    if raw.startswith("≤"):
        r = parse_range(raw[1:])
        return {"min": None, "max": r["max"]} if r else None
    return parse_range(raw)


def parse_rest(value):
    """'5 min' -> {min:300,max:300}; '3-4 min' -> {min:180,max:240}."""
    if value is None:
        return None
    raw = str(value).strip()
    m = re.fullmatch(r"(\d+(?:-\d+)?)\s*min", raw)
    if not m:
        return None
    r = parse_range(m.group(1))
    return {"min": int(r["min"] * 60), "max": int(r["max"] * 60)}


def slug(text: str) -> str:
    t = unicodedata.normalize("NFKD", text.strip().lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t


def detect_lift(name: str):
    n = name.strip().lower()
    if n.startswith("agach"):
        return "squat"
    if n.startswith("supino"):
        return "bench"
    if n.startswith("terra") or n.startswith("stiff"):
        return "deadlift"
    return None


TITLE_LIFTS = {"agacho": "squat", "agachamento": "squat", "supino": "bench", "terra": "deadlift"}


def heavy_lift_of_title(title: str):
    """'Terra Pesado + Posterior' -> 'deadlift'."""
    m = re.search(r"(\w+)\s+Pesado", title or "", re.IGNORECASE)
    return TITLE_LIFTS.get(m.group(1).lower()) if m else None


def detect_kind(name: str, obs: str, is_child: bool, in_core: bool, lift, heavy_main_open: bool = False) -> str:
    n = name.strip().lower()
    o = (obs or "").strip().lower()
    if in_core:
        return "core"
    if "single de ativação" in n:
        return "activation_single"
    if "walkout" in n:
        return "walkout"
    if is_child and "back-off" in n:
        return "backoff"
    if is_child and "duplas" in n:
        return "volume_doubles"
    if o.startswith("principal"):
        return "main"
    if heavy_main_open and not n.startswith("stiff"):
        return "main"
    if lift:
        return "variation"
    return "accessory"


def parse_date(ddmm: str, start_year: int, start_month: int) -> str:
    d, m = (int(x) for x in ddmm.split("/"))
    year = start_year if m >= start_month else start_year + 1
    return dt.date(year, m, d).isoformat()


# ---------------------------------------------------------------------------
# Leitura da planilha
# ---------------------------------------------------------------------------


def read_resumo(ws, start_year: int):
    rows = [r for r in ws.iter_rows(values_only=True)]
    title = str(rows[0][0]).strip()
    header_idx = next(i for i, r in enumerate(rows) if r[0] == "Sem")
    summary = {}
    i = header_idx + 1
    start_month = None
    while i < len(rows) and isinstance(rows[i][0], (int, float)):
        r = rows[i]
        week = int(r[0])
        if start_month is None:
            start_month = int(str(r[1]).split("/")[1])
        summary[week] = {
            "start": parse_date(str(r[1]), start_year, start_month),
            "block": str(r[2]).strip(),
            "targetRpeText": str(r[11]).strip() if r[11] is not None else "",
            "targetRpe": parse_rpe(r[11]),
            "note": str(r[12]).strip() if r[12] else None,
            "lifts": {
                "squat": {"scheme": r[3], "load": parse_load(r[4])["text"], "pct": r[5]},
                "bench": {"scheme": r[3], "load": parse_load(r[6])["text"], "pct": r[7]},
                "deadlift": {"scheme": r[8], "load": parse_load(r[9])["text"], "pct": r[10]},
            },
        }
        i += 1
    rules = [str(r[0]).lstrip("•").strip() for r in rows if r[0] and str(r[0]).startswith("•")]
    header_lines = [str(r[0]).strip() for r in rows[1:header_idx] if r[0]]
    return title, header_lines, summary, rules


def parse_core_days(title: str):
    m = re.search(r"\(([^)]*)\)", title)
    if not m:
        return [1, 3, 5]
    days = [WEEKDAY_ABBR.get(p.strip().lower()) for p in m.group(1).split(",")]
    return [d for d in days if d]


def read_week(ws, week_no: int, summary: dict, exercises: dict):
    rows = [r for r in ws.iter_rows(values_only=True)]
    title = str(rows[0][0]).strip()
    notes = []
    sessions = []
    core = None
    current = None
    in_core = False
    last_parent_id = None
    heavy_lift = None
    main_found = False
    idx = 1
    for r in rows[1:]:
        a = r[0]
        if a is None:
            continue
        a_str = str(a)
        stripped = a_str.strip()
        if stripped.upper().startswith("CHECK-IN"):
            break
        if stripped == "Exercício":
            continue
        if stripped.upper().startswith("CORE"):
            in_core = True
            core = {"title": stripped, "weekdays": parse_core_days(stripped), "items": []}
            continue
        first_word = stripped.split(" ")[0].split("—")[0].strip().lower()
        if not in_core and first_word in WEEKDAYS and r[1] is None:
            wd = WEEKDAYS[first_word]
            title_part = stripped.split("—", 1)[1].strip() if "—" in stripped else stripped
            current = {
                "id": f"w{week_no}-d{wd}",
                "weekday": wd,
                "title": title_part,
                "items": [],
            }
            sessions.append(current)
            idx = 1
            last_parent_id = None
            heavy_lift = heavy_lift_of_title(title_part)
            main_found = False
            continue
        if current is None and not in_core:
            notes.append(stripped)
            continue
        # linha de exercício
        is_child = a_str.startswith("  ")
        name = stripped
        obs = str(r[6]).strip() if r[6] else ""
        lift = detect_lift(name)
        heavy_open = (
            not in_core and not is_child and not main_found and lift is not None and lift == heavy_lift
        )
        kind = detect_kind(name, obs, is_child, in_core, lift, heavy_open)
        if kind == "main" and not in_core:
            main_found = True
        ex_id = slug(name)
        if ex_id not in exercises:
            exercises[ex_id] = {
                "id": ex_id,
                "name": name,
                "lift": lift,
                "category": "core" if in_core else ("powerlifting" if lift else "accessory"),
            }
        sr = parse_sets_reps(r[1])
        load = parse_load(r[2])
        pct = parse_pct(r[3])
        pct_based = bool(
            pct
            and load["kg"]
            and load["mode"] == "fixed"
            and lift
            and not name.lower().startswith("stiff")
        )
        container = core["items"] if in_core else current["items"]
        item_id = (
            f"w{week_no}-core-{len(container) + 1}" if in_core else f"w{week_no}-d{current['weekday']}-{idx}"
        )
        item = {
            "id": item_id,
            "exerciseId": ex_id,
            "name": name,
            "kind": kind,
            "parentId": last_parent_id if is_child else None,
            "setsText": sr["text"],
            "sets": sr["sets"],
            "reps": sr["reps"],
            "durationSec": sr["durationSec"],
            "perSide": sr["perSide"],
            "load": load["kg"],
            "loadText": load["text"],
            "loadMode": load["mode"],
            "pctOfMax": pct,
            "pctBased": pct_based,
            "rpe": parse_rpe(r[4]),
            "rpeText": str(r[4]).strip() if r[4] is not None else "—",
            "restSec": parse_rest(r[5]),
            "restText": str(r[5]).strip() if r[5] is not None else "—",
            "notes": obs,
        }
        container.append(item)
        if not in_core:
            idx += 1
            if not is_child:
                last_parent_id = item_id
    s = summary[week_no]
    return {
        "number": week_no,
        "title": title,
        "start": s["start"],
        "block": s["block"],
        "targetRpe": s["targetRpe"],
        "targetRpeText": s["targetRpeText"],
        "note": s["note"],
        "summary": s["lifts"],
        "notes": notes,
        "sessions": sessions,
        "core": core,
    }


def main_load(week: dict, lift: str):
    for sess in week["sessions"]:
        for it in sess["items"]:
            if it["kind"] == "main" and it["exerciseId"] and detect_lift(it["name"]) == lift and it["load"]:
                return it["load"]["min"]
    return None


def build_rule_params(weeks_by_no: dict):
    """Parâmetros das regras deste ciclo. Ciclos futuros (gerados pelo Claude) trazem os seus."""
    gate_week = 11
    gates = {}
    for lift in ("squat", "bench", "deadlift"):
        gate_load = main_load(weeks_by_no[gate_week], lift)
        next_load = main_load(weeks_by_no[gate_week + 1], lift)
        gates[lift] = {
            "gateLoad": gate_load,
            "maxRpe": 8.5,
            "nextLoad": next_load,
            "fallbackLoad": next_load - 5 if next_load else None,
        }
    return {
        "loadRounding": 5,
        "brake": {"rpeOverTarget": 1},
        "gates": {"weeks": {"from": 9, "to": 13}, "gateWeek": gate_week, "lifts": gates},
        "activationSingle": {"fatigueRpe": 8, "suggestSkipWeeks": [7, 8]},
        "deadliftFourthSet": {"weeks": [4, 5, 6], "maxRpeThirdSet": 8.5},
        "deadliftFailStopsLift": True,
        "deloadOnDemand": {
            "redSignals": 2,
            "painThreshold": 4,
            "shortSleepHours": 6,
            "shortSleepNights": 3,
            "rpeOverTarget": 1,
            "rpeOverSessions": 2,
            "volumeCut": 0.4,
        },
        "maxReview": {"afterWeek": 6, "applyWeeks": {"from": 7, "to": 13}, "rpeBelowTarget": 1, "incrementKg": 5},
        "grip": {"hookStrapUntilWeek": 6, "hookFirstSets": 2, "stiffStrap": True},
    }


def convert(path: str) -> dict:
    wb = openpyxl.load_workbook(path, data_only=True)
    ws_res = wb["Resumo"]
    # Ano de início: inferido do título ("OUT/26") — fallback para o ano atual.
    title_cell = str(ws_res.cell(1, 1).value)
    m = re.search(r"/(\d{2})", title_cell)
    start_year = 2000 + int(m.group(1)) if m else dt.date.today().year
    title, header_lines, summary, rules = read_resumo(ws_res, start_year)

    maxes = {"squat": 200, "bench": 170, "deadlift": 240}
    mm = re.search(r"Agacho (\d+) \| Supino (\d+) \| Terra (\d+)", " ".join(header_lines))
    if mm:
        maxes = {"squat": int(mm.group(1)), "bench": int(mm.group(2)), "deadlift": int(mm.group(3))}

    exercises: dict = {}
    weeks = []
    for name in wb.sheetnames:
        mw = re.fullmatch(r"Semana (\d+)", name)
        if mw:
            weeks.append(read_week(wb[name], int(mw.group(1)), summary, exercises))
    weeks.sort(key=lambda w: w["number"])
    weeks_by_no = {w["number"]: w for w in weeks}

    start = weeks[0]["start"]
    end = (dt.date.fromisoformat(weeks[-1]["start"]) + dt.timedelta(days=6)).isoformat()
    return {
        "format": FORMAT,
        "id": f"ciclo-{start}",
        "name": title.title().replace("–", "—") if title.isupper() else title,
        "startDate": start,
        "endDate": end,
        "goal": next((h for h in header_lines if h.lower().startswith("metas")), None),
        "notes": header_lines,
        "maxes": maxes,
        "rules": rules,
        "ruleParams": build_rule_params(weeks_by_no),
        "exercises": sorted(exercises.values(), key=lambda e: e["id"]),
        "weeks": weeks,
        "source": {"type": "xlsx", "file": path.split("/")[-1]},
    }


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 2
    cycle = convert(argv[1])
    with open(argv[2], "w", encoding="utf-8") as f:
        json.dump(cycle, f, ensure_ascii=False, indent=1)
        f.write("\n")
    n_items = sum(len(s["items"]) for w in cycle["weeks"] for s in w["sessions"])
    print(f"{argv[2]}: {len(cycle['weeks'])} semanas, {n_items} prescrições, {len(cycle['exercises'])} exercícios")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
