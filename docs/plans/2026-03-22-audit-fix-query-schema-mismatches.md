# Audit & Fix: Query Schema Mismatches — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all Supabase query files so column names match the real database schema, making the dashboard display real data correctly.

**Architecture:** The sync script (`scripts/sync.ts`) uses CSV headers directly as DB column names. All query files (`src/lib/queries/*.ts`) were written with guessed column names that don't match. This plan fixes each file systematically. No TDD here — these are data query fixes validated by running `npm run build` and checking the live dashboard.

**Tech Stack:** Next.js 14, Supabase (PostgREST), TypeScript

---

## Critical Context: Real DB Schema

Source of truth: Supabase `list_tables` output. **Every query must use ONLY these column names.**

### obras (16 rows)
| Column | Type |
|--------|------|
| `id` (PK) | bigint |
| `nome` | text |
| `status_obra` | text |
| `codigo_obra` | text |
| `tipo_obra` | text |
| `responsavel_obra` | text |
| `responsavel_tecnico` | text |
| `area_total` | numeric |
| `unidade_area_total` | text |
| `cliente` | text |

**Does NOT have:** `status`, `endereco`, `cidade`, `estado`, `data_inicio`, `data_previsao_termino`, `data_termino`, `unidades`, `codigo`, `responsavel`

### lancamentos (1130 rows) — PK: (`id_lancamento`, `numero_parcela`)
| Column | Type |
|--------|------|
| `id_lancamento` | bigint |
| `id_obra` (FK) | bigint |
| `centro_de_custo` | text |
| `fornecedor` | text |
| `descricao` | text |
| `numero_documento` | text |
| `data_competencia` | date |
| `valor_total_lancamento` | numeric |
| `conta_bancaria` | text |
| `categoria` | text |
| `condicao_pagamento` | text |
| `numero_parcela` | integer |
| `valor_parcela` | numeric |
| `data_vencimento` | date |
| `data_lancamento` | date |

**Does NOT have:** `id`, `status`, `valor`, `tipo`, `obra_id`, `centro_custo`

### pagamentos (886 rows) — PK: (`id_lancamento`, `numero_parcela`)
| Column | Type |
|--------|------|
| `id_lancamento` | bigint |
| `id_obra` (FK) | bigint |
| `centro_de_custo` | text |
| `fornecedor` | text |
| `descricao` | text |
| `categoria` | text |
| `data_pagamento` | date |
| `data_vencimento` | date |
| `data_competencia` | date |
| `valor_parcela` | numeric |
| `valor_pago` | numeric |
| `valor_desconto` | numeric |
| `valor_juros_e_multa` | numeric |
| `forma_pagamento` | text |
| `grupo` | text |
| `plano_de_conta` | text |
| `quem_paga` | text |
| `conta_bancaria` | text |

**Does NOT have:** `id`, `status`, `obra_id`, `centro_custo`, `centro_custo_id`

### recebimentos (955 rows) — PK: (`id_faturamento`, `numero_parcela`)
| Column | Type |
|--------|------|
| `id_faturamento` | bigint |
| `id_obra` (FK) | bigint |
| `centro_de_custo` | text |
| `cliente` | text |
| `descricao` | text |
| `data_recebimento` | date |
| `data_vencimento` | date |
| `data_competencia` | date |
| `valor_parcela` | numeric |
| `valor_recebido` | numeric |
| `valor_desconto` | numeric |
| `valor_juros_e_multa` | numeric |
| `forma_recebimento` | text |
| `natureza` | text |
| `conta_bancaria` | text |

**Does NOT have:** `categoria`, `status`, `obra_id`

### faturamentos (1610 rows) — PK: (`id_faturamento`, `numero_parcela`)
| Column | Type |
|--------|------|
| `id_faturamento` | bigint |
| `id_obra` (FK) | bigint |
| `centro_de_custo` | text |
| `cliente` | text |
| `descricao` | text |
| `data_competencia` | date |
| `data_faturamento` | date |
| `data_vencimento` | date |
| `valor_bruto` | numeric |
| `impostos` | numeric |
| `valor_liquido` | numeric |
| `valor_parcela` | numeric |
| `valor` | numeric |
| `natureza` | text |
| `tipo` | text |
| `vendedor` | text |
| `numero_documento` | text |

**Does NOT have:** `id`, `status`, `data_emissao`, `obra_id`

### propostas (14 rows) — PK: (`id_obra`, `cod_orcamento`)
| Column | Type |
|--------|------|
| `id_obra` | bigint |
| `cod_orcamento` | text |
| `obra` | text |
| `cliente` | text |
| `status_proposta` | text |
| `data_criacao` | date |
| `data_entrega` | date |
| `data_venda` | date |
| `responsavel` | text |
| `cond_pgto` | text |
| `desconto` | numeric |
| `preco_total_com_desconto` | numeric |

**Does NOT have:** `id`, `status`, `valor`, `data_proposta`, `obra_id`

### cronogramas (210 rows) — PK: (`id_obra`, `indice`)
| Column | Type |
|--------|------|
| `id_obra` | bigint |
| `obra` | text |
| `indice` | text |
| `etapa_item` | text |
| `descricao` | text |
| `dias_uteis_planejado` | integer |
| `dias_corridos_planejado` | integer |
| `data_inicio_planejado` | date |
| `data_fim_planejado` | date |
| `dias_uteis_realizado` | integer |
| `dias_corridos_realizado` | integer |
| `data_inicio_realizado` | date |
| `data_fim_realizado` | date |

**Does NOT have:** `percentual_previsto`, `percentual_realizado`, `etapa`, `data_inicio`, `data_fim`, `data_inicio_real`, `data_fim_real`, `obra_id`

### items_orcamentos (210 rows) — PK: (`id_obra`, `indice`)
| Column | Type |
|--------|------|
| `id_obra` | bigint |
| `obra` | text |
| `indice` | text |
| `etapa_item` | text |
| `descricao` | text |
| `custo_total_item` | numeric |
| `preco_total_item` | numeric |
| (many other cost/price breakdown columns) |

**Does NOT have:** `obra_id`, `valor_total`, `categoria`

---

## Key Architectural Insight: No `status` Column

Tables `lancamentos`, `pagamentos`, `faturamentos` have **NO `status` column**. The Mais Controle API doesn't export status. Instead:

- **Is a lancamento paid?** → Check if a matching `pagamento` exists (same `id_lancamento` + `numero_parcela`)
- **Is a faturamento received?** → Check if a matching `recebimento` exists (same `id_faturamento` + `numero_parcela`)
- **Pending lancamentos** = lancamentos WHERE NOT EXISTS matching pagamento
- **Pending faturamentos** = faturamentos WHERE NOT EXISTS matching recebimento

All queries that filter by `.neq('status', 'Pago')` or `.neq('status', 'Cancelado')` must be rewritten to use this join logic.

---

## Systematic Rename Map

Across ALL files, apply these renames:

| Wrong | Correct | Tables |
|-------|---------|--------|
| `obra_id` | `id_obra` | ALL tables except obras |
| `status` (on obras) | `status_obra` | obras |
| `centro_custo` | `centro_de_custo` | pagamentos, recebimentos, faturamentos, lancamentos |
| `centro_custo_id` | `centro_de_custo` | (text, not numeric) |
| `valor_total` (items_orcamentos) | `preco_total_item` | items_orcamentos |
| `valor` (lancamentos) | `valor_parcela` | lancamentos |
| `valor` (propostas) | `preco_total_com_desconto` | propostas |
| `status` (propostas) | `status_proposta` | propostas |
| `data_proposta` | `data_criacao` | propostas |
| `data_emissao` (faturamentos) | `data_faturamento` | faturamentos |
| `id` (lancamentos) | `id_lancamento` | lancamentos |
| `id` (faturamentos) | `id_faturamento` | faturamentos |
| `etapa` (cronogramas) | `etapa_item` | cronogramas |
| `data_inicio` (cronogramas) | `data_inicio_planejado` | cronogramas |
| `data_fim` (cronogramas) | `data_fim_planejado` | cronogramas |
| `data_inicio_real` (cronogramas) | `data_inicio_realizado` | cronogramas |
| `data_fim_real` (cronogramas) | `data_fim_realizado` | cronogramas |

---

## Task 1: Fix `kpis.ts`

**File:** `src/lib/queries/kpis.ts`

**Mismatches found:**
1. Lines 90,102,112,132,144,154,176,185,212,219,271,279,290,298,322,332: `obra_id` → `id_obra`
2. Lines 91,103: `.in('categoria', ...)` on `recebimentos` — `recebimentos` has NO `categoria` column → remove this filter for recebimentos queries
3. Line 269: `.select('valor')` from faturamentos → use `valor_parcela`
4. Line 270: `.neq('status', 'Cancelado')` on faturamentos → remove (no status column)
5. Line 288: `.select('valor')` from lancamentos → use `valor_parcela`
6. Line 289: `.ilike('tipo', '%saida%')` on lancamentos → remove (no tipo column; all lancamentos are expenses)
7. Line 307: `.select('id, status')` from obras → change to `'id, status_obra'`
8. Line 311: `o.status` → `o.status_obra`
9. All reducers using `r.valor` → update to `r.valor_parcela`

**Step 1: Apply all fixes**

Replace all `obra_id` with `id_obra` in filter `.in()` calls.
Remove `.in('categoria', ...)` from recebimentos queries (recebimentos has no categoria).
Fix faturamentos query: select `valor_parcela`, remove `status` filter.
Fix lancamentos query: select `valor_parcela`, remove `tipo` and `status` filters.
Fix obras query: select `status_obra`, use `o.status_obra` in filter.

**Step 2: Verify build**

Run: `npx next build 2>&1 | head -50`

**Step 3: Commit**

```bash
git add src/lib/queries/kpis.ts
git commit -m "fix(kpis): correct column names to match real DB schema"
```

---

## Task 2: Fix `alertas.ts`

**File:** `src/lib/queries/alertas.ts`

**Mismatches found:**
1. Line 27: obras select uses `status`, `data_previsao_termino` → `status_obra` (remove `data_previsao_termino`, doesn't exist)
2. Lines 40-52: `obra_id` → `id_obra`, `valor_total` → `preco_total_item`
3. Line 86: faturamentos select uses `obra_id`, `data_emissao`, `valor`, `status` → `id_obra`, `data_vencimento`, `valor_parcela`, remove status
4. Lines 87-88: remove `.neq('status', ...)` filters (no status in faturamentos)
5. Line 118: lancamentos select uses `obra_id`, `valor`, `status` → `id_obra`, `valor_parcela`, remove status
6. Line 119: remove `.neq('status', 'Pago')` (no status in lancamentos)
7. Line 150: cronogramas select uses `obra_id`, `percentual_previsto`, `percentual_realizado`, `data_fim` → `id_obra`, remove percent columns, use `data_fim_planejado`
8. Lines 193-194: lancamentos select `valor` + `.neq('status')` → `valor_parcela`, remove status filter

**Key logic changes:**
- For "unpaid lancamentos" (pending bills): Instead of filtering by status, cross-reference with pagamentos table
- For "unreceived faturamentos" (overdue invoices): Cross-reference with recebimentos table
- Cronograma "behind schedule": Since no percentual columns exist, calculate progress from dates (if `data_fim_planejado` < today AND `data_fim_realizado` is null → behind schedule)

**Step 1: Rewrite alertas.ts**

Implement the cross-reference logic for unpaid/unreceived, fix all column names, adapt cronograma logic to use dates instead of percentuals.

**Step 2: Verify build**

**Step 3: Commit**

---

## Task 3: Fix `categorias.ts`

**File:** `src/lib/queries/categorias.ts`

**Mismatches found:**
1. Lines 24,83,144,308: `obra_id` → `id_obra` on pagamentos
2. Line 140: `centro_custo` → `centro_de_custo`
3. Line 198: `obra_id, centro_custo_id, valor_pago` → `id_obra, centro_de_custo, valor_pago`
4. Lines 207-209: faturamentos `obra_id` → `id_obra`, `data_emissao` → `data_faturamento` or `data_competencia`, `valor` → `valor_parcela`
5. Line 224: `p.centro_custo_id === ADMIN_CENTRO_CUSTO_ID` — `centro_de_custo` is TEXT not number; need to compare by text name "CONSTRUTORA (GERAL)" or similar

**Step 1: Apply all column fixes**

Rename `obra_id` → `id_obra`, `centro_custo` → `centro_de_custo`, `centro_custo_id` → `centro_de_custo`.
Fix faturamentos columns.
Change `ADMIN_CENTRO_CUSTO_ID` from numeric 520936 to text comparison with the actual centro de custo name (query Supabase to find the right text value).

**Step 2: Verify build**

**Step 3: Commit**

---

## Task 4: Fix `obras.ts`

**File:** `src/lib/queries/obras.ts`

**Mismatches found (MOST BROKEN FILE):**
1. Line 87: obras `.select('id, nome, status, endereco')` → `'id, nome, status_obra, cliente'` (no endereco)
2. Line 89: `.ilike('status', ...)` → `.ilike('status_obra', ...)`
3. Lines 104-108: ALL use `obra_id` → `id_obra`
4. Line 105: `valor_total` → `preco_total_item`
5. Line 106: faturamentos `valor` → `valor_parcela`
6. Line 107: cronogramas `percentual_realizado` → doesn't exist; calculate from dates
7. Lines 223-227: ALL `.eq('obra_id', id)` → `.eq('id_obra', id)`
8. Line 237: `o.valor_total` → `o.preco_total_item`
9. Line 240: `f.valor` → `f.valor_parcela`
10. Lines 249,252: cronogramas `percentual_realizado`/`percentual_previsto` → calculate from dates
11. Line 275: `o.categoria` from items_orcamentos → `o.etapa_item`
12. Line 292: cronogramas `c.etapa` → `c.etapa_item`
13. Lines 293-296: `data_inicio` → `data_inicio_planejado`, `data_fim` → `data_fim_planejado`, `data_inicio_real` → `data_inicio_realizado`, `data_fim_real` → `data_fim_realizado`
14. Line 297: `c.percentual_realizado` → calculate from dates
15. Line 312: `p.id` → `p.id_lancamento`
16. Line 319: `p.status` → remove (no status)
17. Lines 330-333: `obra.status` → `obra.status_obra`, remove `data_inicio`, `data_previsao_termino`, `endereco`

**Step 1: Apply all fixes**

This file needs the most changes. Key logic changes:
- Remove `endereco`, `data_inicio`, `data_previsao_termino` from ObraDetailData interface and output
- Calculate cronograma progress from dates: if `data_fim_realizado` exists → 100%, else if `data_inicio_realizado` exists but no `data_fim_realizado` → based on elapsed time
- Replace `p.id` with `p.id_lancamento`, `p.status` with removing status

**Step 2: Verify build**

**Step 3: Commit**

---

## Task 5: Fix `propostas.ts`

**File:** `src/lib/queries/propostas.ts`

**Mismatches found (SEVERELY BROKEN):**
1. Line 49: `id, status, valor, obra_id, data_proposta` → `id_obra, cod_orcamento, status_proposta, preco_total_com_desconto, data_criacao`
2. Lines 50-51: `data_proposta` → `data_criacao`
3. Line 52,121,162,216: `obra_id` → `id_obra`
4. Line 118: `data_proposta, status` → `data_criacao, status_proposta`
5. Line 159: `status, valor` → `status_proposta, preco_total_com_desconto`
6. Line 174: `p.status` → `p.status_proposta`
7. Line 175: `p.valor` → `p.preco_total_com_desconto`
8. Line 211: `id, data_proposta, cliente, valor, status, obra_id` → `id_obra, cod_orcamento, data_criacao, cliente, preco_total_com_desconto, status_proposta`

**Note:** Propostas has NO single `id` column — it uses composite PK (`id_obra`, `cod_orcamento`). The `PropostaListItem` interface needs updating: `id: number` should become `id: string` (composite key) or separate fields.

**Step 1: Rewrite all selects and field references**

**Step 2: Update PropostaListItem interface**

**Step 3: Verify build**

**Step 4: Commit**

---

## Task 6: Fix `contas.ts`

**File:** `src/lib/queries/contas.ts`

**Mismatches found:**
1. Line 89: faturamentos `id` → `id_faturamento`, remove `status`
2. Lines 91-92: `.neq("status", ...)` → remove (rewrite to check against recebimentos)
3. Line 161: lancamentos `id` → `id_lancamento`, remove `status`
4. Lines 163-164: `.neq("status", ...)` → remove (rewrite to check against pagamentos)
5. Lines 234,237: remove status filters
6. Line 298: lancamentos `.select("id, ...")` → `"id_lancamento, ..."`
7. Line 344: faturamentos `.select("id, ...")` → `"id_faturamento, ..."`
8. Line 369: `f.id` → `f.id_faturamento`
9. Line 320-322: `lancVencMap.set(l.id, ...)` → `l.id_lancamento`

**Key logic change:** For "open" items (unpaid/unreceived), fetch pagamentos/recebimentos and cross-reference instead of filtering by status.

**Step 1: Rewrite with cross-reference logic**

**Step 2: Verify build**

**Step 3: Commit**

---

## Task 7: Fix `fluxo-caixa.ts` (minor fixes)

**File:** `src/lib/queries/fluxo-caixa.ts`

This file is **mostly correct** — it already uses `id_obra`, `valor_pago`, `valor_recebido`, `valor_parcela`, `data_pagamento`, `data_recebimento`, etc.

**Only potential issue:** The `recebimentos` table has no `categoria` column, so if any filter tries to apply categoria to recebimentos, it will fail. Check line 64: `.in("categoria", filters.categorias)` on recebimentos — this must be removed.

**Step 1: Remove categoria filter from recebimentos queries (if present)**

**Step 2: Verify build**

**Step 3: Commit**

---

## Task 8: Fix `clientes.ts` (minor fixes)

**File:** `src/lib/queries/clientes.ts`

This file is **mostly correct**. It uses `id_obra`, `valor_parcela`, `valor_recebido`, `id_faturamento`, `numero_parcela`, etc.

**Quick scan for issues:** Verify no `status`, `obra_id`, or other wrong columns are used.

**Step 1: Quick audit pass — fix any remaining mismatches**

**Step 2: Verify build**

**Step 3: Commit**

---

## Task 9: Fix `endpoints.ts` field mapping

**File:** `src/lib/mais-controle/endpoints.ts`

This file has an entirely wrong field mapping structure that doesn't match the sync script. Since the standalone sync script (`scripts/sync.ts`) is what actually works, and the API cron routes use this endpoints.ts, it needs to be rewritten to match.

**However:** If the cron sync routes aren't being used yet (the standalone script works), this is lower priority. The focus should be on getting the dashboard queries working first.

**Step 1: Align field mappings with sync script column names**

**Step 2: Test with a single endpoint sync**

**Step 3: Commit**

---

## Task 10: Verify all pages render correctly

**Step 1: Run `npm run build`**

Ensure zero TypeScript errors.

**Step 2: Run `npm run dev` and check each page**

- `/` — Visao Geral: KPIs should show real values
- `/fluxo-caixa` — Cashflow chart with real data
- `/obras` — Grid of 16 obras
- `/clientes` — Client ranking
- `/categorias` — Category distribution
- `/propostas` — Pipeline with 14 propostas
- `/contas` — Aging receivables/payables
- `/relatorios` — Report page

**Step 3: Commit any remaining fixes**

---

## Execution Order

Tasks 1-8 can be partially parallelized (independent files), but Task 10 depends on all others completing.

Recommended: **Tasks 1-6 are critical** (all have breaking mismatches). Tasks 7-8 are minor. Task 9 is lower priority.

**Priority order:** 1 → 2 → 4 → 5 → 6 → 3 → 7 → 8 → 9 → 10
