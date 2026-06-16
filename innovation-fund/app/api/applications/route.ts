import { NextRequest, NextResponse } from "next/server";
import { createApplication, getApplications } from "@/lib/mock-data";

export async function GET() {
  const apps = getApplications();
  return NextResponse.json(apps);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const app = createApplication(body);
  return NextResponse.json(app, { status: 201 });
}
