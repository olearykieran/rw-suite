"use client";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Set up embedded fonts for pdfMake
pdfMake.vfs = pdfFonts.vfs;

// Define your brand colors (adjust these values as needed)
const brandPrimaryColor = "#000000"; // primary brand color (used for headers, grid lines)
const gridLineColor = brandPrimaryColor;

// A custom table layout that draws grid lines using the brand color
const fullGridLayout = {
  hLineWidth(i: number, node: any) {
    return 1;
  },
  vLineWidth(i: number, node: any) {
    return 1;
  },
  hLineColor(i: number, node: any) {
    return gridLineColor;
  },
  vLineColor(i: number, node: any) {
    return gridLineColor;
  },
};

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
  // Pass the custom logo URL (if available) or a default logo URL.
  logoUrl?: string;
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
 * Generate Meeting Minutes PDF with custom styling.
 */
export async function generateMeetingMinutesPDF(meeting: MeetingPDFData) {
  // Use the custom logo if provided; otherwise, fall back to the default logo URL.
  const defaultLogoUrl =
    "https://firebasestorage.googleapis.com/v0/b/rw-project-management.firebasestorage.app/o/rw-logo-title.png?alt=media&token=03a42c6c-980c-4857-ae0d-f84c37baa2fe";
  let logoBase64 = "";
  if (meeting.logoUrl || defaultLogoUrl) {
    logoBase64 = await fetchLogoAsBase64(meeting.logoUrl || defaultLogoUrl);
  }

  // Define the PDF document structure and styles
  const docDefinition: any = {
    pageSize: "LETTER",
    pageMargins: [40, 60, 40, 60],
    content: [
      // (A) Display the logo if available
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
        text: "MEETING MINUTES",
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

      // (E) Meeting Summary if notes exist
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
        text: "Action Items",
        style: "subheader",
        margin: [0, 10, 0, 6],
      },
      buildActionItemsTable(meeting.actionItems),
    ],
    styles: {
      header: {
        fontSize: 16,
        bold: true,
        color: brandPrimaryColor,
      },
      subheader: {
        fontSize: 14,
        bold: true,
        color: brandPrimaryColor,
      },
      tableHeader: {
        bold: true,
        fillColor: brandPrimaryColor,
        color: "#FFFFFF",
      },
      tableCell: {
        fontSize: 10,
        margin: [5, 3, 5, 3],
      },
      notes: {
        fontSize: 11,
      },
    },
  };

  // Create and download the PDF
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.download(`Meeting_Minutes_${meeting.date || "NoDate"}.pdf`);
}

/**
 * Build a 2-column table for the top meeting info.
 */
function buildInfoTable(meeting: MeetingPDFData) {
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
 * Helper to create a row with a branded label cell and a value cell.
 */
function labelValueRow(label: string, value?: string) {
  return [
    {
      text: label,
      fillColor: brandPrimaryColor,
      color: "#FFFFFF",
      bold: true,
      margin: [5, 3, 5, 3],
    },
    {
      text: value || "",
      margin: [5, 3, 5, 3],
    },
  ];
}

/**
 * Build the team table displaying attendee details.
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
    body.push([
      { text: att.name || "", style: "tableCell" },
      { text: att.email || "", style: "tableCell" },
      { text: att.phone || "", style: "tableCell" },
      { text: att.company || "", style: "tableCell" },
    ]);
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
 * Build a table cell that contains the meeting summary (notes).
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
 * Build the Action Items table.
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
    body.push([
      { text: item.status || "", style: "tableCell" },
      { text: item.owner || "", style: "tableCell" },
      { text: openClosed, style: "tableCell" },
      { text: item.notes || "", style: "tableCell" },
    ]);
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
