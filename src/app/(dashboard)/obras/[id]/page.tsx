import { notFound } from "next/navigation"
import { getObraDetail } from "@/lib/queries/obras"
import { ObraDetailContent } from "./obra-detail-content"

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
  searchParams: {
    dateFrom?: string;
    dateTo?: string;
    categorias?: string;
  };
}

function getDefaultDates() {
  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}

export default async function ObraDetailPage({ params, searchParams }: PageProps) {
  const { id } = 'then' in params ? await params : params;
  
  const defaults = getDefaultDates();
  const filters = {
    dateFrom: searchParams.dateFrom ?? defaults.dateFrom,
    dateTo: searchParams.dateTo ?? defaults.dateTo,
    categorias: searchParams.categorias ? searchParams.categorias.split(",") : undefined,
  };

  const detail = await getObraDetail(id, filters);

  if (!detail) {
    notFound();
  }

  return (
    <ObraDetailContent
      obraId={id}
      info={detail.info}
      kpis={detail.kpis}
      kpisAvancados={detail.kpisAvancados}
      etapas={detail.etapas}
      cronograma={detail.cronograma}
      gastosPorCategoria={detail.gastosPorCategoria}
      pagamentosDetalhados={detail.pagamentosDetalhados}
    />
  )
}
