import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MAX_TOKENS_PER_PDF = 4000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, rfiSubject, rfiQuestion, officialResponse, pdfTexts, existingHistory } =
      body;

    console.log("Received RFI data:", {
      subject: rfiSubject,
      question: rfiQuestion,
      hasPdfTexts: Boolean(pdfTexts),
      pdfTextsLength: pdfTexts?.length,
      rawPdfTexts: JSON.stringify(pdfTexts).slice(0, 200) + "...",
    });

    const validPdfTexts = [];
    if (pdfTexts) {
      if (!Array.isArray(pdfTexts)) {
        console.error("PDF texts not in expected array format:", typeof pdfTexts);
      } else {
        console.log("Processing PDF texts array:", pdfTexts);
        pdfTexts.forEach((text, index) => {
          if (!text || typeof text !== "string") {
            console.error(`Invalid PDF text at index ${index}:`, text);
          } else if (text.trim().length === 0) {
            console.warn(`Empty PDF text content at index ${index}`);
          } else {
            // Truncate long PDFs
            const truncatedText =
              text.length > MAX_TOKENS_PER_PDF * 4
                ? text.slice(0, MAX_TOKENS_PER_PDF * 4) +
                  "\n[Content truncated due to length]"
                : text;
            validPdfTexts.push(truncatedText);
          }
        });
      }
    }

    let systemPrompt = `You are an AI assistant for construction project management, focusing on RFIs.
      The user has an RFI with:
        Subject: ${rfiSubject || "N/A"}
        Question: ${rfiQuestion || "N/A"}
        Existing official response: ${officialResponse || "N/A"}`;

    if (validPdfTexts.length > 0) {
      systemPrompt += `
        PDF Extract(s):
        ${validPdfTexts.map((txt, i) => `--- PDF #${i + 1} ---\n${txt}`).join("\n")}`;
    }

    if (existingHistory) {
      systemPrompt += `\nHistorical info: ${existingHistory}`;
    }

    const prompts = {
      summary: "Summarize RFI details and PDF extracts, highlighting key points.",
      riskAnalysis: "Analyze potential schedule/cost impacts and risks.",
      bestPractices: "Suggest relevant code compliance and industry standards.",
      lessonsLearned: "Share lessons learned from similar past RFIs.",
      subDraft: "Draft an official response. Note unclear items.",
      default: "Provide general analysis of the RFI.",
    };

    const userPrompt = prompts[mode] || prompts.default;
    console.log("Using prompt:", userPrompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const aiContent = completion.choices[0]?.message?.content?.trim() || "";
    if (!aiContent) console.warn("Empty AI response received");

    return NextResponse.json({ success: true, result: aiContent });
  } catch (err: any) {
    console.error("AI assistant error:", err);
    console.error("Error details:", {
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      code: err.code,
    });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
