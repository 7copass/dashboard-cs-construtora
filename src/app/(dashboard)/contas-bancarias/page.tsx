import { getContasBancariasData } from '@/lib/queries/contas-bancarias'
import { ContasBancariasContent } from './contas-bancarias-content'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; obras?: string }>
}

export default async function ContasBancariasPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const obras = sp.obras ? sp.obras.split(',').filter(Boolean) : []

  const data = await getContasBancariasData({
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    obras: obras.length ? obras : undefined,
  })

  return <ContasBancariasContent data={data} />
}
