// src/lib/services/EstimatePDFGenerator.ts

"use client";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Set up pdfMake with embedded fonts
pdfMake.vfs = pdfFonts.vfs;

// Define your brand colors (adjust these as needed)
const brandPrimaryColor = "#000000";

// A custom table layout that draws grid lines using the brand color
const fullGridLayout = {
  hLineWidth(i: number, node: any) {
    return 1;
  },
  vLineWidth(i: number, node: any) {
    return 1;
  },
  hLineColor(i: number, node: any) {
    return brandPrimaryColor;
  },
  vLineColor(i: number, node: any) {
    return brandPrimaryColor;
  },
};

/** Data structures for the Estimate PDF */
export interface EstimateLineItem {
  description: string;
  cost: string;
}

export interface EstimateTrade {
  trade: string;
  cost: string; // Aggregated cost for the trade
  items: EstimateLineItem[];
}

export interface EstimatePDFData {
  projectTitle: string;
  projectAddress: string;
  projectDate: string;
  trades: EstimateTrade[];
  subtotal: string;
  generalConditions: string;
  generalConditionsPercentage?: string;
  overhead: string;
  overheadPercentage?: string;
  insurance: string;
  insurancePercentage?: string;
  totalProjectCost: string;
  logoUrl?: string; // URL for your logo image
  additionalClauses?: Array<{title: string; content: string}>;
}

/**
 * Fetch a remote image and convert it to base64.
 * This is required for embedding the logo in the PDF.
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject("Could not convert blob to base64");
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Build the Estimate Table.
 * This function creates a table with a header row (TRADE, DESCRIPTION, COST) and
 * then for each trade, adds a header row with the trade name and aggregated cost,
 * followed by rows for each sub-item (with an empty trade cell).
 */
function buildEstimateTable(data: EstimatePDFData) {
  const body: any[] = [];

  // Header row
  body.push([
    { text: "TRADE", style: "tableHeader" },
    { text: "DESCRIPTION", style: "tableHeader" },
    { text: "COST", style: "tableHeader", alignment: "right" },
  ]);

  // Iterate over each trade
  data.trades.forEach((trade) => {
    // Trade header row
    body.push([
      { text: trade.trade, style: "tradeHeader" },
      { text: "", style: "tradeHeader" },
      { text: trade.cost, style: "tradeHeader", alignment: "right" },
    ]);

    // Sub-item rows
    trade.items.forEach((item) => {
      body.push([
        { text: "", style: "tableCell" },
        { text: item.description, style: "tableCell" },
        { text: item.cost, style: "tableCell", alignment: "right" },
      ]);
    });
  });

  // Add summary rows
  body.push([
    { text: "SUBTOTAL", colSpan: 2, style: "summaryLabel" },
    {},
    { text: data.subtotal, style: "summaryValue", alignment: "right" },
  ]);
  body.push([
    { text: "General Conditions", colSpan: 2, style: "summaryLabel" },
    {},
    { text: data.generalConditions, style: "summaryValue", alignment: "right" },
  ]);
  body.push([
    { text: "General Conditions (%)", colSpan: 2, style: "summaryLabel" },
    {},
    { text: data.generalConditionsPercentage, style: "summaryValue", alignment: "right" },
  ]);
  body.push([
    { text: "Overhead", colSpan: 2, style: "summaryLabel" },
    {},
    { text: data.overhead, style: "summaryValue", alignment: "right" },
  ]);
  body.push([
    { text: "Overhead (%)", colSpan: 2, style: "summaryLabel" },
    {},
    { text: data.overheadPercentage, style: "summaryValue", alignment: "right" },
  ]);
  body.push([
    { text: "Insurance", colSpan: 2, style: "summaryLabel" },
    {},
    { text: data.insurance, style: "summaryValue", alignment: "right" },
  ]);
  body.push([
    { text: "Insurance (%)", colSpan: 2, style: "summaryLabel" },
    {},
    { text: data.insurancePercentage, style: "summaryValue", alignment: "right" },
  ]);
  body.push([
    { text: "TOTAL PROJECT COST", colSpan: 2, style: "totalLabel" },
    {},
    { text: data.totalProjectCost, style: "totalValue", alignment: "right" },
  ]);

  return {
    table: {
      widths: [150, "*", 100],
      body,
    },
    layout: fullGridLayout,
  };
}

/**
 * Generate the Estimate PDF.
 */
export async function generateEstimatePDF(data: EstimatePDFData) {
  // Use provided logo URL or a default logo URL
  const defaultLogoUrl =
    "https://firebasestorage.googleapis.com/v0/b/rw-project-management.firebasestorage.app/o/rw-logo-title.png?alt=media&token=03a42c6c-980c-4857-ae0d-f84c37baa2fe";
  let logoBase64 = "";
  if (data.logoUrl || defaultLogoUrl) {
    logoBase64 = await fetchLogoAsBase64(data.logoUrl || defaultLogoUrl);
  }

  // Define the document structure and styles
  const docDefinition: any = {
    pageSize: "LETTER",
    pageMargins: [40, 60, 40, 60],
    content: [
      // Logo at the top (if available)
      ...(logoBase64
        ? [
            {
              image: logoBase64,
              width: 300,
              alignment: "center",
              margin: [0, 0, 0, 10],
            },
          ]
        : []),
      // Company/Project header

      {
        text: data.projectTitle,
        style: "projectTitle",
        alignment: "center",
        margin: [0, 5, 0, 5],
      },
      {
        text: data.projectAddress,
        style: "projectInfo",
        alignment: "center",
      },
      {
        text: `Date: ${data.projectDate}`,
        style: "projectInfo",
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
      // Estimate Table
      buildEstimateTable(data),
    ],
    styles: {
      companyHeader: {
        fontSize: 18,
        bold: true,
        color: brandPrimaryColor,
      },
      projectTitle: {
        fontSize: 16,
        bold: true,
      },
      projectInfo: {
        fontSize: 11,
      },
      tableHeader: {
        bold: true,
        fillColor: brandPrimaryColor,
        color: "#FFFFFF",
        margin: [5, 3, 5, 3],
        fontSize: 10,
      },
      tradeHeader: {
        bold: true,
        fillColor: "#EEEEEE",
        margin: [5, 3, 5, 3],
        fontSize: 10,
      },
      tableCell: {
        fontSize: 10,
        margin: [5, 3, 5, 3],
      },
      summaryLabel: {
        bold: true,
        margin: [5, 3, 5, 3],
        fontSize: 10,
      },
      summaryValue: {
        bold: true,
        margin: [5, 3, 5, 3],
        fontSize: 10,
      },
      totalLabel: {
        bold: true,
        fillColor: "#CCCCCC",
        margin: [5, 3, 5, 3],
        fontSize: 10,
      },
      totalValue: {
        bold: true,
        fillColor: "#CCCCCC",
        margin: [5, 3, 5, 3],
        fontSize: 10,
      },
    },
  };

  // Create and download the PDF
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.download(`Estimate_${data.projectTitle}.pdf`);
}
