import { createClient } from "@/lib/supabase/server";

interface Filters {
  dateFrom?: string;
  dateTo?: string;
  obras?: string[];
}

// ─── Types ──────────────────────────────────────────────────────

interface AgingFaixas {
  emDia: number;
  ate30: number;
  ate60: number;
  ate90: number;
  mais90: number;
}

interface AgingDetalheReceber {
  cliente: string;
  obra: string;
  valor: number;
  dataVencimento: string;
  diasAtraso: number;
  status: string;
}

interface AgingDetalhesPagar {
  fornecedor: string;
  obra: string;
  valor: number;
  dataVencimento: string;
  diasAtraso: number;
  categoria: string;
}

interface AgingReceberResult {
  faixas: AgingFaixas;
  detalhes: AgingDetalheReceber[];
}

interface AgingPagarResult {
  faixas: AgingFaixas;
  detalhes: AgingDetalhesPagar[];
}

interface PontualidadeResult {
  pagamento: number;
  recebimento: number;
}

// ─── Helpers ────────────────────────────────────────────────────

function diffDays(dateStr: string, today: Date): number {
  const d = new Date(dateStr + "T00:00:00");
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function classifyAging(
  dias: number,
  valor: number,
  faixas: AgingFaixas
): void {
  if (dias <= 0) {
    faixas.emDia += valor;
  } else if (dias <= 30) {
    faixas.ate30 += valor;
  } else if (dias <= 60) {
    faixas.ate60 += valor;
  } else if (dias <= 90) {
    faixas.ate90 += valor;
  } else {
    faixas.mais90 += valor;
  }
}

// ─── getAgingReceber ────────────────────────────────────────────

export async function getAgingReceber(
  filters?: Filters
): Promise<AgingReceberResult> {
  const supabase = await createClient();
  const today = new Date();

  try {
    // Fetch faturamentos (no status column — we cross-reference with recebimentos)
    let fatQuery = supabase
      .from("faturamentos")
      .select("id_faturamento, numero_parcela, cliente, id_obra, valor_parcela, data_vencimento")
      .not("data_vencimento", "is", null);

    if (filters?.obras?.length) {
      fatQuery = fatQuery.in("id_obra", filters.obras.map(Number));
    }

    const { data: faturamentos } = await fatQuery.limit(10000);

    // Fetch all recebimentos to determine what's been received
    const { data: recData } = await supabase
      .from("recebimentos")
      .select("id_faturamento, numero_parcela, valor_recebido")
      .limit(10000);

    const receivedMap = new Map<string, number>();
    for (const r of recData ?? []) {
      const key = `${r.id_faturamento}-${r.numero_parcela}`;
      receivedMap.set(key, (receivedMap.get(key) ?? 0) + (Number(r.valor_recebido) || 0));
    }

    // Fetch obra names
    const { data: obras } = await supabase.from("obras").select("id, nome");
    const obraMap = new Map<number, string>();
    for (const o of obras ?? []) {
      obraMap.set(o.id, o.nome);
    }

    const faixas: AgingFaixas = {
      emDia: 0,
      ate30: 0,
      ate60: 0,
      ate90: 0,
      mais90: 0,
    };
    const detalhes: AgingDetalheReceber[] = [];

    for (const f of faturamentos ?? []) {
      if (!f.data_vencimento) continue;

      // Check if fully received — skip if so
      const key = `${f.id_faturamento}-${f.numero_parcela}`;
      const received = receivedMap.get(key) ?? 0;
      const pendente = (Number(f.valor_parcela) || 0) - received;
      if (pendente <= 0) continue; // fully received, skip

      const dias = diffDays(f.data_vencimento, today);

      classifyAging(dias, pendente, faixas);

      detalhes.push({
        cliente: f.cliente?.trim() || "Sem Cliente",
        obra: f.id_obra
          ? obraMap.get(f.id_obra) ?? "Desconhecida"
          : "Sem Obra",
        valor: pendente,
        dataVencimento: f.data_vencimento,
        diasAtraso: Math.max(0, dias),
        status: "Pendente",
      });
    }

    // Sort by diasAtraso DESC
    detalhes.sort((a, b) => b.diasAtraso - a.diasAtraso);

    return { faixas, detalhes };
  } catch (error) {
    console.error("Error fetching aging receber:", error);
    return {
      faixas: { emDia: 0, ate30: 0, ate60: 0, ate90: 0, mais90: 0 },
      detalhes: [],
    };
  }
}

// ─── getAgingPagar ──────────────────────────────────────────────

export async function getAgingPagar(
  filters?: Filters
): Promise<AgingPagarResult> {
  const supabase = await createClient();
  const today = new Date();

  try {
    // Fetch lancamentos (no status column — we cross-reference with pagamentos)
    let lancQuery = supabase
      .from("lancamentos")
      .select(
        "id_lancamento, numero_parcela, descricao, id_obra, valor_parcela, data_vencimento, categoria, fornecedor"
      )
      .not("data_vencimento", "is", null);

    if (filters?.obras?.length) {
      lancQuery = lancQuery.in("id_obra", filters.obras.map(Number));
    }

    const { data: lancamentos } = await lancQuery.limit(10000);

    // Fetch all pagamentos to determine what's been paid
    const { data: pagData } = await supabase
      .from("pagamentos")
      .select("id_lancamento, numero_parcela, valor_pago")
      .limit(10000);

    const paidMap = new Map<string, number>();
    for (const p of pagData ?? []) {
      const key = `${p.id_lancamento}-${p.numero_parcela}`;
      paidMap.set(key, (paidMap.get(key) ?? 0) + (Number(p.valor_pago) || 0));
    }

    // Fetch obra names
    const { data: obras } = await supabase.from("obras").select("id, nome");
    const obraMap = new Map<number, string>();
    for (const o of obras ?? []) {
      obraMap.set(o.id, o.nome);
    }

    const faixas: AgingFaixas = {
      emDia: 0,
      ate30: 0,
      ate60: 0,
      ate90: 0,
      mais90: 0,
    };
    const detalhes: AgingDetalhesPagar[] = [];

    for (const l of lancamentos ?? []) {
      if (!l.data_vencimento) continue;

      // Check if fully paid — skip if so
      const key = `${l.id_lancamento}-${l.numero_parcela}`;
      const paid = paidMap.get(key) ?? 0;
      const pendente = (Number(l.valor_parcela) || 0) - paid;
      if (pendente <= 0) continue; // fully paid, skip

      const dias = diffDays(l.data_vencimento, today);

      classifyAging(dias, pendente, faixas);

      detalhes.push({
        fornecedor: l.fornecedor?.trim() || "Sem Fornecedor",
        obra: l.id_obra
          ? obraMap.get(l.id_obra) ?? "Desconhecida"
          : "Sem Obra",
        valor: pendente,
        dataVencimento: l.data_vencimento,
        diasAtraso: Math.max(0, dias),
        categoria: l.categoria ?? "Sem Categoria",
      });
    }

    // Sort by diasAtraso DESC
    detalhes.sort((a, b) => b.diasAtraso - a.diasAtraso);

    return { faixas, detalhes };
  } catch (error) {
    console.error("Error fetching aging pagar:", error);
    return {
      faixas: { emDia: 0, ate30: 0, ate60: 0, ate90: 0, mais90: 0 },
      detalhes: [],
    };
  }
}

// ─── getCalendarioVencimentos ───────────────────────────────────

export async function getCalendarioVencimentos(
  filters?: Filters
): Promise<Record<string, { pagar: number; receber: number }>> {
  const supabase = await createClient();

  try {
    // Fetch lancamentos (pagar)
    let lancQuery = supabase
      .from("lancamentos")
      .select("id_lancamento, numero_parcela, data_vencimento, valor_parcela")
      .not("data_vencimento", "is", null);

    if (filters?.obras?.length) {
      lancQuery = lancQuery.in("id_obra", filters.obras.map(Number));
    }

    const { data: lancamentos } = await lancQuery.limit(10000);

    // Fetch faturamentos (receber)
    let fatQuery = supabase
      .from("faturamentos")
      .select("id_faturamento, numero_parcela, data_vencimento, valor_parcela")
      .not("data_vencimento", "is", null);

    if (filters?.obras?.length) {
      fatQuery = fatQuery.in("id_obra", filters.obras.map(Number));
    }

    const { data: faturamentos } = await fatQuery.limit(10000);

    // Fetch pagamentos to cross-reference unpaid lancamentos
    const { data: pagData } = await supabase
      .from("pagamentos")
      .select("id_lancamento, numero_parcela, valor_pago")
      .limit(10000);

    const paidMap = new Map<string, number>();
    for (const p of pagData ?? []) {
      const key = `${p.id_lancamento}-${p.numero_parcela}`;
      paidMap.set(key, (paidMap.get(key) ?? 0) + (Number(p.valor_pago) || 0));
    }

    // Fetch recebimentos to cross-reference unreceived faturamentos
    const { data: recData } = await supabase
      .from("recebimentos")
      .select("id_faturamento, numero_parcela, valor_recebido")
      .limit(10000);

    const receivedMap = new Map<string, number>();
    for (const r of recData ?? []) {
      const key = `${r.id_faturamento}-${r.numero_parcela}`;
      receivedMap.set(key, (receivedMap.get(key) ?? 0) + (Number(r.valor_recebido) || 0));
    }

    const calendario: Record<string, { pagar: number; receber: number }> = {};

    for (const l of lancamentos ?? []) {
      if (!l.data_vencimento) continue;

      // Skip fully paid lancamentos
      const key = `${l.id_lancamento}-${l.numero_parcela}`;
      const paid = paidMap.get(key) ?? 0;
      const pendente = (Number(l.valor_parcela) || 0) - paid;
      if (pendente <= 0) continue;

      const date = l.data_vencimento.slice(0, 10);
      if (!calendario[date]) {
        calendario[date] = { pagar: 0, receber: 0 };
      }
      calendario[date].pagar += pendente;
    }

    for (const f of faturamentos ?? []) {
      if (!f.data_vencimento) continue;

      // Skip fully received faturamentos
      const key = `${f.id_faturamento}-${f.numero_parcela}`;
      const received = receivedMap.get(key) ?? 0;
      const pendente = (Number(f.valor_parcela) || 0) - received;
      if (pendente <= 0) continue;

      const date = f.data_vencimento.slice(0, 10);
      if (!calendario[date]) {
        calendario[date] = { pagar: 0, receber: 0 };
      }
      calendario[date].receber += pendente;
    }

    return calendario;
  } catch (error) {
    console.error("Error fetching calendario vencimentos:", error);
    return {};
  }
}

// ─── getPontualidade ────────────────────────────────────────────

export async function getPontualidade(
  filters?: Filters
): Promise<PontualidadeResult> {
  const supabase = await createClient();

  try {
    // --- Pontualidade de Pagamento ---
    // Lancamentos that have been paid (joined with pagamentos)
    let lancQuery = supabase
      .from("lancamentos")
      .select("id_lancamento, numero_parcela, data_vencimento")
      .not("data_vencimento", "is", null);

    if (filters?.obras?.length) {
      lancQuery = lancQuery.in("id_obra", filters.obras.map(Number));
    }

    const { data: lancamentos } = await lancQuery.limit(10000);

    let pagQuery = supabase
      .from("pagamentos")
      .select("id_lancamento, data_pagamento")
      .not("data_pagamento", "is", null);

    if (filters?.obras?.length) {
      pagQuery = pagQuery.in("id_obra", filters.obras.map(Number));
    }

    const { data: pagamentos } = await pagQuery.limit(10000);

    // Build lancamento vencimento map
    const lancVencMap = new Map<number, string>();
    for (const l of lancamentos ?? []) {
      if (l.data_vencimento) {
        lancVencMap.set(l.id_lancamento, l.data_vencimento);
      }
    }

    // Count on-time payments
    let pagTotal = 0;
    let pagOnTime = 0;
    for (const p of pagamentos ?? []) {
      if (!p.id_lancamento || !p.data_pagamento) continue;
      const vencimento = lancVencMap.get(p.id_lancamento);
      if (!vencimento) continue;
      pagTotal++;
      if (p.data_pagamento <= vencimento) {
        pagOnTime++;
      }
    }

    const pontualidadePagamento =
      pagTotal > 0 ? (pagOnTime / pagTotal) * 100 : 100;

    // --- Pontualidade de Recebimento ---
    let fatQuery = supabase
      .from("faturamentos")
      .select("id_faturamento, numero_parcela, data_vencimento")
      .not("data_vencimento", "is", null);

    if (filters?.obras?.length) {
      fatQuery = fatQuery.in("id_obra", filters.obras.map(Number));
    }

    const { data: faturamentos } = await fatQuery.limit(10000);

    let recQuery = supabase
      .from("recebimentos")
      .select("id_faturamento, data_recebimento")
      .not("data_recebimento", "is", null);

    if (filters?.obras?.length) {
      recQuery = recQuery.in("id_obra", filters.obras.map(Number));
    }

    const { data: recebimentos } = await recQuery.limit(10000);

    // Build faturamento vencimento map
    const fatVencMap = new Map<number, string>();
    for (const f of faturamentos ?? []) {
      if (f.data_vencimento) {
        fatVencMap.set(f.id_faturamento, f.data_vencimento);
      }
    }

    // Count on-time receipts
    let recTotal = 0;
    let recOnTime = 0;
    for (const r of recebimentos ?? []) {
      if (!r.id_faturamento || !r.data_recebimento) continue;
      const vencimento = fatVencMap.get(r.id_faturamento);
      if (!vencimento) continue;
      recTotal++;
      if (r.data_recebimento <= vencimento) {
        recOnTime++;
      }
    }

    const pontualidadeRecebimento =
      recTotal > 0 ? (recOnTime / recTotal) * 100 : 100;

    return {
      pagamento: Math.round(pontualidadePagamento * 10) / 10,
      recebimento: Math.round(pontualidadeRecebimento * 10) / 10,
    };
  } catch (error) {
    console.error("Error fetching pontualidade:", error);
    return { pagamento: 0, recebimento: 0 };
  }
}
