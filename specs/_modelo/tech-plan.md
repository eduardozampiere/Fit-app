# NN — Nome da feature · Plano técnico

> **Técnico: como.** Dono: `tech-planner` (`/planejar`). Implementa o [pbi.md](pbi.md) sem mudar o escopo;
> mudança de escopo volta para o `/pm`. O dev (`/dev`) marca os passos e registra desvios no Andamento.

**Status:** ⏳ a fazer · 🔨 em andamento · ✅ feito

## Abordagem
A solução em 3–5 frases: onde a regra mora, o que muda no banco, que telas mexem.

## Decisões técnicas
- Decisão — motivo. Alternativas descartadas.

## Passos (commits pequenos, testes verdes a cada um)
- [ ] **1. Domínio** — `src/domain/arquivo.ts`: `funcao(arg: Tipo): Retorno` (nova | reaproveita `x` de `y.ts`).
  Atende: CP1. Pronto quando: testes do passo passam.
- [ ] **2. Banco** — migração em `src/db/schema.ts`; consultas em `src/db/xRepo.ts`. Atende: CP…
- [ ] **3. Estado** — `src/state/…`. Atende: CP…
- [ ] **4. Componentes / telas** — `src/components/…`, `src/app/…`. Atende: CP…
- [ ] **5. Verificação** — testes, `tsc`, lint, prévia web; roteiro do iPhone do PBI.
- [ ] **6. Docs** — status no `pbi.md`, neste arquivo e no `PLANO.md`; `CONTEXTO.md` se uma decisão mudou.

## Arquivos
| Arquivo | Novo/alterado | O que muda |
|---|---|---|
| `src/...` | … | … |

## Dados
Migração (tabela, colunas, tipos, padrão para registros existentes), compatibilidade com backups e o
formato de import/export. "Nenhuma mudança" também é resposta, desde que dita.

## Testes
| Função | Caso | Entrada → esperado |
|---|---|---|
| `funcao` | borda: lista vazia | `[]` → `…` |

## Rastreabilidade
| Critério (PBI) | Passos | Como é verificado |
|---|---|---|
| CP1 | 1, 4 | teste `x.test.ts` + roteiro iPhone passo 2 |

## Riscos técnicos
- Risco — como mitigar.

## Andamento
| Data | Nota |
|---|---|
| dd/mm/aaaa | Plano criado. |
