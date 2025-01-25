// File: src/app/api/ai/rfi/chat/route.ts

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI API configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your .env file
});

/**
 * POST /api/ai/rfi/chat
 * Body: {
 *   messages: { role: string; content: string }[];
 *   rfiSubject?: string;
 *   rfiQuestion?: string;
 *   rfiAttachments?: string[];
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the JSON body of the request
    const body = await req.json();
    const { messages, rfiSubject, rfiQuestion, rfiAttachments } = body;

    // Construct the "system" prompt to provide RFI context
    const systemPrompt = `
      You are an AI assistant for construction management, focusing on RFIs (Requests For Information).
      The user may ask questions about:
        - RFI Subject: "${rfiSubject || "N/A"}"
        - RFI Question/Details: "${rfiQuestion || "N/A"}"
        - Attachments: ${rfiAttachments?.length || 0} file(s).

      You don't have access to the actual content of the attachments. 
      If referenced, offer general suggestions or clarifications instead.
      Provide concise, helpful answers.
    `;

    // Combine the system prompt with the conversation messages
    const openAiMessages = [
      { role: "system", content: systemPrompt },
      ...messages, // includes user + assistant messages so far
    ];

    // Use the OpenAI API to generate a chat completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Updated to the GPT-4 model
      messages: openAiMessages,
      max_tokens: 300,
      temperature: 0.3,
    });

    // Extract the AI response from the API result
    const aiResponse = completion.choices[0]?.message?.content?.trim() || "No response";

    // Return the AI response as a JSON response
    return NextResponse.json({ success: true, aiResponse });
  } catch (err: any) {
    console.error("AI Chat route error:", err);
    // Return an error response with a 500 status code
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
