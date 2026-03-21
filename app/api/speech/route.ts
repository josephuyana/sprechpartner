import { NextRequest, NextResponse } from "next/server";

// Free plan premade voices (German + English): Roger, River, Will, Eric, Laura, etc.
const DEFAULT_VOICE_ID = "CwhRBWXzGAHq8TQ4Fs17"; // Roger - Laid-Back, Casual (conversational, supports de/en)

/**
 * Receives ChatGPT's response text and converts it to spoken German or English.
 * Uses ElevenLabs free plan: premade voices, mp3_22050_32, eleven_multilingual_v2.
 * Returns an mp3 file used for playback on the webpage.
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: { text: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { text } = body;
  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "text is required" },
      { status: 400 }
    );
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_22050_32`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2", // supports German and English
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json(
      { error: err || "Speech synthesis failed" },
      { status: response.status }
    );
  }

  const audioBuffer = await response.arrayBuffer();
  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": "inline; filename=speech.mp3",
    },
  });
}
