import { createClient } from "@/lib/supabase/server";

interface Filters {
  dateFrom: string;
  dateTo: string;
  obras?: string[];
  categorias?: string[];
}

interface CashflowPoint {
  date: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface CashflowByObra {
  obra: string;
  obraId: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface Movimentacao {
  date: string;
  tipo: "entrada" | "saida";
  descricao: string;
  obra: string;
  categoria: string;
  valor: number;
  status: "Realizado" | "Pendente";
}

interface CashGapResult {
  data: { date: string; saldo: number }[];
  gapDate?: string;
  maxDeficit?: number;
}

// ---------------------------------------------------------------------------
// Original function — kept for backward compatibility
// ---------------------------------------------------------------------------

export async function getCashflowSummary(
  filters: Filters
): Promise<CashflowPoint[]> {
  const supabase = await createClient();

  try {
    // Fetch recebimentos in period
    let recQuery = supabase
      .from("recebimentos")
      .select("data_recebimento, valor_recebido")
      .gte("data_recebimento", filters.dateFrom)
      .lte("data_recebimento", filters.dateTo)
      .order("data_recebimento", { ascending: true });
    if (filters.obras?.length)
      recQuery = recQuery.in(
        "id_obra",
        filters.obras.map(Number)
      );
    const { data: recData } = await recQuery.limit(10000);

    // Fetch pagamentos in period
    let pagQuery = supabase
      .from("pagamentos")
      .select("data_pagamento, valor_pago")
      .gte("data_pagamento", filters.dateFrom)
      .lte("data_pagamento", filters.dateTo)
      .order("data_pagamento", { ascending: true });
    if (filters.obras?.length)
      pagQuery = pagQuery.in(
        "id_obra",
        filters.obras.map(Number)
      );
    if (filters.categorias?.length)
      pagQuery = pagQuery.in("categoria", filters.categorias);
    const { data: pagData } = await pagQuery.limit(10000);

    // Build daily map
    const dailyMap = new Map<
      string,
      { entradas: number; saidas: number }
    >();

    for (const r of recData ?? []) {
      if (!r.data_recebimento) continue;
      const d = r.data_recebimento.slice(0, 10);
      const existing = dailyMap.get(d) ?? { entradas: 0, saidas: 0 };
      existing.entradas += r.valor_recebido ?? 0;
      dailyMap.set(d, existing);
    }

    for (const p of pagData ?? []) {
      if (!p.data_pagamento) continue;
      const d = p.data_pagamento.slice(0, 10);
      const existing = dailyMap.get(d) ?? { entradas: 0, saidas: 0 };
      existing.saidas += p.valor_pago ?? 0;
      dailyMap.set(d, existing);
    }

    // Sort by date and compute running saldo
    const sortedDates = [...dailyMap.keys()].sort();
    let runningTotal = 0;
    const result: CashflowPoint[] = sortedDates.map((date) => {
      const { entradas, saidas } = dailyMap.get(date)!;
      runningTotal += entradas - saidas;
      return { date, entradas, saidas, saldo: runningTotal };
    });

    return result;
  } catch (error) {
    console.error("Error fetching cashflow summary:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// New functions for the Fluxo de Caixa page
// ---------------------------------------------------------------------------

/**
 * Get realized cashflow from pagamentos (saidas) and recebimentos (entradas),
 * grouped by day within the date range.
 */
export async function getCashflowRealized(
  filters: Filters
): Promise<CashflowPoint[]> {
  const supabase = await createClient();

  // Realized payments (saidas)
  let pagQuery = supabase
    .from("pagamentos")
    .select("data_pagamento, valor_pago, id_obra")
    .not("data_pagamento", "is", null)
    .gte("data_pagamento", filters.dateFrom)
    .lte("data_pagamento", filters.dateTo);

  if (filters.obras?.length) {
    pagQuery = pagQuery.in(
      "id_obra",
      filters.obras.map(Number)
    );
  }

  const { data: pagamentos } = await pagQuery.limit(10000);

  // Realized receipts (entradas)
  let recQuery = supabase
    .from("recebimentos")
    .select("data_recebimento, valor_recebido, id_obra")
    .not("data_recebimento", "is", null)
    .gte("data_recebimento", filters.dateFrom)
    .lte("data_recebimento", filters.dateTo);

  if (filters.obras?.length) {
    recQuery = recQuery.in(
      "id_obra",
      filters.obras.map(Number)
    );
  }

  const { data: recebimentos } = await recQuery.limit(10000);

  const byDay = new Map<string, { entradas: number; saidas: number }>();

  for (const r of recebimentos ?? []) {
    const date = String(r.data_recebimento);
    const existing = byDay.get(date) ?? { entradas: 0, saidas: 0 };
    existing.entradas += Number(r.valor_recebido) || 0;
    byDay.set(date, existing);
  }

  for (const p of pagamentos ?? []) {
    const date = String(p.data_pagamento);
    const existing = byDay.get(date) ?? { entradas: 0, saidas: 0 };
    existing.saidas += Number(p.valor_pago) || 0;
    byDay.set(date, existing);
  }

  const sortedDates = [...byDay.keys()].sort();
  let runningBalance = 0;

  return sortedDates.map((date) => {
    const day = byDay.get(date)!;
    runningBalance += day.entradas - day.saidas;
    return {
      date,
      entradas: day.entradas,
      saidas: day.saidas,
      saldo: runningBalance,
    };
  });
}

/**
 * Get projected cashflow from lancamentos (future payments) and
 * faturamentos (future receipts) that haven't been realized yet,
 * grouped by day.
 */
export async function getCashflowProjected(
  filters: Filters
): Promise<CashflowPoint[]> {
  const supabase = await createClient();

  // Projected saidas from lancamentos
  let lancQuery = supabase
    .from("lancamentos")
    .select("data_vencimento, valor_parcela, id_obra")
    .not("data_vencimento", "is", null)
    .gte("data_vencimento", filters.dateFrom)
    .lte("data_vencimento", filters.dateTo);

  if (filters.obras?.length) {
    lancQuery = lancQuery.in(
      "id_obra",
      filters.obras.map(Number)
    );
  }

  const { data: lancamentos } = await lancQuery.limit(10000);

  // Projected entradas from faturamentos
  let fatQuery = supabase
    .from("faturamentos")
    .select("data_vencimento, valor_parcela, id_obra")
    .not("data_vencimento", "is", null)
    .gte("data_vencimento", filters.dateFrom)
    .lte("data_vencimento", filters.dateTo);

  if (filters.obras?.length) {
    fatQuery = fatQuery.in(
      "id_obra",
      filters.obras.map(Number)
    );
  }

  const { data: faturamentos } = await fatQuery.limit(10000);

  const byDay = new Map<string, { entradas: number; saidas: number }>();

  for (const l of lancamentos ?? []) {
    const date = String(l.data_vencimento);
    const existing = byDay.get(date) ?? { entradas: 0, saidas: 0 };
    existing.saidas += Number(l.valor_parcela) || 0;
    byDay.set(date, existing);
  }

  for (const f of faturamentos ?? []) {
    const date = String(f.data_vencimento);
    const existing = byDay.get(date) ?? { entradas: 0, saidas: 0 };
    existing.entradas += Number(f.valor_parcela) || 0;
    byDay.set(date, existing);
  }

  const sortedDates = [...byDay.keys()].sort();
  let runningBalance = 0;

  return sortedDates.map((date) => {
    const day = byDay.get(date)!;
    runningBalance += day.entradas - day.saidas;
    return {
      date,
      entradas: day.entradas,
      saidas: day.saidas,
      saldo: runningBalance,
    };
  });
}

/**
 * Get cashflow aggregated by obra.
 */
export async function getCashflowByObra(
  filters: Filters
): Promise<CashflowByObra[]> {
  const supabase = await createClient();

  // Fetch obra names
  const { data: obras } = await supabase.from("obras").select("id, nome");
  const obraMap = new Map<number, string>();
  for (const o of obras ?? []) {
    obraMap.set(o.id, o.nome);
  }

  // Realized payments
  let pagQuery = supabase
    .from("pagamentos")
    .select("id_obra, valor_pago")
    .not("data_pagamento", "is", null)
    .gte("data_pagamento", filters.dateFrom)
    .lte("data_pagamento", filters.dateTo);

  if (filters.obras?.length) {
    pagQuery = pagQuery.in(
      "id_obra",
      filters.obras.map(Number)
    );
  }

  const { data: pagamentos } = await pagQuery.limit(10000);

  // Realized receipts
  let recQuery = supabase
    .from("recebimentos")
    .select("id_obra, valor_recebido")
    .not("data_recebimento", "is", null)
    .gte("data_recebimento", filters.dateFrom)
    .lte("data_recebimento", filters.dateTo);

  if (filters.obras?.length) {
    recQuery = recQuery.in(
      "id_obra",
      filters.obras.map(Number)
    );
  }

  const { data: recebimentos } = await recQuery.limit(10000);

  const byObra = new Map<
    string,
    { obra: string; obraId: string; entradas: number; saidas: number }
  >();

  for (const r of recebimentos ?? []) {
    const obraId = String(r.id_obra ?? "sem-obra");
    const obraName = r.id_obra
      ? obraMap.get(r.id_obra) ?? "Desconhecida"
      : "Sem Obra";
    const existing = byObra.get(obraId) ?? {
      obra: obraName,
      obraId,
      entradas: 0,
      saidas: 0,
    };
    existing.entradas += Number(r.valor_recebido) || 0;
    byObra.set(obraId, existing);
  }

  for (const p of pagamentos ?? []) {
    const obraId = String(p.id_obra ?? "sem-obra");
    const obraName = p.id_obra
      ? obraMap.get(p.id_obra) ?? "Desconhecida"
      : "Sem Obra";
    const existing = byObra.get(obraId) ?? {
      obra: obraName,
      obraId,
      entradas: 0,
      saidas: 0,
    };
    existing.saidas += Number(p.valor_pago) || 0;
    byObra.set(obraId, existing);
  }

  return [...byObra.values()]
    .map((o) => ({ ...o, saldo: o.entradas - o.saidas }))
    .sort((a, b) => b.saldo - a.saldo);
}

/**
 * Get all movements (pagamentos + recebimentos realized, lancamentos + faturamentos pending)
 * for the detail table.
 */
export async function getMovimentacoes(
  filters: Filters
): Promise<Movimentacao[]> {
  const supabase = await createClient();

  // Fetch obra names
  const { data: obras } = await supabase.from("obras").select("id, nome");
  const obraMap = new Map<number, string>();
  for (const o of obras ?? []) {
    obraMap.set(o.id, o.nome);
  }

  const movimentacoes: Movimentacao[] = [];

  // --- Realized payments (saidas) ---
  let pagQuery = supabase
    .from("pagamentos")
    .select("data_pagamento, descricao, id_obra, categoria, valor_pago")
    .not("data_pagamento", "is", null)
    .gte("data_pagamento", filters.dateFrom)
    .lte("data_pagamento", filters.dateTo);

  if (filters.obras?.length) {
    pagQuery = pagQuery.in(
      "id_obra",
      filters.obras.map(Number)
    );
  }

  const { data: pagamentos } = await pagQuery.limit(10000);

  for (const p of pagamentos ?? []) {
    movimentacoes.push({
      date: String(p.data_pagamento),
      tipo: "saida",
      descricao: p.descricao ?? "",
      obra: p.id_obra
        ? obraMap.get(p.id_obra) ?? "Desconhecida"
        : "Sem Obra",
      categoria: p.categoria ?? "Sem categoria",
      valor: Number(p.valor_pago) || 0,
      status: "Realizado",
    });
  }

  // --- Realized receipts (entradas) ---
  let recQuery = supabase
    .from("recebimentos")
    .select("data_recebimento, descricao, id_obra, valor_recebido")
    .not("data_recebimento", "is", null)
    .gte("data_recebimento", filters.dateFrom)
    .lte("data_recebimento", filters.dateTo);

  if (filters.obras?.length) {
    recQuery = recQuery.in(
      "id_obra",
      filters.obras.map(Number)
    );
  }

  const { data: recebimentos } = await recQuery.limit(10000);

  for (const r of recebimentos ?? []) {
    movimentacoes.push({
      date: String(r.data_recebimento),
      tipo: "entrada",
      descricao: r.descricao ?? "",
      obra: r.id_obra
        ? obraMap.get(r.id_obra) ?? "Desconhecida"
        : "Sem Obra",
      categoria: "Recebimento",
      valor: Number(r.valor_recebido) || 0,
      status: "Realizado",
    });
  }

  // --- Pending payments (lancamentos) ---
  let lancQuery = supabase
    .from("lancamentos")
    .select("data_vencimento, descricao, id_obra, categoria, valor_parcela")
    .not("data_vencimento", "is", null)
    .gte("data_vencimento", filters.dateFrom)
    .lte("data_vencimento", filters.dateTo);

  if (filters.obras?.length) {
    lancQuery = lancQuery.in(
      "id_obra",
      filters.obras.map(Number)
    );
  }

  const { data: lancamentos } = await lancQuery.limit(10000);

  for (const l of lancamentos ?? []) {
    movimentacoes.push({
      date: String(l.data_vencimento),
      tipo: "saida",
      descricao: l.descricao ?? "",
      obra: l.id_obra
        ? obraMap.get(l.id_obra) ?? "Desconhecida"
        : "Sem Obra",
      categoria: l.categoria ?? "Sem categoria",
      valor: Number(l.valor_parcela) || 0,
      status: "Pendente",
    });
  }

  // --- Pending receipts (faturamentos) ---
  let fatQuery = supabase
    .from("faturamentos")
    .select("data_vencimento, descricao, id_obra, valor_parcela")
    .not("data_vencimento", "is", null)
    .gte("data_vencimento", filters.dateFrom)
    .lte("data_vencimento", filters.dateTo);

  if (filters.obras?.length) {
    fatQuery = fatQuery.in(
      "id_obra",
      filters.obras.map(Number)
    );
  }

  const { data: faturamentos } = await fatQuery.limit(10000);

  for (const f of faturamentos ?? []) {
    movimentacoes.push({
      date: String(f.data_vencimento),
      tipo: "entrada",
      descricao: f.descricao ?? "",
      obra: f.id_obra
        ? obraMap.get(f.id_obra) ?? "Desconhecida"
        : "Sem Obra",
      categoria: "Faturamento",
      valor: Number(f.valor_parcela) || 0,
      status: "Pendente",
    });
  }

  // Sort by date descending
  movimentacoes.sort((a, b) => b.date.localeCompare(a.date));

  return movimentacoes;
}

/**
 * Project the cash position for the next 90 days to detect
 * when the balance might go negative (cash gap).
 */
export async function getCashGapProjection(): Promise<CashGapResult> {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 90);

  const dateFrom = today.toISOString().split("T")[0];
  const dateTo = futureDate.toISOString().split("T")[0];

  const supabase = await createClient();

  // Get current realized balance (all past recebimentos - pagamentos)
  const { data: totalReceived } = await supabase
    .from("recebimentos")
    .select("valor_recebido")
    .not("data_recebimento", "is", null)
    .lte("data_recebimento", dateFrom)
    .limit(10000);

  const { data: totalPaid } = await supabase
    .from("pagamentos")
    .select("valor_pago")
    .not("data_pagamento", "is", null)
    .lte("data_pagamento", dateFrom)
    .limit(10000);

  let currentBalance =
    (totalReceived ?? []).reduce(
      (sum, r) => sum + (Number(r.valor_recebido) || 0),
      0
    ) -
    (totalPaid ?? []).reduce(
      (sum, p) => sum + (Number(p.valor_pago) || 0),
      0
    );

  // Get projected movements for next 90 days
  const projected = await getCashflowProjected({ dateFrom, dateTo });

  const data: { date: string; saldo: number }[] = [];
  let gapDate: string | undefined;
  let maxDeficit: number | undefined;

  for (const point of projected) {
    currentBalance += point.entradas - point.saidas;
    data.push({ date: point.date, saldo: currentBalance });

    if (currentBalance < 0) {
      if (!gapDate) {
        gapDate = point.date;
      }
      if (maxDeficit === undefined || currentBalance < maxDeficit) {
        maxDeficit = currentBalance;
      }
    }
  }

  // If no projected data, return at least today's balance
  if (data.length === 0) {
    data.push({ date: dateFrom, saldo: currentBalance });
  }

  return { data, gapDate, maxDeficit };
}
