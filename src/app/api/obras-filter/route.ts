import { NextResponse } from "next/server";
import { getObrasForFilter } from "@/lib/queries/obras";

export async function GET() {
  const obras = await getObrasForFilter();
  return NextResponse.json(obras);
}
