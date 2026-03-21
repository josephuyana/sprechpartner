import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "No audio file provided" },
      { status: 400 }
    );
  }

  const openaiFormData = new FormData();
  openaiFormData.append("file", file);
  openaiFormData.append("model", "whisper-1");
  openaiFormData.append(
    "prompt",
    "Transcription in German or English. The speaker uses one of these languages. Hello, Guten Tag."
  );

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: openaiFormData,
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json(
      { error: err || "Transcription failed" },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json({ text: data.text || "" });
}
