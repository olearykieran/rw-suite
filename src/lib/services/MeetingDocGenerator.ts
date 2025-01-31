"use client";

import { saveAs } from "file-saver";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  ImageRun,
  BorderStyle,
  TableLayoutType,
  ExternalHyperlink,
  WidthType,
} from "docx";

/**
 * Data structures
 */
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

export interface MeetingDocData {
  title: string;
  propertyCode?: string;
  date?: string;
  preparedBy?: string;
  location?: string;

  attendees: MeetingAttendee[];
  notes?: string;
  actionItems: ActionItem[];
}

/**
 * Helper: Create a simple paragraph with optional bold
 */
function para(text: string, opts?: { bold?: boolean }) {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts?.bold })],
  });
}

/**
 * Helper: Create a cell with a border + given % width
 */
function cellPercent(paragraphs: Paragraph[], colPercent: number): TableCell {
  return new TableCell({
    width: { size: colPercent, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
    children: paragraphs,
  });
}

/**
 * Main doc generator
 */
export async function generateMeetingMinutesDoc(
  meeting: MeetingDocData,
  logoUrl: string
) {
  if (!meeting) return;

  // 1) Load the logo
  let logoRun: ImageRun | null = null;
  try {
    const resp = await fetch(logoUrl);
    const arrayBuffer = await resp.arrayBuffer();
    logoRun = new ImageRun({
      data: arrayBuffer,
      transformation: { width: 80, height: 80 },
      // Some docx versions require "type" to fix TS errors
      type: "png",
    });
  } catch (err) {
    console.warn("Could not load logo. Continuing without it.", err);
  }

  // =================================================================
  // Header Table (2 rows, 4 columns), each column => 25%
  // =================================================================
  const headerRow1 = new TableRow({
    children: [
      cellPercent([para(`Meeting/Project Name: ${meeting.title}`)], 25),
      cellPercent([para(`Property Code: ${meeting.propertyCode || ""}`)], 25),
      cellPercent([para(`Date: ${meeting.date || ""}`)], 25),
      cellPercent([para(`Prepared By: ${meeting.preparedBy || ""}`)], 25),
    ],
  });

  const headerRow2 = new TableRow({
    children: [
      cellPercent([para(`Location: ${meeting.location || ""}`)], 25),
      cellPercent([para("")], 25),
      cellPercent([para("")], 25),
      cellPercent([para("")], 25),
    ],
  });

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    rows: [headerRow1, headerRow2],
  });

  // =================================================================
  // Team Table (Name, Email, Phone, Company) => 25% each
  // =================================================================
  const teamHeader = new TableRow({
    children: [
      cellPercent([para("Name", { bold: true })], 25),
      cellPercent([para("Email", { bold: true })], 25),
      cellPercent([para("Phone", { bold: true })], 25),
      cellPercent([para("Company", { bold: true })], 25),
    ],
  });

  const teamRows = meeting.attendees.map((att) => {
    const emailPara = new Paragraph({
      children: [
        new ExternalHyperlink({
          link: `mailto:${att.email}`,
          children: [new TextRun({ text: att.email, style: "Hyperlink" })],
        }),
      ],
    });

    return new TableRow({
      children: [
        cellPercent([para(att.name)], 25),
        cellPercent([emailPara], 25),
        cellPercent([para(att.phone || "")], 25),
        cellPercent([para(att.company || "")], 25),
      ],
    });
  });

  const teamTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    rows: [teamHeader, ...teamRows],
  });

  // =================================================================
  // Action Items Table
  // 4 columns: Status(25%), Owner(25%), Open/Closed(10%), Notes(40%)
  // =================================================================
  const actionHeaderRow = new TableRow({
    children: [
      cellPercent([para("Status", { bold: true })], 25),
      cellPercent([para("Owner", { bold: true })], 25),
      cellPercent([para("Open/Closed", { bold: true })], 10),
      cellPercent([para("Notes", { bold: true })], 40),
    ],
  });

  const actionRows = meeting.actionItems.map((ai) => {
    const openClosed = ai.open ? "Open" : "Closed";
    return new TableRow({
      children: [
        cellPercent([para(ai.status)], 25),
        cellPercent([para(ai.owner)], 25),
        cellPercent([para(openClosed, { bold: true })], 10),
        cellPercent([para(ai.notes || "")], 40),
      ],
    });
  });

  const actionTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    rows: [actionHeaderRow, ...actionRows],
  });

  // =================================================================
  // Meeting Summary => paragraphs
  // =================================================================
  const notesParas: Paragraph[] = [];
  if (meeting.notes) {
    const lines = meeting.notes.split("\n");
    lines.forEach((line) => {
      notesParas.push(new Paragraph(line.trim()));
    });
  }

  // =================================================================
  // Build Document
  // =================================================================
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 24, // 12pt
          },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          run: { size: 32, bold: true },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          run: { size: 28, bold: true },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          },
        },
        {
          id: "Hyperlink",
          name: "Hyperlink",
          basedOn: "Normal",
          run: {
            color: "0000EE",
            underline: {},
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          ...(logoRun
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [logoRun],
                }),
              ]
            : []),

          new Paragraph({ text: "WEEKLY MEETING MINUTES", style: "Heading1" }),

          headerTable,
          new Paragraph({ text: "" }),

          new Paragraph({ text: "Team Information", style: "Heading2" }),
          teamTable,
          new Paragraph({ text: "" }),

          ...(notesParas.length > 0
            ? [
                new Paragraph({ text: "Meeting Summary", style: "Heading2" }),
                ...notesParas,
              ]
            : []),

          new Paragraph({ text: "Action Items", style: "Heading2" }),
          actionTable,
        ],
      },
    ],
  });

  const { Packer } = await import("docx");
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Meeting_Minutes_${meeting.date || "NoDate"}.docx`);
}
