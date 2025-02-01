// src/app/api/parse-meeting/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { rawSummary } = await req.json();
    if (!rawSummary || typeof rawSummary !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'rawSummary' text" },
        { status: 400 }
      );
    }

    // We'll ask ChatGPT to parse the rawSummary into a strict JSON structure,
    // now using headings/enumerations style in "notes" as requested.
    const systemPrompt = `
You are a meeting minutes parser. You will receive a raw meeting summary.

1) You must not leave out any important detail.
2) Each major heading or topic from the raw text should be reflected in the "notes" field, using headings or enumerations similar to the user's example:
   "Key Topics Discussed
    1. Some Heading
    Sub-Heading
    (description)

    2. Next Heading
    (lines)...

   etc."
3) The final output MUST be valid JSON with exactly these fields:

{
  "title": string,
  "date": string,
  "attendees": [
    { "name": string, "email": string, "phone": string, "company": string }
  ],
  "agenda": string,
  "notes": string,
  "nextMeetingDate": string,
  "actionItems": [
    { "status": string, "owner": string, "open": boolean, "notes": string }
  ]
}

Rules:
- "attendees": fill as many fields as possible.
- "agenda": short bullet or line list of the main topics.
- "notes": a multiline, text-based outline with headings and enumerations (like the example). Keep the raw details. No bulleting with '-' for every line. Instead, use headings, enumerations, or subheadings.
- "actionItems": array of tasks. If the raw text indicates a task is finished, "open": false; else default "open": true.

Return no disclaimers or markdown. If unsure, leave fields blank. Output only JSON—no extra text or code fences.
`;

    const userPrompt = `
Here is the raw meeting summary:
${rawSummary}
`;

    // Call GPT
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // or "gpt-3.5-turbo", or "gpt-4o" if you have that
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1800,
      temperature: 0.2,
    });

    // Extract the response text
    let aiContent = response.choices?.[0]?.message?.content?.trim() || "";
    if (!aiContent) {
      return NextResponse.json(
        { error: "No content returned from ChatGPT" },
        { status: 500 }
      );
    }

    // Optionally log for debugging
    console.log("=== ChatGPT RAW ===");
    console.log(aiContent);
    console.log("=== END RAW ===");

    // Strip any triple-backtick fences if they appear
    aiContent = aiContent
      .replace(/^```(\w+)?/gm, "") // remove ```json or ```
      .replace(/```$/gm, "")
      .trim();

    // Try to parse the JSON
    let parsed: any;
    try {
      parsed = JSON.parse(aiContent);
    } catch (jsonErr: any) {
      console.error("Could not parse JSON from ChatGPT:", aiContent);
      return NextResponse.json(
        {
          error: "Invalid JSON from ChatGPT",
          rawResponse: aiContent,
        },
        { status: 500 }
      );
    }

    // Return the parsed data to the client
    return NextResponse.json({ data: parsed });
  } catch (err: any) {
    console.error("Error in parse-meeting route:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
