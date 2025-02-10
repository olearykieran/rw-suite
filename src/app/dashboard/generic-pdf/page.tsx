// src/app/dashboard/generic-pdf/page.tsx

"use client";

import { useState, FormEvent } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Register pdfMake fonts
pdfMake.vfs = pdfFonts.vfs;

/**
 * fullGridLayout:
 * A custom layout for tables that draws a full 1pt black grid.
 */
const fullGridLayout = {
  hLineWidth(i: number, node: any) {
    return 1;
  },
  vLineWidth(i: number, node: any) {
    return 1;
  },
  hLineColor(i: number, node: any) {
    return "#000000";
  },
  vLineColor(i: number, node: any) {
    return "#000000";
  },
};

/**
 * fetchLogoAsBase64:
 * Fetches a remote image (e.g. your company logo) and converts it to a base64 string.
 */
async function fetchLogoAsBase64(logoUrl: string): Promise<string> {
  if (!logoUrl) return "";
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (err) {
    console.warn("Failed to fetch logo:", err);
    return "";
  }
}

/**
 * blobToBase64:
 * Converts a Blob to a base64 string.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject("Failed to convert blob to base64");
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * buildRecipientTable:
 * Creates a table for the "To:" (recipient) and "Date:" section.
 * The left cell (label) has a black background with white text.
 */
function buildRecipientTable(recipient: string, date: string) {
  return {
    table: {
      widths: [160, "*"],
      body: [
        [
          {
            text: "To:",
            fillColor: "#000000",
            color: "#ffffff",
            bold: true,
            margin: [5, 3, 5, 3],
          },
          {
            text: recipient || "",
            margin: [5, 3, 5, 3],
          },
        ],
        [
          {
            text: "Date:",
            fillColor: "#000000",
            color: "#ffffff",
            bold: true,
            margin: [5, 3, 5, 3],
          },
          {
            text: date || "",
            margin: [5, 3, 5, 3],
          },
        ],
      ],
    },
    layout: fullGridLayout,
  };
}

/**
 * buildLetterBodyBox:
 * Renders the letter body inside a single-cell table that has no fill color (white background)
 * and uses the grid layout to display a black outline. The text inside is black.
 */
function buildLetterBodyBox(letterBody: string) {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: letterBody || "",
            // No fillColor here: the background remains white.
            color: "#000000",
            margin: [5, 5, 5, 5],
          },
        ],
      ],
    },
    layout: fullGridLayout,
  };
}

/**
 * buildPartiesTable:
 * Creates a table for the "Parties Involved" section.
 * The left cell is a black label with white text and the right cell displays an unordered list.
 */
function buildPartiesTable(parties: string) {
  const partiesList = parties.split("\n").filter((p) => p.trim() !== "");
  return {
    table: {
      widths: [160, "*"],
      body: [
        [
          {
            text: "Parties Involved:",
            fillColor: "#000000",
            color: "#ffffff",
            bold: true,
            margin: [5, 3, 5, 3],
          },
          {
            ul: partiesList,
            margin: [5, 3, 5, 3],
          },
        ],
      ],
    },
    layout: fullGridLayout,
  };
}

/**
 * GenericLetterPDFPage:
 * Renders a form to generate a generic letter in the meeting minutes style.
 * It includes fields for:
 * - Document Title
 * - Recipient ("To:")
 * - Letter Date
 * - Letter Body (rendered inside a black outline box with black text)
 * - Parties Involved (displayed as a bullet list in a table)
 *
 * Upon submission, the company logo is fetched and a PDF is generated using pdfMake.
 */
export default function GenericLetterPDFPage() {
  const [docTitle, setDocTitle] = useState("");
  const [recipient, setRecipient] = useState("");
  const [letterDate, setLetterDate] = useState("");
  const [letterBody, setLetterBody] = useState("");
  const [parties, setParties] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGeneratePDF(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Company logo URL (adjust if needed)
      const logoUrl =
        "https://firebasestorage.googleapis.com/v0/b/rw-project-management.firebasestorage.app/o/rw-logo-title.png?alt=media&token=03a42c6c-980c-4857-ae0d-f84c37baa2fe";
      const logoBase64 = await fetchLogoAsBase64(logoUrl);

      // Build the PDF document definition
      const docDefinition: any = {
        pageSize: "LETTER",
        pageMargins: [40, 60, 40, 60],
        content: [
          // (A) Company Logo at the top
          ...(logoBase64
            ? [
                {
                  image: logoBase64,
                  width: 200,
                  alignment: "center",
                  margin: [0, 0, 0, 20],
                },
              ]
            : []),
          // (B) Document Title (centered)
          {
            text: docTitle || "Untitled Document",
            style: "header",
            alignment: "center",
            margin: [0, 0, 0, 20],
          },
          // (C) Recipients and Date section using a black table style
          buildRecipientTable(recipient, letterDate),
          { text: "", margin: [0, 10, 0, 10] },
          // (D) Letter Body in a black outline box with black text
          buildLetterBodyBox(letterBody),
          { text: "", margin: [0, 10, 0, 10] },
          // (E) Parties Involved section using a black table style
          buildPartiesTable(parties),
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true,
          },
        },
      };

      // Generate and download the PDF
      pdfMake.createPdf(docDefinition).download(`${docTitle || "Document"}.pdf`);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      setError("Failed to generate PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <Card>
        <h1 className="text-2xl font-bold mb-4">Generic Letter PDF Generator</h1>
        {error && <p className="text-red-600">{error}</p>}
        <form onSubmit={handleGeneratePDF} className="space-y-4">
          {/* Document Title */}
          <div>
            <label className="block font-medium mb-1">Document Title</label>
            <input
              type="text"
              className="border text-black p-2 w-full rounded"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Enter document title..."
            />
          </div>
          {/* Recipient */}
          <div>
            <label className="block font-medium mb-1">To:</label>
            <input
              type="text"
              className="border text-black p-2 w-full rounded"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter recipient name..."
            />
          </div>
          {/* Letter Date */}
          <div>
            <label className="block font-medium mb-1">Date</label>
            <input
              type="date"
              className="border text-black p-2 w-full rounded"
              value={letterDate}
              onChange={(e) => setLetterDate(e.target.value)}
            />
          </div>
          {/* Letter Body */}
          <div>
            <label className="block font-medium mb-1">Letter Body</label>
            <textarea
              className="border text-black p-2 w-full rounded"
              rows={8}
              value={letterBody}
              onChange={(e) => setLetterBody(e.target.value)}
              placeholder="Enter the content for your letter..."
            />
          </div>
          {/* Parties Involved */}
          <div>
            <label className="block font-medium mb-1">Parties Involved</label>
            <textarea
              className="border text-black p-2 w-full rounded"
              rows={4}
              value={parties}
              onChange={(e) => setParties(e.target.value)}
              placeholder="Enter each party on a new line..."
            />
          </div>
          <GrayButton type="submit" disabled={loading}>
            {loading ? "Generating..." : "Generate PDF"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
