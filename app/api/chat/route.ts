import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, VocabStruggle } from "@/lib/systemPrompt";
import { Scenario } from "@/lib/scenario";

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
    scenario?: Scenario;
    userName?: string;
    level?: string;
    correction?: string;
    vocabStruggles?: VocabStruggle[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    mode = "chat",
    messages: rawMessages,
    conversation,
    userMessage,
    scenario,
    userName = "the student",
    level = "B1",
    correction = "major",
    vocabStruggles = [],
  } = body;

  let messages: { role: string; content: string }[] = [];

  if ((mode === "start" || mode === "chat") && scenario) {
    // Build the dynamic system prompt from the scenario
    const systemPrompt = buildSystemPrompt(scenario, userName, vocabStruggles, level as any, correction as any);

    if (mode === "start") {
      messages = [
        { role: "system", content: systemPrompt },
        // If AI initiates, prompt it to say the opening line
        // If user initiates, this won't be called — the page handles it
        { role: "user", content: "Begin the conversation with your opening line." },
      ];
    } else {
      // mode === "chat"
      const history = Array.isArray(rawMessages) ? rawMessages : [];
      messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessage ?? "" },
      ];
    }
  } else if (mode === "feedback" && Array.isArray(conversation) && conversation.length > 0) {
    const conversationText = conversation
      .map((turn) => `Student: ${turn.user}\nTeacher: ${turn.assistant}`)
      .join("\n\n");
    messages = [
      { role: "system", content: SYSTEM_PROMPT_FEEDBACK },
      {
        role: "user",
        content: `Here is the conversation. List all errors the student made:\n\n${conversationText}`,
      },
    ];
  } else {
    return NextResponse.json(
      { error: "Invalid request: need a valid mode and scenario (or conversation for feedback)" },
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