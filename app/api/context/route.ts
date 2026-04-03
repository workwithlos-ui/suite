import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "semantic.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    const response = {
      operator: data.operator ?? null,
      activeClients: data.activeClients ?? [],
      products: data.products ?? [],
      proofBank: data.proofBank ?? {},
      spcl: data.spcl ?? {},
      rules: data.rules ?? {},
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load context";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
