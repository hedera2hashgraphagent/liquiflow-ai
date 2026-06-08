/**
 * Server-side AP2 MPP payment — calls hederaService.executeAP2Payment()
 * with operator credentials from .env.local (never exposed to the browser).
 */

import { executeAP2Payment, AP2PaymentError } from "@/lib/hederaService";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount = Number(body?.amount ?? 10);
    const operatorId = process.env.HEDERA_OPERATOR_ID?.trim();

    if (!operatorId) {
      return NextResponse.json(
        { error: "HEDERA_OPERATOR_ID not configured in .env.local." },
        { status: 500 },
      );
    }

    const result = await executeAP2Payment(operatorId, amount);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof AP2PaymentError
        ? error.message
        : error instanceof Error
          ? error.message
          : "AP2 payment failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
