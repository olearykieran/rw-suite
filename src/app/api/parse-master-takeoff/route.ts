/**
 * src/app/api/parse-master-takeoff/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { rawTakeoff, trades } = await req.json();
    // `rawTakeoff`: the text you extracted from your XLSX or CSV
    // `trades`: array of trades we want to categorize, e.g.
    // ["Engineering","Architecture","Electrical","Mechanical","Plumbing","Sprinkler","Fire Alarm"]

    if (!rawTakeoff || typeof rawTakeoff !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'rawTakeoff' text" },
        { status: 400 }
      );
    }

    // If user didn't pass trades, fallback to these:
    const tradesList =
      Array.isArray(trades) && trades.length > 0
        ? trades
        : [
            "Engineering",
            "Architecture",
            "Electrical",
            "Mechanical",
            "Plumbing",
            "Sprinkler",
            "Fire Alarm",
          ];

    // Construct system prompt
    const systemPrompt = `
You are a construction takeoff parser. You will receive raw text from an XLSX or CSV that lists line items.
You must transform it into structured JSON with the following shape:

{
  "items": [
    {
      "trade": string,         // one of: ${tradesList.join(", ")}
      "description": string,   // short description
      "csiCode": string,       // if you see a relevant code like DIV-02 or 22 40 00
      "quantity": number,
      "unit": string,
      "estimatedCost": number
    }
    ...
  ]
}

Rules:
1) You must place each line item in the correct "trade" based on the text, if possible. 
   If uncertain, pick from the given trades or just put "Architecture" or "Mechanical", etc.
2) The "description" is a short text describing that line.
3) "quantity" is numeric if you can find it, else 0.
4) "unit" is something like SF, LF, EA, etc. If not found, leave it blank.
5) "estimatedCost" is numeric, if you see total cost or unit cost * quantity, sum them if possible. If missing, set 0.
6) csiCode is optional if present in text (like "DIV-22" or "CSI 22 40 00"). If not found, you can guess from the context or leave blank.
7) Return only JSON. No extra commentary.
`;

    // We'll feed the rawTakeoff as user content:
    const userPrompt = `
Raw Takeoff:
${rawTakeoff}
`;
    // Call GPT
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 3000,
      temperature: 0.1,
    });

    let aiContent = response.choices?.[0]?.message?.content?.trim() || "";
    if (!aiContent) {
      return NextResponse.json(
        { error: "No content returned from ChatGPT" },
        { status: 500 }
      );
    }

    // Remove code fences if any:
    aiContent = aiContent
      .replace(/^```(\w+)?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(aiContent);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid JSON from ChatGPT", rawResponse: aiContent },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error("parse-master-takeoff error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
