import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize the OpenAI client with your API key
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

    // System prompt instructs ChatGPT to output a strict JSON with RFI fields.
    const systemPrompt = `
You are an RFI parser. You will receive a raw summary of a Request for Information (RFI). 
Extract the key details and output a valid JSON object with exactly these fields:

{
  "subject": string,
  "question": string,
  "assignedTo": string,
  "distributionList": [string],
  "dueDate": string,
  "status": string,
  "importance": string,
  "officialResponse": string
}

Rules:
- "subject": the main subject of the RFI.
- "question": the detailed question or description.
- "assignedTo": who is responsible.
- "distributionList": a list of emails (if mentioned), or an empty array.
- "dueDate": the due date in YYYY-MM-DD format (if available), or an empty string.
- "status": e.g. "draft", "open", etc.
- "importance": e.g. "normal", "high", "critical".
- "officialResponse": any response details if mentioned, else an empty string.
Return only the JSON without any extra text.
`;

    const userPrompt = `
Here is the raw RFI summary:
${rawSummary}
`;

    // Call ChatGPT with the combined prompts
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // or gpt-3.5-turbo if needed
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.2,
    });

    let aiContent = response.choices?.[0]?.message?.content?.trim() || "";
    if (!aiContent) {
      return NextResponse.json(
        { error: "No content returned from ChatGPT" },
        { status: 500 }
      );
    }

    // Remove any triple-backtick code fences if present
    aiContent = aiContent
      .replace(/^```(\w+)?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(aiContent);
    } catch (jsonErr: any) {
      console.error("Could not parse JSON from ChatGPT:", aiContent);
      return NextResponse.json(
        { error: "Invalid JSON from ChatGPT", rawResponse: aiContent },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: parsed });
  } catch (err: any) {
    console.error("Error in parse-rfi route:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
