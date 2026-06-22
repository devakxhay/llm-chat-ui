import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
  }

  try {
    const row = db.prepare("SELECT value FROM kv WHERE key = ?").get(key) as { value: string } | undefined;
    if (!row) {
      return NextResponse.json({ value: null });
    }

    let decryptedValue: string;
    try {
      decryptedValue = decrypt(row.value);
    } catch {
      // Fallback: Check if it was legacy plaintext
      try {
        JSON.parse(row.value);
        decryptedValue = row.value;
      } catch {
        return NextResponse.json({ value: null });
      }
    }

    return NextResponse.json({ value: JSON.parse(decryptedValue) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, value } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    const valueStr = JSON.stringify(value);
    const encryptedStr = encrypt(valueStr);
    
    db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)").run(key, encryptedStr);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
  }

  try {
    db.prepare("DELETE FROM kv WHERE key = ?").run(key);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
