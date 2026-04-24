export interface Obra {
  id: number
  nome: string
  codigo: string | null
  status: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  data_inicio: string | null
  data_previsao_termino: string | null
  data_termino: string | null
  responsavel: string | null
  area_total: number | null
  unidades: number | null
  synced_at: string | null
}

export interface Lancamento {
  id: number
  obra_id: number | null
  centro_custo: string | null
  centro_custo_id: number | null
  data_lancamento: string | null
  data_competencia: string | null
  data_vencimento: string | null
  descricao: string | null
  categoria: string | null
  subcategoria: string | null
  fornecedor: string | null
  documento: string | null
  valor: number | null
  tipo: string | null
  status: string | null
  synced_at: string | null
}

export interface Pagamento {
  id: string
  obra_id: number | null
  centro_custo: string | null
  centro_custo_id: number | null
  fornecedor: string | null
  documento: string | null
  data_emissao: string | null
  data_vencimento: string | null
  data_pagamento: string | null
  valor: number | null
  valor_pago: number | null
  descricao: string | null
  categoria: string | null
  subcategoria: string | null
  status: string | null
  forma_pagamento: string | null
  synced_at: string | null
}

export interface Recebimento {
  id: string
  obra_id: number | null
  centro_custo: string | null
  centro_custo_id: number | null
  cliente: string | null
  documento: string | null
  data_emissao: string | null
  data_vencimento: string | null
  data_recebimento: string | null
  valor: number | null
  valor_recebido: number | null
  descricao: string | null
  categoria: string | null
  subcategoria: string | null
  status: string | null
  forma_recebimento: string | null
  synced_at: string | null
}

export interface Faturamento {
  id: number
  obra_id: number | null
  centro_custo: string | null
  centro_custo_id: number | null
  numero_nf: string | null
  data_emissao: string | null
  data_competencia: string | null
  cliente: string | null
  descricao: string | null
  valor: number | null
  valor_liquido: number | null
  impostos: number | null
  status: string | null
  synced_at: string | null
}

export interface Proposta {
  id: number
  obra_id: number | null
  centro_custo: string | null
  centro_custo_id: number | null
  numero: string | null
  data_proposta: string | null
  data_validade: string | null
  cliente: string | null
  descricao: string | null
  valor: number | null
  status: string | null
  responsavel: string | null
  synced_at: string | null
}

export interface Cronograma {
  id: number
  obra_id: number | null
  centro_custo: string | null
  centro_custo_id: number | null
  etapa: string | null
  descricao: string | null
  data_inicio: string | null
  data_fim: string | null
  data_inicio_real: string | null
  data_fim_real: string | null
  percentual_previsto: number | null
  percentual_realizado: number | null
  status: string | null
  synced_at: string | null
}

export interface ItemOrcamento {
  id: number
  obra_id: number | null
  centro_custo: string | null
  centro_custo_id: number | null
  codigo: string | null
  descricao: string | null
  unidade: string | null
  quantidade: number | null
  valor_unitario: number | null
  valor_total: number | null
  categoria: string | null
  subcategoria: string | null
  pct_reajuste: number | null
  valor_reajustado: number | null
  synced_at: string | null
}

export interface SyncLog {
  id: string
  endpoint: string
  started_at: string
  finished_at: string | null
  records_processed: number | null
  status: 'running' | 'success' | 'error'
  errors: string | null
}
