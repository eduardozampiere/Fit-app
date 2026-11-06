"""Testes do gerador do catálogo. Rodar: python3 -m unittest discover -s tools"""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import import_catalog as ic  # noqa: E402


class CatalogTest(unittest.TestCase):
    def test_slugify_igual_ao_do_app(self):
        self.assertEqual(ic.slugify("Tríceps francês (Polia)"), "triceps-frances-polia")
        self.assertEqual(ic.slugify("  Supino reto (Barra) "), "supino-reto-barra")

    def test_todo_exercicio_tem_traducao_e_id_unico(self):
        data = ic.build()  # falha se faltar tradução, sobrar tradução ou repetir nome
        ids = [e["id"] for e in data["exercises"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertGreater(len(ids), 400)

    def test_arquivo_gerado_esta_em_dia(self):
        with open(ic.OUT_PATH, encoding="utf-8") as f:
            self.assertEqual(json.load(f), ic.build(), "rode: npm run import-catalog")


if __name__ == "__main__":
    unittest.main()
