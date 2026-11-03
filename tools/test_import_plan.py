"""Testes do importador da planilha. Rodar: python3 -m unittest discover -s tools"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import import_plan as ip  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, "data", "ciclo_out26_jan27.xlsx")


class ParsersTest(unittest.TestCase):
    def test_sets_reps(self):
        self.assertEqual(ip.parse_sets_reps("5x4")["sets"], {"min": 5, "max": 5})
        self.assertEqual(ip.parse_sets_reps("5x4")["reps"], {"min": 4, "max": 4})
        r = ip.parse_sets_reps("3x8-12")
        self.assertEqual(r["reps"], {"min": 8, "max": 12})
        r = ip.parse_sets_reps("2-3x12-15")
        self.assertEqual(r["sets"], {"min": 2, "max": 3})
        self.assertEqual(r["reps"], {"min": 12, "max": 15})
        r = ip.parse_sets_reps("1x (5-8s)")
        self.assertEqual(r["durationSec"], {"min": 5, "max": 8})
        self.assertIsNone(r["reps"])
        r = ip.parse_sets_reps("3x20-30s/lado")
        self.assertTrue(r["perSide"])
        self.assertEqual(r["durationSec"], {"min": 20, "max": 30})
        r = ip.parse_sets_reps("3x, segura 5-10s")
        self.assertEqual(r["durationSec"], {"min": 5, "max": 10})
        self.assertIsNone(ip.parse_sets_reps("—")["sets"])

    def test_load(self):
        self.assertEqual(ip.parse_load(140)["kg"], {"min": 140, "max": 140})
        self.assertEqual(ip.parse_load("205-210")["kg"], {"min": 205, "max": 210})
        l = ip.parse_load("100+")
        self.assertEqual((l["kg"]["min"], l["mode"]), (100, "progressive"))
        self.assertEqual(ip.parse_load("+5kg")["mode"], "added")
        self.assertEqual(ip.parse_load("peso corporal")["mode"], "bodyweight")
        self.assertEqual(ip.parse_load("leve")["mode"], "text")
        self.assertIsNone(ip.parse_load("—")["kg"])

    def test_pct_rpe_rest(self):
        self.assertEqual(ip.parse_pct("76,5%"), {"min": 0.765, "max": 0.765})
        self.assertEqual(ip.parse_pct("102-105%"), {"min": 1.02, "max": 1.05})
        self.assertIsNone(ip.parse_pct("—"))
        self.assertEqual(ip.parse_rpe("6.5-7"), {"min": 6.5, "max": 7})
        self.assertEqual(ip.parse_rpe("≤7.5"), {"min": None, "max": 7.5})
        self.assertIsNone(ip.parse_rpe("—"))
        self.assertEqual(ip.parse_rest("3-4 min"), {"min": 180, "max": 240})
        self.assertIsNone(ip.parse_rest("—"))

    def test_dates_cross_year(self):
        self.assertEqual(ip.parse_date("26/10", 2026, 10), "2026-10-26")
        self.assertEqual(ip.parse_date("04/01", 2026, 10), "2027-01-04")


class ConvertTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cycle = ip.convert(XLSX)
        cls.weeks = {w["number"]: w for w in cls.cycle["weeks"]}

    def items(self, week, weekday):
        s = next(s for s in self.weeks[week]["sessions"] if s["weekday"] == weekday)
        return s["items"]

    def test_header(self):
        c = self.cycle
        self.assertEqual(c["format"], "fitapp.cycle/v1")
        self.assertEqual(c["maxes"], {"squat": 200, "bench": 170, "deadlift": 240})
        self.assertEqual(len(c["weeks"]), 14)
        self.assertEqual(c["startDate"], "2026-10-26")
        self.assertEqual(self.weeks[11]["start"], "2027-01-04")
        self.assertTrue(any("Terra S4-S6" in r for r in c["rules"]))

    def test_week1_monday(self):
        items = self.items(1, 1)
        self.assertEqual(items[0]["kind"], "activation_single")
        self.assertEqual(items[1]["kind"], "main")
        self.assertEqual(items[1]["load"], {"min": 140, "max": 140})
        self.assertTrue(items[1]["pctBased"])
        self.assertEqual(items[1]["restSec"], {"min": 300, "max": 300})

    def test_deadlift_main_detected_by_title(self):
        main = [i for i in self.items(5, 3) if i["kind"] == "main"]
        self.assertEqual(len(main), 1)
        self.assertTrue(main[0]["name"].startswith("Terra"))

    def test_stiff_is_not_pct_based(self):
        stiff = next(i for i in self.items(1, 3) if i["name"].startswith("Stiff"))
        self.assertFalse(stiff["pctBased"])
        self.assertEqual(stiff["exerciseId"], "stiff-terra-romeno")

    def test_backoff_children(self):
        items = self.items(7, 1)
        backoff = next(i for i in items if i["kind"] == "backoff")
        self.assertEqual(backoff["parentId"], items[1]["id"])

    def test_walkout_and_ranges(self):
        walk = next(i for i in self.items(11, 1) if i["kind"] == "walkout")
        self.assertEqual(walk["durationSec"], {"min": 5, "max": 8})
        main13 = next(i for i in self.items(13, 1) if i["kind"] == "main")
        self.assertEqual(main13["load"], {"min": 205, "max": 210})

    def test_core_attached_to_week(self):
        core = self.weeks[1]["core"]
        self.assertEqual(core["weekdays"], [1, 3, 5])
        self.assertEqual(len(core["items"]), 6)

    def test_gate_params(self):
        g = self.cycle["ruleParams"]["gates"]["lifts"]
        self.assertEqual(g["squat"], {"gateLoad": 190, "maxRpe": 8.5, "nextLoad": 200, "fallbackLoad": 195})
        self.assertEqual(g["deadlift"]["gateLoad"], 230)


if __name__ == "__main__":
    unittest.main()
