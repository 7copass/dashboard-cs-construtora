import {
  getPropostasPipeline,
  getConversaoMensal,
  getPropostasKPIs,
  getPropostasList,
} from "@/lib/queries/propostas"
import { PropostasContent } from "./propostas-content"

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string
    dateTo?: string
    obras?: string
  }>
}

export default async function PropostasPage({ searchParams }: PageProps) {
  const params = await searchParams

  const obras = params.obras ? params.obras.split(",") : undefined
  const filters = {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    obras,
  }

  const [pipeline, conversaoMensal, kpis, propostas] = await Promise.all([
    getPropostasPipeline(filters),
    getConversaoMensal(filters),
    getPropostasKPIs(filters),
    getPropostasList(filters),
  ])

  const funnelStages = [
    {
      label: "Pendente",
      count: pipeline.pendente.count,
      value: pipeline.pendente.valor,
      color: "#F59E0B",
    },
    {
      label: "Aprovada",
      count: pipeline.aprovada.count,
      value: pipeline.aprovada.valor,
      color: "#22C55E",
    },
    {
      label: "Obra Iniciada",
      count: pipeline.obraIniciada.count,
      value: pipeline.obraIniciada.valor,
      color: "#3B82F6",
    },
  ]

  const conversionRates = [pipeline.taxaConversao12, pipeline.taxaConversao23]

  return (
    <PropostasContent
      funnelStages={funnelStages}
      conversionRates={conversionRates}
      conversaoMensal={conversaoMensal}
      kpis={kpis}
      propostas={propostas}
    />
  )
}
