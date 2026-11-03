# Formato de ciclo — `fitapp.cycle/v1`

Um ciclo é um JSON único. O importador da planilha gera esse formato e o app importa qualquer arquivo que o siga.
A ideia é que o Claude, como treinador, monte os próximos ciclos direto nele. As instruções prontas para colar no
projeto do Claude estão em [claude-treinador.md](claude-treinador.md).

## Estrutura

```jsonc
{
  "format": "fitapp.cycle/v1",
  "id": "ciclo-2026-10-26",          // único; usado no histórico
  "name": "Ciclo out/26 – jan/27",
  "startDate": "2026-10-26",          // segunda-feira da semana 1
  "endDate": "2027-01-31",
  "goal": "Metas dez/2027: agacho 220 | supino 180 | terra 260",
  "maxes": { "squat": 200, "bench": 170, "deadlift": 240 },  // máximos de referência do plano
  "rules": ["texto livre das regras, exibido no app"],
  "ruleParams": { … },                // parâmetros das regras automáticas (ver abaixo)
  "exercises": [ { "id": "agachamento-high-bar", "name": "Agachamento (High Bar)", "lift": "squat", "category": "powerlifting" } ],
  "weeks": [ {
    "number": 1, "start": "2026-10-26", "block": "Volume",
    "targetRpe": { "min": 6.5, "max": 7 }, "targetRpeText": "6.5-7",
    "note": "Semana de entrada", "notes": ["avisos da semana"],
    "sessions": [ {
      "id": "w1-d1", "weekday": 1, "title": "Agacho Pesado + Supino Variação",
      "items": [ {
        "id": "w1-d1-2", "exerciseId": "agachamento-high-bar", "name": "Agachamento (High Bar)",
        "kind": "main",                 // main | variation | activation_single | walkout | backoff | volume_doubles | accessory | core
        "parentId": null,               // back-off/duplas apontam para o principal
        "setsText": "4x4", "sets": { "min": 4, "max": 4 }, "reps": { "min": 4, "max": 4 },
        "durationSec": null, "perSide": false,
        "load": { "min": 140, "max": 140 }, "loadText": "140", "loadMode": "fixed",  // fixed | progressive | added | bodyweight | text | none
        "pctOfMax": { "min": 0.7, "max": 0.7 }, "pctBased": true,  // pctBased: recalcula quando o máximo muda
        "rpe": { "min": 6.5, "max": 7 }, "rpeText": "6.5-7",       // rpe.min = null significa "≤ max"
        "restSec": { "min": 300, "max": 300 }, "restText": "5 min",
        "notes": "principal"
      } ]
    } ],
    "core": { "title": "CORE + MOBILIDADE", "weekdays": [1, 3, 5], "items": [ … ] }
  } ]
}
```

## `ruleParams`

São os números das regras de segurança e progressão de cada ciclo. Ficam no JSON para o treinador ajustar
ciclo a ciclo, sem mudar o código do app.

| Chave | Significado |
|---|---|
| `loadRounding` | múltiplo de arredondamento das cargas (5 kg) |
| `brake.rpeOverTarget` | RPE acima do alvo que aciona "repetir a carga" (1) |
| `gates` | semanas com portão, semana‑portão e, por movimento: carga do portão, RPE máximo, carga liberada e carga alternativa |
| `activationSingle` | RPE que indica cansaço e semanas em que sugere pular o single |
| `deadliftFourthSet` | semanas em que a 4ª série do terra depende do RPE da 3ª |
| `deadliftFailStopsLift` | falhou no terra → encerra terra e stiff do dia |
| `deloadOnDemand` | limites dos sinais vermelhos e corte de volume |
| `maxReview` | semana da revisão dos máximos, semanas afetadas, limite de RPE e incremento |
| `grip` | até que semana usar hook + strap, quantas séries com hook, stiff sempre de strap |
