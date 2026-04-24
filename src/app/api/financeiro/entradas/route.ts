import { NextRequest, NextResponse } from "next/server";
import { getEntradas } from "@/lib/queries/financeiro";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filters = {
    dateFrom: sp.get("dateFrom") ?? "",
    dateTo: sp.get("dateTo") ?? "",
    obras: sp.get("obras") ? sp.get("obras")!.split(",") : [],
    natureza: sp.get("natureza") ?? "",
    forma: sp.get("forma") ?? "",
    status: sp.get("status") ?? "",
  };
  const data = await getEntradas(filters);
  return NextResponse.json(data);
}
