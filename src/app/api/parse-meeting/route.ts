import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * Improves JSON truncation fixing by adding better JSON validation and structure checking
 */
function fixTruncatedJson(text: string): string {
  let fixedText = text.trim();

  // First, try to find a complete outer object/array structure
  const firstOpen = fixedText.search(/[{\[]/);
  if (firstOpen === -1) return fixedText;

  const firstChar = fixedText[firstOpen];
  const matchingChar = firstChar === "{" ? "}" : "]";

  // Stack-based parsing to handle nested structures
  let stack = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < fixedText.length; i++) {
    const char = fixedText[i];

    if (!inString) {
      if (char === "{" || char === "[") {
        stack.push(char);
      } else if (char === "}" || char === "]") {
        if (stack.length === 0) {
          // Unmatched closing bracket - truncate here
          fixedText = fixedText.slice(0, i);
          break;
        }
        const last = stack.pop();
        if ((char === "}" && last !== "{") || (char === "]" && last !== "[")) {
          // Mismatched brackets - truncate here
          fixedText = fixedText.slice(0, i);
          break;
        }
      } else if (char === '"' && !escaped) {
        inString = true;
      }
    } else {
      if (char === '"' && !escaped) {
        inString = false;
      }
    }
    escaped = char === "\\" && !escaped;
  }

  // Complete any unclosed strings
  if (inString) {
    fixedText += '"';
  }

  // Complete any unclosed structures
  while (stack.length > 0) {
    const char = stack.pop();
    fixedText += char === "{" ? "}" : "]";
  }

  return fixedText;
}

/**
 * More robust JSON extraction that handles nested structures correctly
 */
function extractValidJson(text: string): string {
  // Find the outermost JSON object/array
  const firstBrace = text.search(/[{\[]/);
  if (firstBrace === -1) return text;

  let stack = [];
  let inString = false;
  let escaped = false;
  let endIndex = -1;

  for (let i = firstBrace; i < text.length; i++) {
    const char = text[i];

    if (!inString) {
      if (char === "{" || char === "[") {
        stack.push(char);
      } else if (char === "}" || char === "]") {
        if (stack.length > 0) {
          const last = stack.pop();
          if ((char === "}" && last === "{") || (char === "]" && last === "[")) {
            if (stack.length === 0) {
              endIndex = i;
              break;
            }
          }
        }
      } else if (char === '"' && !escaped) {
        inString = true;
      }
    } else {
      if (char === '"' && !escaped) {
        inString = false;
      }
    }
    escaped = char === "\\" && !escaped;
  }

  if (endIndex !== -1) {
    return text.substring(firstBrace, endIndex + 1);
  }
  return text;
}

/**
 * Safer JSON parsing with better error handling and validation
 */
function safeJsonParse(text: string): any {
  // Remove any potential BOM or invalid characters at the start
  text = text.replace(/^\uFEFF/, "");

  try {
    return JSON.parse(text);
  } catch (initialError) {
    console.log("Initial parse failed, attempting to fix truncation...");
    let fixedText = fixTruncatedJson(text);

    try {
      return JSON.parse(fixedText);
    } catch (secondaryError) {
      console.log("Fixed parse failed, attempting to extract valid JSON...");
      const extractedText = extractValidJson(text);

      try {
        return JSON.parse(extractedText);
      } catch (extractionError) {
        console.error("All parsing attempts failed:");
        console.error("Initial error:", initialError);
        console.error("Secondary error:", secondaryError);
        console.error("Extraction error:", extractionError);
        throw new Error("Failed to parse JSON after multiple attempts");
      }
    }
  }
}

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

    const systemPrompt = `You are a meeting minutes parser. You will receive a raw meeting summary.

Please parse it into structured JSON with these fields:
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

Important rules:
1. Preserve all important details from the original text
2. Format the "notes" field as a structured outline with numbered sections
3. Do not use hyphens/bullets for every line
4. Only return valid JSON - no markdown, no code fences, no extra text`;

    const userPrompt = `Parse this meeting summary:\n${rawSummary}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Fixed typo in model name
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2000, // Increased token limit
      temperature: 0.1, // Reduced temperature for more consistent output
    });

    const aiContent = completion.choices[0]?.message?.content?.trim() || "";
    if (!aiContent) {
      return NextResponse.json(
        { error: "No content returned from ChatGPT" },
        { status: 500 }
      );
    }

    // Clean the response and parse
    const cleanedContent = aiContent
      .replace(/^```(?:json)?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    const parsed = safeJsonParse(cleanedContent);
    return NextResponse.json({ data: parsed });
  } catch (err: any) {
    console.error("Error in parse-meeting route:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
