import { NextRequest, NextResponse } from "next/server";
import { getApplicationById, updateApplication } from "@/lib/mock-data";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const app = getApplicationById(params.id);
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(app);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const updated = updateApplication(params.id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
