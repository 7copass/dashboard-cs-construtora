import { getClienteDetail } from '@/lib/queries/clientes'
import { ClienteDetailContent } from './cliente-detail-content'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClienteDetailPage({ params }: PageProps) {
  const { id } = await params
  const clienteNome = decodeURIComponent(id)
  const detail = await getClienteDetail(clienteNome)

  return <ClienteDetailContent detail={detail} />
}
