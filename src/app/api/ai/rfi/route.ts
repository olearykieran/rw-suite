// File: src/app/api/ai/rfi/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI API configuration
const config = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your .env file
});
// OpenAI instance is already created above with the config

/**
 * POST /api/ai/rfi
 * Body: {
 *   subject: string;
 *   question: string;
 *   officialResponse?: string;
 *   attachments?: string[]; // optional
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the JSON body of the request
    const body = await req.json();
    const { subject, question, officialResponse, attachments } = body;

    // Construct the user prompt
    const userPrompt = `
      You are an AI assistant helping with construction RFIs (Requests for Information).
      The user seeks to summarize or refine details of an RFI.

      RFI Subject: "${subject}"
      Question/Description: "${question}"
      Existing official response: "${officialResponse || "N/A"}"

      Provide a concise, human-friendly summary or possible improvement.
      If there's insufficient information, politely ask clarifying questions.
    `;
    // Call the OpenAI API to create a chat completion
    const completion = await config.chat.completions.create({
      model: "gpt-4o", // Using GPT-4 model
      messages: [
        { role: "system", content: "You are a helpful AI assistant for managing RFIs." },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 250,
      temperature: 0.3,
    });
    // Extract the AI-generated text from the response
    const aiText = completion.choices[0]?.message?.content?.trim() || "";

    // Return the AI-generated text as a JSON response
    return NextResponse.json({ success: true, aiText });
  } catch (err: any) {
    console.error("AI RFI route error:", err);
    // Return an error response with a 500 status code
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
