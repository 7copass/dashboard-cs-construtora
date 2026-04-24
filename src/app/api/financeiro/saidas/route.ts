import { NextRequest, NextResponse } from "next/server";
import { getSaidas } from "@/lib/queries/financeiro";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filters = {
    dateFrom: sp.get("dateFrom") ?? "",
    dateTo: sp.get("dateTo") ?? "",
    obras: sp.get("obras") ? sp.get("obras")!.split(",") : [],
    categoria: sp.get("categoria") ?? "",
    forma: sp.get("forma") ?? "",
    status: sp.get("status") ?? "",
  };
  const data = await getSaidas(filters);
  return NextResponse.json(data);
}
