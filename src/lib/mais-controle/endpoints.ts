// ─── Type converters ─────────────────────────────────────────────────────────

/** Convert dd/MM/yyyy → yyyy-MM-dd (Supabase date format). Returns null if blank. */
export function convertDate(value: string | null | undefined): string | null {
  if (!value) return null
  const parts = value.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  if (!day || !month || !year) return null
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * Convert a numeric string to float.
 * Handles two formats sent by the Mais Controle API:
 *   - Brazilian: "1.234,56"  → thousands dot, comma decimal → 1234.56
 *   - US/decimal: "1234.56"  → no thousands sep, period decimal → 1234.56
 * Strategy: if the string contains a comma, treat as Brazilian format (remove dots, swap comma→dot).
 * Otherwise treat as US decimal (parse directly).
 */
export function convertNumeric(value: string | null | undefined): number | null {
  if (!value) return null
  let cleaned: string
  if (value.includes(',')) {
    // Brazilian format: "1.234,56" → remove thousands dots, replace comma with period
    cleaned = value.replace(/\./g, '').replace(',', '.')
  } else {
    // US / plain decimal format: "1234.56" or "1234" — parse as-is
    cleaned = value
  }
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/** Convert string → integer. Returns null if blank. */
export function convertInt(value: string | null | undefined): number | null {
  if (!value) return null
  const num = parseInt(value, 10)
  return isNaN(num) ? null : num
}

// ─── Config type ─────────────────────────────────────────────────────────────

export interface EndpointConfig {
  name: string
  table: string
  /** Column(s) for upsert conflict resolution. Comma-separated for composite keys. */
  onConflict: string
  transformRow: (row: Record<string, string | null>) => Record<string, unknown>
}

// ─── Endpoint definitions ─────────────────────────────────────────────────────
// API field names match DB column names exactly — only type conversion is needed.
// Dates arrive as dd/MM/yyyy and must be converted to yyyy-MM-dd.
// Numerics arrive as Brazilian formatted strings ("1.234,56").

export const endpoints: EndpointConfig[] = [
  // ── obras ──────────────────────────────────────────────────────────────────
  // DB PK: id
  {
    name: 'obras',
    table: 'obras',
    onConflict: 'id',
    transformRow(row) {
      return {
        id:                  convertInt(row['id']),
        nome:                row['nome'],
        status_obra:         row['status_obra'],
        codigo_obra:         row['codigo_obra'],
        tipo_obra:           row['tipo_obra'],
        responsavel_obra:    row['responsavel_obra'],
        responsavel_tecnico: row['responsavel_tecnico'],
        area_total:          convertNumeric(row['area_total']),
        unidade_area_total:  row['unidade_area_total'],
        cliente:             row['cliente'],
      }
    },
  },

  // ── lancamentos ────────────────────────────────────────────────────────────
  // DB unique: (id_lancamento, numero_parcela) — one lancamento can have multiple parcelas
  {
    name: 'lancamentos',
    table: 'lancamentos',
    onConflict: 'id_lancamento,numero_parcela',
    transformRow(row) {
      return {
        id_lancamento:            convertInt(row['id_lancamento']),
        id_obra:                  convertInt(row['id_obra']),
        centro_de_custo:          row['centro_de_custo'],
        fornecedor:               row['fornecedor'],
        descricao:                row['descricao'],
        numero_documento:         row['numero_documento'],
        data_competencia:         convertDate(row['data_competencia']),
        valor_total_lancamento:   convertNumeric(row['valor_total_lancamento']),
        conta_bancaria:           row['conta_bancaria'],
        categoria:                row['categoria'],
        condicao_pagamento:       row['condicao_pagamento'],
        numero_parcela:           convertInt(row['numero_parcela']),
        valor_parcela:            convertNumeric(row['valor_parcela']),
        data_vencimento:          convertDate(row['data_vencimento']),
        indice_item_orcamento:    row['indice_item_orcamento'],
        possui_vinculo_estoque:   row['possui_vinculo_estoque'],
        ordem_de_compra:          row['ordem_de_compra'],
        data_lancamento:          convertDate(row['data_lancamento']),
      }
    },
  },

  // ── pagamentos ─────────────────────────────────────────────────────────────
  // DB unique: (id_lancamento, numero_parcela)
  {
    name: 'pagamentos',
    table: 'pagamentos',
    onConflict: 'id_lancamento,numero_parcela',
    transformRow(row) {
      return {
        id_lancamento:         convertInt(row['id_lancamento']),
        data_competencia:      convertDate(row['data_competencia']),
        data_vencimento:       convertDate(row['data_vencimento']),
        data_pagamento:        convertDate(row['data_pagamento']),
        numero_parcela:        convertInt(row['numero_parcela']),
        valor_parcela:         convertNumeric(row['valor_parcela']),
        valor_pago:            convertNumeric(row['valor_pago']),
        valor_desconto:        convertNumeric(row['valor_desconto']),
        valor_juros_e_multa:   convertNumeric(row['valor_juros_e_multa']),
        fornecedor:            row['fornecedor'],
        descricao:             row['descricao'],
        numero_documento:      row['numero_documento'],
        categoria:             row['categoria'],
        grupo:                 row['grupo'],
        plano_de_conta:        row['plano_de_conta'],
        condicao_pagamento:    row['condicao_pagamento'],
        forma_pagamento:       row['forma_pagamento'],
        quem_paga:             row['quem_paga'],
        conta_bancaria:        row['conta_bancaria'],
        id_obra:               convertInt(row['id_obra']),
        centro_de_custo:       row['centro_de_custo'],
        indice_item_orcamento: row['indice_item_orcamento'],
        ordem_de_compra:       row['ordem_de_compra'],
      }
    },
  },

  // ── recebimentos ───────────────────────────────────────────────────────────
  // DB unique: (id_faturamento, numero_parcela)
  {
    name: 'recebimentos',
    table: 'recebimentos',
    onConflict: 'id_faturamento,numero_parcela',
    transformRow(row) {
      return {
        id_faturamento:       convertInt(row['id_faturamento']),
        data_competencia:     convertDate(row['data_competencia']),
        data_vencimento:      convertDate(row['data_vencimento']),
        data_recebimento:     convertDate(row['data_recebimento']),
        numero_parcela:       convertInt(row['numero_parcela']),
        valor_parcela:        convertNumeric(row['valor_parcela']),
        valor_recebido:       convertNumeric(row['valor_recebido']),
        valor_desconto:       convertNumeric(row['valor_desconto']),
        valor_juros_e_multa:  convertNumeric(row['valor_juros_e_multa']),
        id_obra:              convertInt(row['id_obra']),
        centro_de_custo:      row['centro_de_custo'],
        cliente:              row['cliente'],
        descricao:            row['descricao'],
        numero_documento:     row['numero_documento'],
        condicao_recebimento: row['condicao_recebimento'],
        conta_bancaria:       row['conta_bancaria'],
        forma_recebimento:    row['forma_recebimento'],
        natureza:             row['natureza'],
      }
    },
  },

  // ── faturamentos ───────────────────────────────────────────────────────────
  // DB PK: (id_faturamento, numero_parcela)
  // Note: API sends "%_reajuste" and "%_reajuste_acumulado" — rename to pct_*
  {
    name: 'faturamentos',
    table: 'faturamentos',
    onConflict: 'id_faturamento,numero_parcela',
    transformRow(row) {
      return {
        id_faturamento:              convertInt(row['id_faturamento']),
        id_obra:                     convertInt(row['id_obra']),
        centro_de_custo:             row['centro_de_custo'],
        cliente:                     row['cliente'],
        descricao:                   row['descricao'],
        data_competencia:            convertDate(row['data_competencia']),
        valor_bruto:                 convertNumeric(row['valor_bruto']),
        impostos:                    convertNumeric(row['impostos']),
        valor_liquido:               convertNumeric(row['valor_liquido']),
        numero_parcela:              convertInt(row['numero_parcela']),
        valor_parcela:               convertNumeric(row['valor_parcela']),
        data_vencimento:             convertDate(row['data_vencimento']),
        conta_bancaria:              row['conta_bancaria'],
        natureza:                    row['natureza'],
        condicao_recebimento:        row['condicao_recebimento'],
        numero_documento:            row['numero_documento'],
        vendedor:                    row['vendedor'],
        calculo_reajuste_acumulado:  row['calculo_reajuste_acumulado'],
        tipo:                        row['tipo'],
        valor:                       convertNumeric(row['valor']),
        tabela_reajuste:             row['tabela_reajuste'],
        // API sends "%_reajuste" — DB column is pct_reajuste
        pct_reajuste:                convertNumeric(row['%_reajuste']),
        pct_reajuste_acumulado:      convertNumeric(row['%_reajuste_acumulado']),
        data_faturamento:            convertDate(row['data_faturamento']),
      }
    },
  },

  // ── propostas ──────────────────────────────────────────────────────────────
  // DB PK: (id_obra, cod_orcamento)
  {
    name: 'propostas',
    table: 'propostas',
    onConflict: 'id_obra,cod_orcamento',
    transformRow(row) {
      return {
        id_obra:                    convertInt(row['id_obra']),
        obra:                       row['obra'],
        cod_orcamento:              row['cod_orcamento'],
        cliente:                    row['cliente'],
        status_proposta:            row['status_proposta'],
        data_criacao:               convertDate(row['data_criacao']),
        data_entrega:               convertDate(row['data_entrega']),
        data_venda:                 convertDate(row['data_venda']),
        responsavel:                row['responsavel'],
        cond_pgto:                  row['cond_pgto'],
        desconto:                   convertNumeric(row['desconto']),
        preco_total_com_desconto:   convertNumeric(row['preco_total_com_desconto']),
      }
    },
  },

  // ── cronogramas ────────────────────────────────────────────────────────────
  // DB PK: (id_obra, indice)
  {
    name: 'cronogramas',
    table: 'cronogramas',
    onConflict: 'id_obra,indice',
    transformRow(row) {
      return {
        id_obra:                    convertInt(row['id_obra']),
        obra:                       row['obra'],
        indice:                     row['indice'],
        etapa_item:                 row['etapa_item'],
        descricao:                  row['descricao'],
        dias_uteis_desconsiderar:   row['dias_uteis_desconsiderar'],
        dias_uteis_planejado:       convertInt(row['dias_uteis_planejado']),
        dias_corridos_planejado:    convertInt(row['dias_corridos_planejado']),
        data_inicio_planejado:      convertDate(row['data_inicio_planejado']),
        data_fim_planejado:         convertDate(row['data_fim_planejado']),
        dias_uteis_realizado:       convertInt(row['dias_uteis_realizado']),
        dias_corridos_realizado:    convertInt(row['dias_corridos_realizado']),
        data_inicio_realizado:      convertDate(row['data_inicio_realizado']),
        data_fim_realizado:         convertDate(row['data_fim_realizado']),
      }
    },
  },

  // ── items-orcamentos ───────────────────────────────────────────────────────
  // DB PK: (id_obra, indice)
  {
    name: 'items-orcamentos',
    table: 'items_orcamentos',
    onConflict: 'id_obra,indice',
    transformRow(row) {
      return {
        id_obra:                         convertInt(row['id_obra']),
        obra:                            row['obra'],
        indice:                          row['indice'],
        etapa_item:                      row['etapa_item'],
        codigo_item:                     row['codigo_item'],
        base:                            row['base'],
        tipo:                            row['tipo'],
        descricao:                       row['descricao'],
        unid:                            row['unid'],
        qtde:                            convertNumeric(row['qtde']),
        custo_unitario_mao_de_obra:      convertNumeric(row['custo_unitario_mao_de_obra']),
        custo_unitario_material:         convertNumeric(row['custo_unitario_material']),
        custo_unitario_equipamento:      convertNumeric(row['custo_unitario_equipamento']),
        custo_unitario_outros:           convertNumeric(row['custo_unitario_outros']),
        custo_unitario_item:             convertNumeric(row['custo_unitario_item']),
        custo_total_mao_de_obra:         convertNumeric(row['custo_total_mao_de_obra']),
        custo_total_material:            convertNumeric(row['custo_total_material']),
        custo_total_equipamento:         convertNumeric(row['custo_total_equipamento']),
        custo_total_outros:              convertNumeric(row['custo_total_outros']),
        custo_total_item:                convertNumeric(row['custo_total_item']),
        bdi_item:                        convertNumeric(row['bdi_item']),
        preco_unitario_mao_de_obra:      convertNumeric(row['preco_unitario_mao_de_obra']),
        preco_unitario_material:         convertNumeric(row['preco_unitario_material']),
        preco_unitario_equipamento:      convertNumeric(row['preco_unitario_equipamento']),
        preco_unitario_outros:           convertNumeric(row['preco_unitario_outros']),
        preco_unitario_item:             convertNumeric(row['preco_unitario_item']),
        preco_total_mao_de_obra:         convertNumeric(row['preco_total_mao_de_obra']),
        preco_total_material:            convertNumeric(row['preco_total_material']),
        preco_total_equipamento:         convertNumeric(row['preco_total_equipamento']),
        preco_total_outros:              convertNumeric(row['preco_total_outros']),
        preco_total_item:                convertNumeric(row['preco_total_item']),
      }
    },
  },
]

export function getEndpointConfig(name: string): EndpointConfig | undefined {
  return endpoints.find((e) => e.name === name)
}

export const SYNC_ORDER = [
  'obras',
  'lancamentos',
  'pagamentos',
  'recebimentos',
  'faturamentos',
  'propostas',
  'cronogramas',
  'items-orcamentos',
]
