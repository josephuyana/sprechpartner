// app/api/scenario/route.ts

import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

export async function POST(req: Request) {
  try {
    const { recentIds, userName }: { recentIds: string[]; userName: string } =
      await req.json();

    const avoidClause =
      recentIds.length > 0
        ? `Avoid generating any scenario with these IDs (already used recently): ${recentIds.join(", ")}.`
        : "";

    const prompt = `
You are generating a random, realistic German conversation scenario for a B1-B2 level German learner named ${userName}.

${avoidClause}

Invent a completely original scenario. It can be anything that could realistically happen in daily life in Germany — social, academic, professional, casual, awkward, funny, mundane. Be creative and unpredictable.

Generate ONE scenario as a JSON object with exactly these fields:
- id: a short unique kebab-case slug (e.g. "landlord-mailbox")
- title: short English title (e.g. "Your landlord stops you at the mailbox")
- setting: 1-2 sentence scene description in English, shown to the user before the conversation
- role: one sentence telling ${userName} what their role is and who initiates
- initiator: either "ai" (the other character speaks first) or "user" (${userName} should start)
- openingLine: 
    - If initiator is "ai": the first thing the other character says, in natural colloquial German
    - If initiator is "user": a natural German example phrase that fits the context (e.g. "Hey, was geht?", "Kannst du mich spotten?", "Entschuldigung, wo kann ich mein Handy aufladen?")
- tags: array of 2-3 short strings (e.g. ["neighbor", "small talk", "building"])

Rules:
- The openingLine (when initiator is "ai") must feel natural and colloquial, not textbook German
- Vary the initiator unpredictably across generations
- Return ONLY the raw JSON object, no markdown, no explanation
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4-nano",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: err || "Scenario generation failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Strip markdown fences if the model wraps it anyway
    const clean = raw.replace(/```json|```/g, "").trim();
    const scenario = JSON.parse(clean);

    return NextResponse.json(scenario);
  } catch (error) {
    console.error("[/api/scenario] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate scenario" },
      { status: 500 }
    );
  }
}