import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function preprocessBidText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { rawBidText, masterItems } = await req.json();
    if (!rawBidText || !Array.isArray(masterItems)) {
      return NextResponse.json(
        { error: "Missing 'rawBidText' or 'masterItems' array" },
        { status: 400 }
      );
    }

    const processedText = preprocessBidText(rawBidText);

    // Summarize up to 200 items for the prompt.
    const masterListStr = masterItems
      .slice(0, 200)
      .map((it) => {
        return `ID: ${it.id || "?"}, Desc: ${it.description || ""}, Cost: ${
          it.estimatedCost || 0
        }`;
      })
      .join("\n");

    const systemPrompt = `
You are a specialized construction bid parser. 
You have a list of master items, each with (id, desc, cost). 
You have a raw bid text, split by lines.

For each line in the bid text, pick exactly one master item that best matches that line (never output null).
Then sum the “cost” of all matched items to get matchedTotal. 
If the bid text ends with something like "Total $110,000", treat that as "bidTotal": 110000. 
Otherwise, set "bidTotal": 0.

Return valid JSON only, with no code fences or disclaimers, in this structure:

{
  "parsedLines": [
    {
      "lineText": "...",
      "matchedItemId": "...",
      "estimatedCost": 123.45
    }
  ],
  "matchedTotal": 1234.56,
  "bidTotal": 110000,
  "difference": -108765.44
}

No extra keys. 
If any line does not clearly match, pick the closest item anyway.
Do not wrap your response in triple backticks. 
`.trim();

    const userPrompt = `
Master Items (partial list):
${masterListStr}

Processed Bid Scope Text:
${processedText}
`.trim();

    // 2) Call GPT
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    let aiContent = response.choices?.[0]?.message?.content?.trim() || "";
    if (!aiContent) {
      return NextResponse.json(
        { error: "No content returned from GPT" },
        { status: 500 }
      );
    }

    // Remove code fences if any
    aiContent = aiContent
      .replace(/^```(\w+)?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    // Attempt to parse
    let parsed;
    try {
      parsed = JSON.parse(aiContent);
    } catch (err) {
      return NextResponse.json(
        {
          error: "Invalid JSON from GPT",
          rawResponse: aiContent,
        },
        { status: 500 }
      );
    }

    // If we get here, we have valid JSON
    return NextResponse.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error("parse-bid-scope error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
