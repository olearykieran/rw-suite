"use client";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Tell pdfMake about the embedded fonts
pdfMake.vfs = pdfFonts.vfs;

/** Data structure for RFI PDF export */
export interface RfiPDFData {
  rfiNumber?: number;
  subject: string;
  question: string;
  assignedTo: string;
  dueDate: string;
  status: string;
  importance: string;
  officialResponse: string;
  distributionList: string[];
  attachments: string[];
  logoUrl?: string; // URL for your logo image
}

/**
 * Fetch a remote image (for example, from Firebase) and convert it to base64.
 * This is necessary for embedding the logo in the PDF.
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
 * Convert a Blob into a Base64-encoded string.
 */
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
 * Define a custom full-grid layout for pdfMake tables.
 * This draws a 1pt black line around every row and column.
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
 * Generate the RFI PDF.
 * This function creates a pdfMake document definition that mimics your meeting minutes PDF style.
 * It includes the logo, a header, an info table, a section for the question/description,
 * official response, distribution list, and attachments (if any).
 */
export async function generateRfiPDF(data: RfiPDFData) {
  // 1) Fetch the logo image as base64 (if provided)
  let logoBase64 = "";
  if (data.logoUrl) {
    logoBase64 = await fetchLogoAsBase64(data.logoUrl);
  }

  // 2) Build the document definition using a similar layout to your meeting minutes PDF
  const docDefinition: any = {
    pageSize: "LETTER",
    pageMargins: [40, 60, 40, 60],
    content: [
      // (A) Add the logo (if available)
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
      // (B) Header text
      {
        text: "REQUEST FOR INFORMATION",
        style: "header",
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      // (C) Basic Info Table
      buildInfoTable(data),
      // (D) Detailed Question / Description
      {
        text: "Detailed Description",
        style: "subheader",
        margin: [0, 10, 0, 6],
      },
      buildQuestionTable(data.question),
      // (E) Official Response Section
      {
        text: "Official Response",
        style: "subheader",
        margin: [0, 10, 0, 6],
      },
      buildResponseTable(data.officialResponse),
      // (F) Distribution List
      {
        text: "Distribution List",
        style: "subheader",
        margin: [0, 10, 0, 6],
      },
      buildDistributionTable(data.distributionList),
      // (G) Attachments (if any)
      ...(data.attachments.length > 0
        ? [
            {
              text: "Attachments",
              style: "subheader",
              margin: [0, 10, 0, 6],
            },
            buildAttachmentsTable(data.attachments),
          ]
        : []),
    ],
    styles: {
      header: {
        fontSize: 16,
        bold: true,
      },
      subheader: {
        fontSize: 14,
        bold: true,
      },
      tableHeader: {
        bold: true,
        fillColor: "#000000",
        color: "#FFFFFF",
      },
      textContent: {
        fontSize: 11,
        lineHeight: 1.3,
      },
    },
  };

  // 3) Create the PDF document and trigger the download
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.download(`RFI_${data.rfiNumber || "export"}.pdf`);
}

/**
 * Build a two-column table for the basic RFI information.
 * Left cells display labels (with a black background and white text),
 * and right cells display the corresponding values.
 */
function buildInfoTable(data: RfiPDFData) {
  const rows = [
    labelValueRow("RFI Number:", data.rfiNumber ? "#" + data.rfiNumber : ""),
    labelValueRow("Subject:", data.subject),
    labelValueRow("Assigned To:", data.assignedTo),
    labelValueRow("Due Date:", data.dueDate),
    labelValueRow("Status:", data.status),
    labelValueRow("Importance:", data.importance),
  ];
  return {
    table: {
      widths: [120, "*"],
      body: rows,
    },
    layout: fullGridLayout,
  };
}

/**
 * Helper function to create a row with a label and value.
 */
function labelValueRow(label: string, value: string) {
  return [
    {
      text: label,
      fillColor: "#000000",
      color: "#ffffff",
      bold: true,
      margin: [5, 3, 5, 3],
    },
    {
      text: value,
      margin: [5, 3, 5, 3],
    },
  ];
}

/**
 * Build a table cell for the detailed question/description.
 */
function buildQuestionTable(question: string) {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: question,
            style: "textContent",
            margin: [5, 5, 5, 5],
          },
        ],
      ],
    },
    layout: fullGridLayout,
  };
}

/**
 * Build a table cell for the official response.
 */
function buildResponseTable(response: string) {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: response,
            style: "textContent",
            margin: [5, 5, 5, 5],
          },
        ],
      ],
    },
    layout: fullGridLayout,
  };
}

/**
 * Build a table for the distribution list.
 */
function buildDistributionTable(distributionList: string[]) {
  const body = [[{ text: "Email", style: "tableHeader" }]];
  distributionList.forEach((email) => {
    body.push([{ text: email, style: "tableCell" }]);
  });
  return {
    table: {
      headerRows: 1,
      widths: ["*"],
      body,
    },
    layout: fullGridLayout,
  };
}

/**
 * Build a table for listing attachment filenames.
 */
function buildAttachmentsTable(attachments: string[]) {
  const body = [[{ text: "Attachment Filename", style: "tableHeader" }]];
  attachments.forEach((url) => {
    const filename = url.split("/").pop() || "";
    body.push([{ text: filename, style: "tableCell" }]);
  });
  return {
    table: {
      headerRows: 1,
      widths: ["*"],
      body,
    },
    layout: fullGridLayout,
  };
}
