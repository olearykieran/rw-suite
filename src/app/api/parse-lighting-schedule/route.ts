// src/app/api/parse-lighting-schedule/route.ts

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * preprocessLightingText - cleans up the raw text by trimming and removing empty lines.
 */
function preprocessLightingText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { rawLightingText } = await req.json();
    if (!rawLightingText || typeof rawLightingText !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'rawLightingText'" },
        { status: 400 }
      );
    }

    const processedText = preprocessLightingText(rawLightingText);

    // Revised system prompt:
    // - Instruct GPT to extract the fixture type, location, quantity, manufacturer, and control method.
    // - Do NOT use any wattage or electrical data as pricing.
    // - Since no pricing is provided in the schedule, set estimatedCost to 0.
    const systemPrompt = `
You are a specialized construction lighting schedule parser.
You will receive raw text extracted from a lighting schedule PDF.
Extract and structure the data into JSON format with an array of lighting items.
For each item, extract the following details if available:
- fixtureType (e.g., "LED FIXTURE", "FLUSH MOUNT", "NO FIXTURES")
- location (e.g., "OFFICE", "CLOSET", "BATH", "HALL", "MAIN BEDROOM")
- quantity (if a number appears before a location or fixture)
- manufacturer (if available; if not, return an empty string)
- controlMethod (if available; if not, return an empty string)
- estimatedCost can be 0 if it is not provided.
Return only valid JSON with no additional text, markdown formatting, or commentary.
Extract and structure the data into the following JSON format exactly:

{
  "items": [
    {
      "fixtureType": string,
      "location": string,
      "quantity": number,
      "manufacturer": string,
      "controlMethod": string,
      "estimatedCost": number
    },
    
  ]
}

Do not include any additional commentary. Use valid JSON only.
`.trim();

    const userPrompt = `
Raw Lighting Schedule Text:
${processedText}
`.trim();

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // or change to "gpt-3.5-turbo" if needed
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });

    let aiContent = response.choices?.[0]?.message?.content?.trim() || "";
    if (!aiContent) {
      return NextResponse.json(
        { error: "No content returned from GPT" },
        { status: 500 }
      );
    }

    // Remove any code fences if present
    aiContent = aiContent
      .replace(/^```(\w+)?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(aiContent);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid JSON from GPT", rawResponse: aiContent },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error("parse-lighting-schedule error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
