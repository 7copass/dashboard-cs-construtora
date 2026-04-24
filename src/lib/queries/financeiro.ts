import { createClient } from "@/lib/supabase/server";

// ─── Input types ─────────────────────────────────────────────────

interface BaseFilters {
  dateFrom: string;
  dateTo: string;
  obras: string[];
}

interface EntradasFilters extends BaseFilters {
  natureza?: string;
  forma?: string;
  status?: string;
}

interface SaidasFilters extends BaseFilters {
  categoria?: string;
  forma?: string;
  status?: string;
}

// ─── Output types ────────────────────────────────────────────────

export interface FinanceiroKpis {
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
  pendenteReceber: number;
  pendentePagar: number;
}

export interface EntradaRow {
  id_faturamento: number;
  numero_parcela: number;
  id_obra: number;
  centro_de_custo: string;
  cliente: string;
  descricao: string;
  natureza: string;
  valor_parcela: number;
  valor_recebido: number;
  data_vencimento: string;
  data_recebimento: string | null;
  forma_recebimento: string | null;
  status: "Recebido" | "Parcial" | "Pendente";
}

export interface SaidaRow {
  id_lancamento: number;
  numero_parcela: number;
  id_obra: number;
  centro_de_custo: string;
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor_parcela: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status: "Pago" | "Parcial" | "Pendente";
}

// ─── getFinanceiroKpis ────────────────────────────────────────────

export async function getFinanceiroKpis(
  filters: BaseFilters
): Promise<FinanceiroKpis> {
  const supabase = await createClient();
  const obraIds = filters.obras.map(Number);

  try {
    // Total Entradas: recebimentos in date range
    let recQuery = supabase
      .from("recebimentos")
      .select("valor_recebido")
      .gte("data_recebimento", filters.dateFrom)
      .lte("data_recebimento", filters.dateTo);
    if (obraIds.length > 0) recQuery = recQuery.in("id_obra", obraIds);
    const { data: recData } = await recQuery.limit(10000);

    const totalEntradas = (recData ?? []).reduce(
      (s, r) => s + (Number(r.valor_recebido) || 0),
      0
    );

    // Total Saidas: pagamentos in date range
    let pagQuery = supabase
      .from("pagamentos")
      .select("valor_pago")
      .gte("data_pagamento", filters.dateFrom)
      .lte("data_pagamento", filters.dateTo);
    if (obraIds.length > 0) pagQuery = pagQuery.in("id_obra", obraIds);
    const { data: pagData } = await pagQuery.limit(10000);

    const totalSaidas = (pagData ?? []).reduce(
      (s, p) => s + (Number(p.valor_pago) || 0),
      0
    );

    const saldo = totalEntradas - totalSaidas;

    // Pendente Receber: faturamentos - recebimentos (unpaid faturamentos)
    let fatQuery = supabase
      .from("faturamentos")
      .select("id_faturamento, numero_parcela, valor_parcela");
    if (obraIds.length > 0) fatQuery = fatQuery.in("id_obra", obraIds);
    const { data: fatData } = await fatQuery.limit(10000);

    let recAllQuery = supabase
      .from("recebimentos")
      .select("id_faturamento, numero_parcela, valor_recebido");
    if (obraIds.length > 0) recAllQuery = recAllQuery.in("id_obra", obraIds);
    const { data: recAllData } = await recAllQuery.limit(10000);

    const recebidoMap = new Map<string, number>();
    for (const r of recAllData ?? []) {
      const key = `${r.id_faturamento}-${r.numero_parcela}`;
      recebidoMap.set(key, (recebidoMap.get(key) ?? 0) + (Number(r.valor_recebido) || 0));
    }

    let pendenteReceber = 0;
    for (const f of fatData ?? []) {
      const key = `${f.id_faturamento}-${f.numero_parcela}`;
      const recebido = recebidoMap.get(key) ?? 0;
      const pendente = (Number(f.valor_parcela) || 0) - recebido;
      if (pendente > 0) pendenteReceber += pendente;
    }

    // Pendente Pagar: lancamentos - pagamentos (unpaid lancamentos)
    let lancQuery = supabase
      .from("lancamentos")
      .select("id_lancamento, numero_parcela, valor_parcela");
    if (obraIds.length > 0) lancQuery = lancQuery.in("id_obra", obraIds);
    const { data: lancData } = await lancQuery.limit(10000);

    let pagAllQuery = supabase
      .from("pagamentos")
      .select("id_lancamento, numero_parcela, valor_pago");
    if (obraIds.length > 0) pagAllQuery = pagAllQuery.in("id_obra", obraIds);
    const { data: pagAllData } = await pagAllQuery.limit(10000);

    const pagoMap = new Map<string, number>();
    for (const p of pagAllData ?? []) {
      const key = `${p.id_lancamento}-${p.numero_parcela}`;
      pagoMap.set(key, (pagoMap.get(key) ?? 0) + (Number(p.valor_pago) || 0));
    }

    let pendentePagar = 0;
    for (const l of lancData ?? []) {
      const key = `${l.id_lancamento}-${l.numero_parcela}`;
      const pago = pagoMap.get(key) ?? 0;
      const pendente = (Number(l.valor_parcela) || 0) - pago;
      if (pendente > 0) pendentePagar += pendente;
    }

    return { totalEntradas, totalSaidas, saldo, pendenteReceber, pendentePagar };
  } catch (error) {
    console.error("Error fetching financeiro KPIs:", error);
    return {
      totalEntradas: 0,
      totalSaidas: 0,
      saldo: 0,
      pendenteReceber: 0,
      pendentePagar: 0,
    };
  }
}

// ─── getEntradas ──────────────────────────────────────────────────

export async function getEntradas(
  filters: EntradasFilters
): Promise<EntradaRow[]> {
  const supabase = await createClient();
  const obraIds = filters.obras.map(Number);

  try {
    // Fetch faturamentos for the obra filter (date filter applied via recebimentos join in JS)
    let fatQuery = supabase
      .from("faturamentos")
      .select(
        "id_faturamento, numero_parcela, id_obra, centro_de_custo, cliente, descricao, natureza, valor_parcela, data_vencimento"
      );
    if (obraIds.length > 0) fatQuery = fatQuery.in("id_obra", obraIds);
    const { data: fatData, error: fatError } = await fatQuery.limit(10000);
    if (fatError) console.error("[getEntradas] faturamentos error:", fatError);

    // Fetch recebimentos for the date range
    let recQuery = supabase
      .from("recebimentos")
      .select(
        "id_faturamento, numero_parcela, id_obra, valor_recebido, data_recebimento, forma_recebimento"
      )
      .gte("data_recebimento", filters.dateFrom)
      .lte("data_recebimento", filters.dateTo);
    if (obraIds.length > 0) recQuery = recQuery.in("id_obra", obraIds);
    const { data: recData } = await recQuery.limit(10000);

    // Build a map: key = "id_faturamento-numero_parcela" -> aggregated recebimento info
    const recMap = new Map<
      string,
      { valorRecebido: number; dataRecebimento: string | null; formaRecebimento: string | null }
    >();
    for (const r of recData ?? []) {
      const key = `${r.id_faturamento}-${r.numero_parcela}`;
      const existing = recMap.get(key);
      const valor = Number(r.valor_recebido) || 0;
      const dataRec = r.data_recebimento ?? null;
      if (!existing) {
        recMap.set(key, {
          valorRecebido: valor,
          dataRecebimento: dataRec,
          formaRecebimento: r.forma_recebimento ?? null,
        });
      } else {
        // Sum values, keep most recent date
        const mostRecent =
          existing.dataRecebimento == null
            ? dataRec
            : dataRec == null
            ? existing.dataRecebimento
            : dataRec > existing.dataRecebimento
            ? dataRec
            : existing.dataRecebimento;
        recMap.set(key, {
          valorRecebido: existing.valorRecebido + valor,
          dataRecebimento: mostRecent,
          formaRecebimento: existing.formaRecebimento ?? r.forma_recebimento ?? null,
        });
      }
    }

    // Merge faturamentos with recebimentos
    let rows: EntradaRow[] = (fatData ?? []).map((f) => {
      const key = `${f.id_faturamento}-${f.numero_parcela}`;
      const rec = recMap.get(key);
      const valorParcela = Number(f.valor_parcela) || 0;
      const valorRecebido = rec?.valorRecebido ?? 0;

      let status: EntradaRow["status"];
      if (valorRecebido >= valorParcela && valorParcela > 0) {
        status = "Recebido";
      } else if (valorRecebido > 0) {
        status = "Parcial";
      } else {
        status = "Pendente";
      }

      return {
        id_faturamento: Number(f.id_faturamento),
        numero_parcela: Number(f.numero_parcela),
        id_obra: Number(f.id_obra),
        centro_de_custo: f.centro_de_custo ?? "",
        cliente: f.cliente ?? "",
        descricao: f.descricao ?? "",
        natureza: f.natureza ?? "",
        valor_parcela: valorParcela,
        valor_recebido: valorRecebido,
        data_vencimento: f.data_vencimento ?? "",
        data_recebimento: rec?.dataRecebimento ?? null,
        forma_recebimento: rec?.formaRecebimento ?? null,
        status,
      };
    });

    // Apply JS-side filters
    if (filters.natureza) {
      rows = rows.filter((r) =>
        r.natureza.toLowerCase().includes(filters.natureza!.toLowerCase())
      );
    }
    if (filters.forma) {
      rows = rows.filter(
        (r) =>
          r.forma_recebimento?.toLowerCase().includes(filters.forma!.toLowerCase()) ?? false
      );
    }
    if (filters.status) {
      rows = rows.filter((r) => r.status === filters.status);
    }

    return rows;
  } catch (error) {
    console.error("Error fetching entradas:", error);
    return [];
  }
}

// ─── getSaidas ────────────────────────────────────────────────────

export async function getSaidas(
  filters: SaidasFilters
): Promise<SaidaRow[]> {
  const supabase = await createClient();
  const obraIds = filters.obras.map(Number);

  try {
    // Fetch lancamentos with date filter on data_vencimento
    let lancQuery = supabase
      .from("lancamentos")
      .select(
        "id_lancamento, numero_parcela, id_obra, centro_de_custo, fornecedor, descricao, categoria, valor_parcela, data_vencimento"
      )
      .gte("data_vencimento", filters.dateFrom)
      .lte("data_vencimento", filters.dateTo);
    if (obraIds.length > 0) lancQuery = lancQuery.in("id_obra", obraIds);
    const { data: lancData, error: lancError } = await lancQuery.limit(10000);
    if (lancError) console.error("[getSaidas] lancamentos error:", lancError);

    // Fetch pagamentos with date filter on data_pagamento for the same period
    let pagQuery = supabase
      .from("pagamentos")
      .select(
        "id_lancamento, numero_parcela, id_obra, valor_pago, data_pagamento, forma_pagamento"
      )
      .gte("data_pagamento", filters.dateFrom)
      .lte("data_pagamento", filters.dateTo);
    if (obraIds.length > 0) pagQuery = pagQuery.in("id_obra", obraIds);
    const { data: pagData } = await pagQuery.limit(10000);

    // Build a map: key = "id_lancamento-numero_parcela" -> aggregated pagamento info
    const pagMap = new Map<
      string,
      { valorPago: number; dataPagamento: string | null; formaPagamento: string | null }
    >();
    for (const p of pagData ?? []) {
      const key = `${p.id_lancamento}-${p.numero_parcela}`;
      const existing = pagMap.get(key);
      const valor = Number(p.valor_pago) || 0;
      const dataPag = p.data_pagamento ?? null;
      if (!existing) {
        pagMap.set(key, {
          valorPago: valor,
          dataPagamento: dataPag,
          formaPagamento: p.forma_pagamento ?? null,
        });
      } else {
        // Sum values, keep most recent date
        const mostRecent =
          existing.dataPagamento == null
            ? dataPag
            : dataPag == null
            ? existing.dataPagamento
            : dataPag > existing.dataPagamento
            ? dataPag
            : existing.dataPagamento;
        pagMap.set(key, {
          valorPago: existing.valorPago + valor,
          dataPagamento: mostRecent,
          formaPagamento: existing.formaPagamento ?? p.forma_pagamento ?? null,
        });
      }
    }

    // Merge lancamentos with pagamentos
    let rows: SaidaRow[] = (lancData ?? []).map((l) => {
      const key = `${l.id_lancamento}-${l.numero_parcela}`;
      const pag = pagMap.get(key);
      const valorParcela = Number(l.valor_parcela) || 0;
      const valorPago = pag?.valorPago ?? 0;

      let status: SaidaRow["status"];
      if (valorPago >= valorParcela && valorParcela > 0) {
        status = "Pago";
      } else if (valorPago > 0) {
        status = "Parcial";
      } else {
        status = "Pendente";
      }

      return {
        id_lancamento: Number(l.id_lancamento),
        numero_parcela: Number(l.numero_parcela),
        id_obra: Number(l.id_obra),
        centro_de_custo: l.centro_de_custo ?? "",
        fornecedor: l.fornecedor ?? "",
        descricao: l.descricao ?? "",
        categoria: l.categoria ?? "",
        valor_parcela: valorParcela,
        valor_pago: valorPago,
        data_vencimento: l.data_vencimento ?? "",
        data_pagamento: pag?.dataPagamento ?? null,
        forma_pagamento: pag?.formaPagamento ?? null,
        status,
      };
    });

    // Apply JS-side filters
    if (filters.categoria) {
      rows = rows.filter((r) =>
        r.categoria.toLowerCase().includes(filters.categoria!.toLowerCase())
      );
    }
    if (filters.forma) {
      rows = rows.filter(
        (r) =>
          r.forma_pagamento?.toLowerCase().includes(filters.forma!.toLowerCase()) ?? false
      );
    }
    if (filters.status) {
      rows = rows.filter((r) => r.status === filters.status);
    }

    return rows;
  } catch (error) {
    console.error("Error fetching saidas:", error);
    return [];
  }
}
