import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT_CHAT = `You are a friendly German teacher conducting a small-talk practice session. Your role:
- Speak ONLY in German (use clear, natural German suitable for learners)
- Simulate casual small talk: greetings, weather, weekend plans, hobbies, etc.
- Do NOT correct the student's errors during the conversation—just continue naturally as if in a real chat
- Keep responses short (1–3 sentences) for spoken output
- Match the student's level; if they make mistakes, still respond in a natural, encouraging way`;

const SYSTEM_PROMPT_START = `You are a friendly German teacher. The student has just joined a small-talk practice session. Greet them warmly in German and start a casual conversation—e.g. ask how they are or what they've been up to. Keep it brief: 1–2 sentences. Speak only in German.`;

const SYSTEM_PROMPT_FEEDBACK = `You are a German teacher. The student has finished a small-talk practice conversation. Analyze the ENTIRE conversation and list ALL the errors the student made:
- Grammar mistakes (articles, verb conjugation, word order, cases, etc.)
- Vocabulary errors (wrong word, anglicisms where German would be better)
- Spelling/transcription issues if the transcription suggests wrong pronunciation

Format your response clearly: number each error, explain what was wrong, and give the correct form. Be constructive and encouraging. Keep it concise but thorough. You may respond in English for clarity, or in simple German if the student can follow.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: {
    mode?: "start" | "chat" | "feedback";
    messages?: { role: string; content: string }[];
    conversation?: { user: string; assistant: string }[];
    userMessage?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { mode = "chat", messages: rawMessages, conversation, userMessage } = body;

  let messages: { role: string; content: string }[] = [];

  if (mode === "start") {
    messages = [
      { role: "system", content: SYSTEM_PROMPT_START },
      { role: "user", content: "Begin the conversation. Greet me in German." },
    ];
  } else if (mode === "feedback" && Array.isArray(conversation) && conversation.length > 0) {
    const conversationText = conversation
      .map(
        (turn) =>
          `Student: ${turn.user}\nTeacher: ${turn.assistant}`
      )
      .join("\n\n");
    messages = [
      { role: "system", content: SYSTEM_PROMPT_FEEDBACK },
      {
        role: "user",
        content: `Here is the conversation. List all errors the student made:\n\n${conversationText}`,
      },
    ];
  } else if (mode === "chat" && typeof userMessage === "string") {
    const history = Array.isArray(rawMessages) ? rawMessages : [];
    messages = [
      { role: "system", content: SYSTEM_PROMPT_CHAT },
      ...history,
      { role: "user", content: userMessage },
    ];
  } else {
    return NextResponse.json(
      { error: "Invalid request: need mode 'start', 'chat' with userMessage, or 'feedback' with conversation" },
      { status: 400 }
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4-nano",
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json(
      { error: err || "Chat failed" },
      { status: response.status }
    );
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || "";

  return NextResponse.json({ text });
}
