import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Set up pdfMake with the embedded fonts
pdfMake.vfs = pdfFonts.vfs;

/** Data structure for Bid Submission Guidelines PDF export */
export interface BidSubmissionGuidelinesPDFData {
  projectName: string;
  projectLocation: string;
  contractorName: string;
  bidDueDate: string; // Original datetime-local string
  submissionMethod: string;
  contactPhone: string;
  contactEmail: string;
  questionDeadline: string; // Date string
  issuerName: string;
  issuerTitle: string;
  issuerCompany: string;
  issuerPhone: string;
  issuerEmail: string;
  additionalInstructions: string;
  logoUrl?: string; // URL for your logo image
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
 * Helper: Build a label/value row styled with a black background for the label.
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
 * Helper: Build a table for the bid guidelines section.
 * This function processes each guideline string by splitting it
 * at the first colon into a label and value, and then uses labelValueRow
 * to style the row similarly to the issuer signature section.
 */
function buildGuidelinesLabelValueTable(guidelines: string[]) {
  const rows = guidelines.map((g) => {
    // Split at the first colon
    const splitIndex = g.indexOf(":");
    let label = "";
    let value = "";
    if (splitIndex !== -1) {
      label = g.substring(0, splitIndex + 1).trim();
      value = g.substring(splitIndex + 1).trim();
    } else {
      label = g;
      value = "";
    }
    return labelValueRow(label, value);
  });
  return {
    table: {
      widths: [150, "*"],
      body: rows,
    },
    layout: fullGridLayout,
  };
}

/**
 * Helper: Build a table for the issuer signature (closing) information.
 * This table uses a similar style as the meeting minutes info table.
 */
function buildIssuerSignatureTable(data: BidSubmissionGuidelinesPDFData) {
  const rows = [
    labelValueRow("Issuer Name:", data.issuerName),
    labelValueRow("Issuer Title:", data.issuerTitle),
    labelValueRow("Issuer Company:", data.issuerCompany),
    labelValueRow("Issuer Phone:", data.issuerPhone),
    labelValueRow("Issuer Email:", data.issuerEmail),
  ];
  return {
    table: {
      widths: [150, "*"],
      body: rows,
    },
    layout: fullGridLayout,
  };
}

/**
 * Generate the Bid Submission Guidelines PDF.
 * The document definition mimics our RFI PDF style with a logo,
 * header, subject line, greeting, a bid guidelines section styled in a
 * two-column label/value table (like the closing section), and then the closing
 * section (issuer signature) presented in a two-column table.
 */
export async function generateBidSubmissionGuidelinesPDF(
  data: BidSubmissionGuidelinesPDFData
) {
  // 1) Fetch logo as base64 (if provided)
  let logoBase64 = "";
  if (data.logoUrl) {
    logoBase64 = await fetchLogoAsBase64(data.logoUrl);
  }

  // 2) Format the Bid Due Date to exclude time and append text
  const bidDueDateObj = new Date(data.bidDueDate);
  const formattedBidDueDate =
    bidDueDateObj.toLocaleDateString() + " by the end of the day";

  // 3) Build an array of guidelines using the formatted date
  const guidelines = [
    `Bid Due Date: ${formattedBidDueDate}`,
    "Submission Format: Please include a Cover Letter, a detailed Bid Breakdown (labor, materials, equipment, overhead and profit), a proposed Schedule, and your Qualifications including References.",
    `Submission Method: ${data.submissionMethod}`,
    `Questions: If you have any questions, please contact us at ${data.contactPhone} or ${data.contactEmail} by ${data.questionDeadline}.`,
    "Bid Leveling Criteria: Bids will be evaluated based on total cost, completeness, timeline, experience, and references.",
  ];

  // 4) Build the document definition
  const docDefinition: any = {
    pageSize: "LETTER",
    pageMargins: [40, 60, 40, 60],
    content: [
      // (A) Logo (if available)
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
      // (B) Header
      {
        text: "REQUEST FOR BIDS",
        style: "header",
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      // (C) Subject Line
      {
        text: `Request for Bids for ${data.projectName}`,
        style: "subheader",
        margin: [0, 0, 0, 10],
      },
      // (D) Greeting
      {
        text: `Dear ${data.contractorName},`,
        style: "textContent",
        margin: [0, 0, 0, 10],
      },
      // (E) Introductory paragraph
      {
        text: `We are inviting your company to submit a bid for the ${data.projectName} located at ${data.projectLocation}. We appreciate your interest in this project and look forward to your proposal.`,
        style: "textContent",
        margin: [0, 0, 0, 10],
      },
      // (F) Bid Submission Guidelines Section – now styled like the closing section
      {
        text: "Bid Submission Guidelines:",
        style: "subheader",
        margin: [0, 10, 0, 6],
      },
      buildGuidelinesLabelValueTable(guidelines),
      // (G) Additional Instructions (if provided)
      ...(data.additionalInstructions.trim()
        ? [
            {
              text: "Additional Instructions:",
              style: "subheader",
              margin: [0, 10, 0, 6],
            },
            {
              text: data.additionalInstructions,
              style: "textContent",
              margin: [0, 0, 0, 10],
            },
          ]
        : []),
      // (H) Closing & Issuer Signature presented in a table
      {
        text: "Closing & Issuer Signature",
        style: "subheader",
        margin: [0, 10, 0, 6],
      },
      buildIssuerSignatureTable(data),
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
      textContent: {
        fontSize: 11,
        lineHeight: 1.3,
      },
    },
  };

  // 5) Create the PDF document and trigger the download
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.download(`BidSubmissionGuidelines_${data.projectName || "export"}.pdf`);
}
