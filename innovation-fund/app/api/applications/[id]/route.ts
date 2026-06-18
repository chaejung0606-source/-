import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fromRow } from "@/lib/app-mapper";

function isAdmin(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabaseAdmin().from("applications").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(fromRow(data));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const patch: Record<string, any> = {};
  if (body.reviewStatus !== undefined) patch.review_status = body.reviewStatus;
  if (body.paymentStatus !== undefined) patch.payment_status = body.paymentStatus;
  if (body.adminMemo !== undefined) patch.admin_memo = body.adminMemo;
  if (body.approvedAmount !== undefined) patch.approved_amount = body.approvedAmount;

  const { data, error } = await supabaseAdmin().from("applications").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(fromRow(data));
}
