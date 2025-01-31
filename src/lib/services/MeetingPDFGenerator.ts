"use client";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Tells pdfmake about the embedded fonts
pdfMake.vfs = pdfFonts.vfs;

/** Data structures */
export interface MeetingAttendee {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface ActionItem {
  status: string;
  owner: string;
  open: boolean;
  notes?: string;
}

export interface MeetingPDFData {
  title: string;
  propertyCode?: string;
  date?: string;
  preparedBy?: string;
  location?: string;
  logoUrl?: string; // link to your Firebase or any image

  attendees: MeetingAttendee[];
  notes?: string;
  actionItems: ActionItem[];
}

/**
 * Convert a remote image (Firebase link) to base64
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
 * A custom table layout object for pdfmake that draws
 * a 1pt black line around every row/column (i.e. a full grid).
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
 * Generate Meeting Minutes PDF with:
 * - Big logo
 * - Top info in a 2-col table (left = black BG, right = normal)
 * - Table headings = black BG + white text
 * - Summary in one big table box
 * - Full grid lines for tables
 */
export async function generateMeetingMinutesPDF(meeting: MeetingPDFData) {
  // 1) Possibly fetch the logo
  let logoBase64 = "";
  if (meeting.logoUrl) {
    logoBase64 = await fetchLogoAsBase64(meeting.logoUrl);
  }

  // 2) docDefinition
  const docDefinition: any = {
    pageSize: "LETTER",
    pageMargins: [40, 60, 40, 60],

    content: [
      // (A) Larger Logo
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

      // (B) Title
      {
        text: "WEEKLY MEETING MINUTES",
        style: "header",
        alignment: "center",
        margin: [0, 0, 0, 10],
      },

      // (C) Info Table (2 columns)
      buildInfoTable(meeting),

      // (D) Team Table
      {
        text: "Team Information",
        style: "subheader",
        margin: [0, 10, 0, 6],
      },
      buildAttendeesTable(meeting.attendees),

      // (E) Meeting Summary in one big table
      ...(meeting.notes && meeting.notes.trim()
        ? [
            {
              text: "Meeting Summary",
              style: "subheader",
              margin: [0, 10, 0, 6],
            },
            buildSummaryTable(meeting.notes),
          ]
        : []),

      // (F) Action Items
      {
        text: "Project Meeting Minutes: General Information",
        style: "subheader",
        margin: [0, 10, 0, 6],
      },
      buildActionItemsTable(meeting.actionItems),
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
        fillColor: "#000000", // black BG
        color: "#FFFFFF", // white text
      },
      notes: {
        fontSize: 11,
      },
    },
  };

  // Create + download
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.download(`Meeting_Minutes_${meeting.date || "NoDate"}.pdf`);
}

/**
 * (1) Build a 2-col table for the top info:
 *   Left col: label with black background, white text
 *   Right col: normal BG
 */
function buildInfoTable(meeting: MeetingPDFData) {
  // For each row: [leftCell, rightCell]
  // We'll define the text in the left cell with white text, black BG
  const rows = [
    labelValueRow("Meeting/Project Name:", meeting.title),
    labelValueRow("Property Code:", meeting.propertyCode),
    labelValueRow("Date of Meeting:", meeting.date),
    labelValueRow("Minutes Prepared By:", meeting.preparedBy),
    labelValueRow("Location:", meeting.location),
  ];

  return {
    table: {
      widths: [160, "*"],
      body: rows,
    },
    layout: fullGridLayout,
  };
}

/**
 * Helper to create a single row with:
 *   left cell => black BG, white text
 *   right cell => normal BG, black text
 */
function labelValueRow(label: string, value?: string) {
  return [
    {
      text: label,
      fillColor: "#000000",
      color: "#ffffff",
      bold: true,
      margin: [5, 3, 5, 3], // some padding
    },
    {
      text: value || "",
      margin: [5, 3, 5, 3],
    },
  ];
}

/**
 * (2) Build the Team table
 */
function buildAttendeesTable(attendees: MeetingAttendee[]) {
  const body = [
    [
      { text: "Name", style: "tableHeader" },
      { text: "Email", style: "tableHeader" },
      { text: "Phone", style: "tableHeader" },
      { text: "Company", style: "tableHeader" },
    ],
  ];

  attendees.forEach((att) => {
    body.push([att.name || "", att.email || "", att.phone || "", att.company || ""]);
  });

  return {
    table: {
      headerRows: 1,
      widths: [100, 170, 100, 125],
      body,
    },
    layout: fullGridLayout,
  };
}

/**
 * (3) Build a single table cell for the summary
 */
function buildSummaryTable(notes: string) {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: notes,
            style: "notes",
            lineHeight: 1.3,
            margin: [5, 5, 5, 5],
          },
        ],
      ],
    },
    layout: fullGridLayout,
  };
}

/**
 * (4) Build Action Items table
 */
function buildActionItemsTable(actionItems: ActionItem[]) {
  const body = [
    [
      { text: "Status", style: "tableHeader" },
      { text: "Owner", style: "tableHeader" },
      { text: "Open/Closed", style: "tableHeader" },
      { text: "Notes", style: "tableHeader" },
    ],
  ];

  actionItems.forEach((item) => {
    const openClosed = item.open ? "Open" : "Closed";
    body.push([item.status || "", item.owner || "", openClosed, item.notes || ""]);
  });

  return {
    table: {
      headerRows: 1,
      widths: [100, 80, 80, "*"],
      body,
    },
    layout: fullGridLayout,
  };
}
