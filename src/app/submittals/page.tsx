"use client";

import React, { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // Import the autoTable plugin
import { v4 as uuidv4 } from "uuid"; // Import uuid for unique keys

// Define interfaces for table rows to ensure type safety
interface EquipmentItem {
  id: string; // Unique ID for React key prop
  itemId: string;
  itemName: string;
  intendedUse: string;
  approvalReq: string;
  eqComments: string;
}

interface SupplyItem {
  id: string; // Unique ID for React key prop
  supplyItemId: string;
  productName: string;
  manufacturer: string;
  description: string;
  associatedTask: string;
  supplier: string;
}

const SubmittalPage = () => {
  const [activeTab, setActiveTab] = useState("submittal");

  // --- State for Submittal Form ---
  const [submittalFormData, setSubmittalFormData] = useState({
    submittalId: "",
    projectId: "",
    projectName: "",
    submittalDate: "",
    submittedTo: "",
    submittalType: {
      shopDrawing: false,
      productData: false,
      rfi: false,
      compForm: false,
      qualityDoc: false,
      other: false,
      otherDescribe: "",
    },
    description: "",
    attachments: "",
    comments: "",
    clientPoc: "",
    reviewStatus: {
      pending: false,
      approved: false,
      approvedNoted: false,
      disapproved: false,
      incomplete: false,
      other: false,
      otherDescribe: "",
    },
    preparedBy: "",
    preparerTitle: "",
    prepDate: "",
    approvedBy: "",
    approvingTitle: "",
    approvalDate: "",
  });

  // --- State for Change Order Form ---
  const [changeOrderFormData, setChangeOrderFormData] = useState({
    changeId: "",
    coProjectId: "", // prefixed to avoid collision with submittal
    coProjectName: "",
    coDate: "",
    coSubmittedTo: "",
    coSubmittedBy: "",
    changeRequestedBy: {
      selfCompany: false,
      client: false,
      architect: false,
      engineer: false,
      constructionManager: false,
      codeOfficial: false,
      other: false,
      otherDescribe: "",
    },
    coDescription: "",
    justification: "",
    supportingDocs: "",
    timeImpact: {
      yes: false,
      no: false,
    },
    daysNumber: "",
    timeReason: "",
    timeSupportingDocs: "",
    budgetImpact: {
      yes: false,
      no: false,
    },
    amount: "",
    budgetReason: "",
    budgetSupportingDocs: "",
    clientApprovalParty: "",
    clientApprovalTitle: "",
    clientApprovalDate: "",
    coApprovalParty: "",
    coApprovalTitle: "",
    coApprovalDate: "",
  });

  // --- State for Equipment Form ---
  const [equipmentFormData, setEquipmentFormData] = useState({
    eqPreparedBy: "",
    eqProjectId: "",
    eqProjectName: "",
    eqDate: "",
    items: [] as EquipmentItem[], // Initialize as an empty array of EquipmentItem
  });

  // --- State for Supply Log Form ---
  const [supplyLogFormData, setSupplyLogFormData] = useState({
    slPreparedBy: "",
    slProjectId: "",
    slProjectName: "",
    slDate: "",
    items: [] as SupplyItem[], // Initialize as an empty array of SupplyItem
  });

  // --- Input Handlers (Generalized) ---
  const handleGenericInputChange = <T extends object>( // Use generics
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    setter: React.Dispatch<React.SetStateAction<T>>
  ) => {
    const { name, value } = e.target;
    setter((prev: T) => ({ ...prev, [name]: value }));
  };

  const handleGenericCheckboxChange = <T extends object>( // Use generics
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<T>>,
    category: keyof T // Use keyof T for category
  ) => {
    const { name, checked } = e.target;
    setter((prev: T) => ({
      ...prev,
      [category]: {
        // @ts-ignore - Trusting the structure based on usage
        ...prev[category],
        [name]: checked,
      },
    }));
  };

  const handleGenericOtherDescChange = <T extends object>( // Use generics
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<T>>,
    category: keyof T // Use keyof T for category
  ) => {
    const { value } = e.target;
    setter((prev: T) => ({
      ...prev,
      [category]: {
        // @ts-ignore - Trusting the structure based on usage
        ...prev[category],
        otherDescribe: value,
      },
    }));
  };

  // --- Specific Input Handlers (using generic handlers) ---
  const handleSubmittalInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => handleGenericInputChange(e, setSubmittalFormData);
  const handleSubmittalCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: "submittalType" | "reviewStatus"
  ) => handleGenericCheckboxChange(e, setSubmittalFormData, category);
  const handleSubmittalOtherDescChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: "submittalType" | "reviewStatus"
  ) => handleGenericOtherDescChange(e, setSubmittalFormData, category);

  const handleChangeOrderInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => handleGenericInputChange(e, setChangeOrderFormData);
  const handleChangeOrderCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: "changeRequestedBy" | "timeImpact" | "budgetImpact"
  ) => handleGenericCheckboxChange(e, setChangeOrderFormData, category);
  const handleChangeOrderOtherDescChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: "changeRequestedBy"
  ) => handleGenericOtherDescChange(e, setChangeOrderFormData, category);

  // --- Handlers for Equipment Form ---
  const handleEquipmentInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => handleGenericInputChange(e, setEquipmentFormData);

  const addEquipmentItem = () => {
    setEquipmentFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: uuidv4(), // Generate unique ID
          itemId: "",
          itemName: "",
          intendedUse: "",
          approvalReq: "",
          eqComments: "",
        },
      ],
    }));
  };

  const removeEquipmentItem = (idToRemove: string) => {
    setEquipmentFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== idToRemove),
    }));
  };

  const handleEquipmentItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    idToUpdate: string
  ) => {
    const { name, value } = e.target;
    setEquipmentFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === idToUpdate ? { ...item, [name]: value } : item
      ),
    }));
  };

  // --- Handlers for Supply Log Form ---
  const handleSupplyLogInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => handleGenericInputChange(e, setSupplyLogFormData);

  const addSupplyItem = () => {
    setSupplyLogFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: uuidv4(), // Generate unique ID
          supplyItemId: "",
          productName: "",
          manufacturer: "",
          description: "", // Added based on interface
          associatedTask: "",
          supplier: "",
        },
      ],
    }));
  };

  const removeSupplyItem = (idToRemove: string) => {
    setSupplyLogFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== idToRemove),
    }));
  };

  const handleSupplyItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    idToUpdate: string
  ) => {
    const { name, value } = e.target;
    setSupplyLogFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === idToUpdate ? { ...item, [name]: value } : item
      ),
    }));
  };

  // --- Helper to format date string ---
  const formatDate = (dateString: string) => {
    if (!dateString) return "___________";
    try {
      return new Date(dateString + "T00:00:00").toLocaleDateString(); // Add time to avoid timezone issues
    } catch (e) {
      return "Invalid Date";
    }
  };

  // --- PDF Generation (Modify to handle active tab) ---
  const generatePDF = () => {
    // Alert or specific logic if trying to generate from other tabs for now
    if (activeTab === "submittal") {
      generateSubmittalPDF();
    } else if (activeTab === "change-order") {
      generateChangeOrderPDF();
    } else if (activeTab === "equipment") {
      generateEquipmentPDF(); // Placeholder for now
      // alert("PDF generation for Equipment is not yet implemented.");
    } else if (activeTab === "supply-log") {
      // alert("PDF generation for Supply Log is not yet implemented.");
      generateSupplyLogPDF(); // Call the new function
    }
  };

  const generateSubmittalPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // --- Styling Constants (Mirrored from Change Order) ---
    const leftMargin = 15;
    const rightMargin = doc.internal.pageSize.width - leftMargin;
    const contentWidth = rightMargin - leftMargin;
    const lineSpacing = 5;
    const smallLineSpacing = 4;
    const sectionSpacing = 10;
    const colGap = 8;
    const headingFontSize = 12;
    const labelFontSize = 10;
    const valueFontSize = 10;
    const textFontSize = 10;
    const headerColor = [60, 60, 60]; // Dark Gray
    const lineColor = [200, 200, 200]; // Light Gray
    let currentY = 20;

    // --- Header ---
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.text("RW | PROJECTS", leftMargin, currentY);
    currentY += sectionSpacing;
    doc.setTextColor(0, 0, 0); // Reset color

    // --- Title ---
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CONSTRUCTION SUBMITTAL", leftMargin, currentY);
    currentY += sectionSpacing;

    // --- Helper Functions (Refined) ---
    const addLabelAndValue = (
      label: string,
      value: string,
      yPos: number,
      labelFontWeight: string = "bold",
      valueFontWeight: string = "normal",
      _labelFontSize: number = labelFontSize,
      _valueFontSize: number = valueFontSize,
      valueIndent: number = 45 // Adjusted default indent for this form
    ) => {
      doc.setFont("helvetica", labelFontWeight);
      doc.setFontSize(_labelFontSize);
      doc.setTextColor(0, 0, 0);
      doc.text(label + ":", leftMargin, yPos);

      doc.setFont("helvetica", valueFontWeight);
      doc.setFontSize(_valueFontSize);
      const valueText = value || "___________";
      const valueLines = doc.splitTextToSize(valueText, contentWidth - valueIndent);
      doc.text(valueLines, leftMargin + valueIndent, yPos);
      return (
        yPos + valueLines.length * smallLineSpacing + (lineSpacing - smallLineSpacing)
      );
    };

    const addSection = (title: string, text: string, yPos: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(labelFontSize);
      doc.setTextColor(0, 0, 0);
      doc.text(title + ":", leftMargin, yPos);
      yPos += lineSpacing;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(textFontSize);
      const textContent = text || "___________";
      const textLines = doc.splitTextToSize(textContent, contentWidth);
      doc.text(textLines, leftMargin, yPos);
      return yPos + textLines.length * smallLineSpacing + lineSpacing;
    };

    const addSectionHeader = (title: string, yPos: number) => {
      doc.setFontSize(headingFontSize);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.text(title, leftMargin, yPos);
      yPos += smallLineSpacing;
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
      doc.line(leftMargin, yPos, rightMargin, yPos);
      doc.setTextColor(0, 0, 0); // Reset color
      return yPos + lineSpacing; // Space after header line
    };

    // --- Basic Info Section ---
    currentY = addSectionHeader("Project Information", currentY);

    currentY = addLabelAndValue("Submittal ID", submittalFormData.submittalId, currentY);
    currentY = addLabelAndValue("Project ID", submittalFormData.projectId, currentY);
    currentY = addLabelAndValue("Project Name", submittalFormData.projectName, currentY);
    currentY = addLabelAndValue(
      "Date Submitted",
      formatDate(submittalFormData.submittalDate),
      currentY
    );
    currentY = addLabelAndValue("Submitted To", submittalFormData.submittedTo, currentY);
    currentY += sectionSpacing;

    // --- Submittal Details Section ---
    currentY = addSectionHeader("Submittal Details", currentY);

    // Submittal Type
    let types = [];
    // ... (build types array as before) ...
    if (submittalFormData.submittalType.shopDrawing) types.push("Shop Drawing");
    if (submittalFormData.submittalType.productData) types.push("Product Data");
    if (submittalFormData.submittalType.rfi) types.push("Request For Information");
    if (submittalFormData.submittalType.compForm) types.push("Comp. Form / Quality Rec.");
    if (submittalFormData.submittalType.qualityDoc) types.push("Quality System Doc");
    if (submittalFormData.submittalType.other) {
      const otherTypeDesc =
        submittalFormData.submittalType.otherDescribe || "(Not Specified)";
      types.push(`Other: ${otherTypeDesc}`);
    }
    currentY = addLabelAndValue("Submittal Type(s)", types.join(", "), currentY);

    // Description, Attachments, Comments
    currentY = addSection(
      "Description of Submittal",
      submittalFormData.description,
      currentY
    );
    currentY = addSection("Attachments", submittalFormData.attachments, currentY);
    currentY = addSection("Comments", submittalFormData.comments, currentY);
    currentY += sectionSpacing;

    // --- Review & Approval Section ---
    currentY = addSectionHeader("Review & Approval", currentY);

    currentY = addLabelAndValue("Client POC", submittalFormData.clientPoc, currentY);

    // Review Status
    let status = [];
    // ... (build status array as before) ...
    if (submittalFormData.reviewStatus.pending) status.push("Pending");
    if (submittalFormData.reviewStatus.approved) status.push("Approved");
    if (submittalFormData.reviewStatus.approvedNoted) status.push("Approved As Noted");
    if (submittalFormData.reviewStatus.disapproved) status.push("Disapproved - Resubmit");
    if (submittalFormData.reviewStatus.incomplete) status.push("Incomplete - Resubmit");
    if (submittalFormData.reviewStatus.other) {
      const otherStatusDesc =
        submittalFormData.reviewStatus.otherDescribe || "(Not Specified)";
      status.push(`Other: ${otherStatusDesc}`);
    }
    currentY = addLabelAndValue("Review Status", status.join(", "), currentY);
    currentY += lineSpacing; // Extra space before signature blocks

    // --- Signatures / Approvals (Changed Header) ---
    currentY = addSectionHeader("Preparation & Approval", currentY);

    const approvalBlockWidth = (contentWidth - colGap) / 2;
    const preparedBlockX = leftMargin;
    const approvedBlockX = leftMargin + approvalBlockWidth + colGap;

    // Prepared By Block
    doc.setFontSize(labelFontSize);
    doc.setFont("helvetica", "bold");
    doc.text("Prepared By", preparedBlockX, currentY);
    doc.setFontSize(valueFontSize);
    doc.setFont("helvetica", "normal");
    doc.text(
      submittalFormData.preparedBy || "___________",
      preparedBlockX,
      currentY + lineSpacing
    );
    doc.text(
      `Title: ${submittalFormData.preparerTitle || "__________"}`,
      preparedBlockX,
      currentY + lineSpacing * 2
    );
    doc.text(
      `Date: ${formatDate(submittalFormData.prepDate)}`,
      preparedBlockX,
      currentY + lineSpacing * 3
    );

    // Approved By Block
    doc.setFontSize(labelFontSize);
    doc.setFont("helvetica", "bold");
    doc.text("Approved By", approvedBlockX, currentY);
    doc.setFontSize(valueFontSize);
    doc.setFont("helvetica", "normal");
    doc.text(
      submittalFormData.approvedBy || "___________",
      approvedBlockX,
      currentY + lineSpacing
    );
    doc.text(
      `Title: ${submittalFormData.approvingTitle || "__________"}`,
      approvedBlockX,
      currentY + lineSpacing * 2
    );
    doc.text(
      `Date: ${formatDate(submittalFormData.approvalDate)}`,
      approvedBlockX,
      currentY + lineSpacing * 3
    );
    currentY += lineSpacing * 4 + sectionSpacing; // Move Y past approval blocks

    // --- Footer ---
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150); // Lighter Gray color for footer
    doc.text("RW Projects Inc. - Construction Submittal", leftMargin, pageHeight - 10);
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      rightMargin - 30,
      pageHeight - 10
    ); // Align date right

    // --- Save ---
    doc.save(`RW_Projects_Submittal_${new Date().toISOString().slice(0, 10)}.pdf`);
    console.log("Submittal PDF Generated (Enhanced Style v2)");
  };

  const generateChangeOrderPDF = () => {
    // ... (jsPDF initialization) ...
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // --- Styling Constants ---
    const leftMargin = 15;
    const rightMargin = doc.internal.pageSize.width - leftMargin;
    const contentWidth = rightMargin - leftMargin;
    const lineSpacing = 5;
    const smallLineSpacing = 4;
    const sectionSpacing = 10; // Increased spacing between sections
    const colGap = 8; // Define column gap here
    const headingFontSize = 12;
    const labelFontSize = 10;
    const valueFontSize = 10;
    const textFontSize = 10;
    const headerColor = [60, 60, 60]; // Dark Gray
    const lineColor = [200, 200, 200]; // Light Gray
    let currentY = 20;

    // --- Header ---
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.text("RW | PROJECTS", leftMargin, currentY);
    currentY += sectionSpacing;
    doc.setTextColor(0, 0, 0); // Reset color

    // --- Title ---
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CHANGE ORDER", leftMargin, currentY);
    currentY += sectionSpacing;

    // --- Helper Functions (Refined) ---
    const addLabelAndValue = (
      label: string,
      value: string,
      yPos: number,
      labelFontWeight: string = "bold",
      valueFontWeight: string = "normal",
      _labelFontSize: number = labelFontSize, // Use constants
      _valueFontSize: number = valueFontSize,
      valueIndent: number = 40 // Adjusted default indent
    ) => {
      doc.setFont("helvetica", labelFontWeight);
      doc.setFontSize(_labelFontSize);
      doc.setTextColor(0, 0, 0);
      doc.text(label + ":", leftMargin, yPos);

      doc.setFont("helvetica", valueFontWeight);
      doc.setFontSize(_valueFontSize);
      const valueText = value || "___________";
      const valueLines = doc.splitTextToSize(valueText, contentWidth - valueIndent);
      doc.text(valueLines, leftMargin + valueIndent, yPos);
      // Return Y position after the value text, considering line spacing
      return (
        yPos + valueLines.length * smallLineSpacing + (lineSpacing - smallLineSpacing)
      );
    };

    const addSection = (title: string, text: string, yPos: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(labelFontSize);
      doc.setTextColor(0, 0, 0);
      doc.text(title + ":", leftMargin, yPos);
      yPos += lineSpacing;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(textFontSize);
      const textContent = text || "___________";
      const textLines = doc.splitTextToSize(textContent, contentWidth);
      doc.text(textLines, leftMargin, yPos);
      // Return Y position after the text block
      return yPos + textLines.length * smallLineSpacing + lineSpacing;
    };

    const addTwoColumnSection = (
      title1: string,
      text1: string,
      title2: string,
      text2: string,
      yPos: number
    ) => {
      const col1X = leftMargin;
      const colGap = 8; // Increased gap between columns
      const colWidth = (contentWidth - colGap) / 2;
      const col2X = leftMargin + colWidth + colGap;

      // Column 1
      doc.setFontSize(labelFontSize);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(title1 + ":", col1X, yPos);
      doc.setFontSize(textFontSize);
      doc.setFont("helvetica", "normal");
      const text1Content = text1 || "___________";
      const text1Lines = doc.splitTextToSize(text1Content, colWidth);
      doc.text(text1Lines, col1X, yPos + lineSpacing);
      const height1 = text1Lines.length * smallLineSpacing + lineSpacing;

      // Column 2
      doc.setFontSize(labelFontSize);
      doc.setFont("helvetica", "bold");
      doc.text(title2 + ":", col2X, yPos);
      doc.setFontSize(textFontSize);
      doc.setFont("helvetica", "normal");
      const text2Content = text2 || "___________";
      const text2Lines = doc.splitTextToSize(text2Content, colWidth);
      doc.text(text2Lines, col2X, yPos + lineSpacing);
      const height2 = text2Lines.length * smallLineSpacing + lineSpacing;

      // Return Y position after the taller column + spacing
      return yPos + Math.max(height1, height2) + lineSpacing;
    };

    const addSectionHeader = (title: string, yPos: number) => {
      doc.setFontSize(headingFontSize);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.text(title, leftMargin, yPos);
      yPos += smallLineSpacing;
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
      doc.line(leftMargin, yPos, rightMargin, yPos);
      doc.setTextColor(0, 0, 0); // Reset color
      return yPos + lineSpacing; // Space after header line
    };

    // --- Basic Info Section ---
    currentY = addSectionHeader("Project Information", currentY);

    currentY = addLabelAndValue("Change ID", changeOrderFormData.changeId, currentY);
    currentY = addLabelAndValue("Project ID", changeOrderFormData.coProjectId, currentY);
    currentY = addLabelAndValue(
      "Project Name",
      changeOrderFormData.coProjectName,
      currentY
    );
    currentY = addLabelAndValue("Date", formatDate(changeOrderFormData.coDate), currentY);

    // Submitted To/By - side by side (Revised Layout)
    const submittedToText = changeOrderFormData.coSubmittedTo || "___________";
    const submittedByText = changeOrderFormData.coSubmittedBy || "___________";
    const col1XSub = leftMargin;
    const colGapSub = 8;
    const colWidthSub = (contentWidth - colGapSub) / 2;
    const col2XSub = leftMargin + colWidthSub + colGapSub;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelFontSize);
    doc.text("Submitted To:", col1XSub, currentY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(valueFontSize);
    const submittedToLines = doc.splitTextToSize(submittedToText, colWidthSub);
    doc.text(submittedToLines, col1XSub, currentY + lineSpacing);
    const heightTo = submittedToLines.length * smallLineSpacing + lineSpacing;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelFontSize);
    doc.text("Submitted By:", col2XSub, currentY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(valueFontSize);
    const submittedByLines = doc.splitTextToSize(submittedByText, colWidthSub);
    doc.text(submittedByLines, col2XSub, currentY + lineSpacing);
    const heightBy = submittedByLines.length * smallLineSpacing + lineSpacing;
    currentY += Math.max(heightTo, heightBy) + lineSpacing / 2;

    currentY += sectionSpacing; // Space before next section

    // --- Change Details Section ---
    currentY = addSectionHeader("Change Details", currentY);

    // Change Requested By
    let requesters = [];
    // ... (build requesters array as before) ...
    if (changeOrderFormData.changeRequestedBy.selfCompany)
      requesters.push("Self / Company");
    if (changeOrderFormData.changeRequestedBy.client) requesters.push("Client");
    if (changeOrderFormData.changeRequestedBy.architect) requesters.push("Architect");
    if (changeOrderFormData.changeRequestedBy.engineer) requesters.push("Engineer");
    if (changeOrderFormData.changeRequestedBy.constructionManager)
      requesters.push("Construction Manager");
    if (changeOrderFormData.changeRequestedBy.codeOfficial)
      requesters.push("Code Enforc. Official");
    if (changeOrderFormData.changeRequestedBy.other) {
      const otherRequesterDesc =
        changeOrderFormData.changeRequestedBy.otherDescribe || "(Not Specified)";
      requesters.push(`Other: ${otherRequesterDesc}`);
    }
    currentY = addLabelAndValue(
      "Requested By",
      requesters.join(", "),
      currentY,
      "bold",
      "normal",
      labelFontSize,
      valueFontSize,
      45
    ); // Adjusted indent

    // Description
    currentY = addSection(
      "Description of Change",
      changeOrderFormData.coDescription,
      currentY
    );

    // Justification and Supporting Docs (Side by side)
    currentY = addTwoColumnSection(
      "Justification",
      changeOrderFormData.justification,
      "Supporting Docs",
      changeOrderFormData.supportingDocs,
      currentY
    );
    currentY += sectionSpacing;

    // --- Impact Assessment Section ---
    currentY = addSectionHeader("Impact Assessment", currentY);

    // Time/Schedule Impact (Revised Layout)
    let timeImpact = "___________";
    if (changeOrderFormData.timeImpact.yes) timeImpact = "Yes";
    else if (changeOrderFormData.timeImpact.no) timeImpact = "No";
    const daysNumber = changeOrderFormData.daysNumber || "N/A";

    const timeImpactY = currentY;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelFontSize);
    doc.text("Time Impact?:", leftMargin, timeImpactY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(valueFontSize);
    doc.text(timeImpact, leftMargin + 40, timeImpactY); // Use fixed indent

    if (changeOrderFormData.timeImpact.yes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(labelFontSize);
      doc.text("Days:", leftMargin + contentWidth / 2 + colGap, timeImpactY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(valueFontSize);
      doc.text(daysNumber, leftMargin + contentWidth / 2 + colGap + 15, timeImpactY); // Indent after label
    }
    currentY += lineSpacing;

    // Time Reason and Supporting Docs (Side by side)
    currentY = addTwoColumnSection(
      "Time Impact Reason",
      changeOrderFormData.timeReason,
      "Supporting Docs",
      changeOrderFormData.timeSupportingDocs,
      currentY
    );

    // Budget Impact (Revised Layout)
    let budgetImpact = "___________";
    if (changeOrderFormData.budgetImpact.yes) budgetImpact = "Yes";
    else if (changeOrderFormData.budgetImpact.no) budgetImpact = "No";
    const amount = changeOrderFormData.amount ? `$${changeOrderFormData.amount}` : "N/A";

    const budgetImpactY = currentY;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelFontSize);
    doc.text("Budget Impact?:", leftMargin, budgetImpactY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(valueFontSize);
    doc.text(budgetImpact, leftMargin + 40, budgetImpactY); // Use fixed indent

    if (changeOrderFormData.budgetImpact.yes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(labelFontSize);
      doc.text("Amount:", leftMargin + contentWidth / 2 + colGap, budgetImpactY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(valueFontSize);
      doc.text(amount, leftMargin + contentWidth / 2 + colGap + 20, budgetImpactY); // Indent after label
    }
    currentY += lineSpacing;

    // Budget Reason and Supporting Docs (Side by side)
    currentY = addTwoColumnSection(
      "Budget Impact Reason",
      changeOrderFormData.budgetReason,
      "Supporting Docs",
      changeOrderFormData.budgetSupportingDocs,
      currentY
    );
    currentY += sectionSpacing;

    // --- Approvals Section ---
    currentY = addSectionHeader("Approvals", currentY);

    const approvalBlockWidth = (contentWidth - colGap) / 2;
    const clientBlockX = leftMargin;
    const companyBlockX = leftMargin + approvalBlockWidth + colGap;

    // Client Approval Block
    doc.setFontSize(labelFontSize);
    doc.setFont("helvetica", "bold");
    doc.text("Client Approval", clientBlockX, currentY);
    doc.setFontSize(valueFontSize);
    doc.setFont("helvetica", "normal");
    doc.text(
      changeOrderFormData.clientApprovalParty || "___________",
      clientBlockX,
      currentY + lineSpacing
    );
    doc.text(
      `Title: ${changeOrderFormData.clientApprovalTitle || "__________"}`,
      clientBlockX,
      currentY + lineSpacing * 2
    );
    doc.text(
      `Date: ${formatDate(changeOrderFormData.clientApprovalDate)}`,
      clientBlockX,
      currentY + lineSpacing * 3
    );

    // Company Approval Block
    doc.setFontSize(labelFontSize);
    doc.setFont("helvetica", "bold");
    doc.text("Company Approval", companyBlockX, currentY);
    doc.setFontSize(valueFontSize);
    doc.setFont("helvetica", "normal");
    doc.text(
      changeOrderFormData.coApprovalParty || "___________",
      companyBlockX,
      currentY + lineSpacing
    );
    doc.text(
      `Title: ${changeOrderFormData.coApprovalTitle || "__________"}`,
      companyBlockX,
      currentY + lineSpacing * 2
    );
    doc.text(
      `Date: ${formatDate(changeOrderFormData.coApprovalDate)}`,
      companyBlockX,
      currentY + lineSpacing * 3
    );
    currentY += lineSpacing * 4 + sectionSpacing; // Move Y past approval blocks

    // --- Footer ---
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150); // Lighter Gray color for footer
    doc.text("RW Projects Inc. - Change Order", leftMargin, pageHeight - 10);
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      rightMargin - 30,
      pageHeight - 10
    ); // Align date right

    // --- Save ---
    doc.save(`RW_Projects_ChangeOrder_${new Date().toISOString().slice(0, 10)}.pdf`);
    console.log("Change Order PDF Generated (Enhanced Style v2)");
  };

  // --- PDF Generation for Equipment (Placeholder/Basic Structure) ---
  const generateEquipmentPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape", // Often better for tables
      unit: "mm",
      format: "a4",
    });

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("RW | PROJECTS", 20, 20);
    doc.setFontSize(14);
    doc.text("EQUIPMENT AND MATERIALS LOG", 20, 30);

    // Basic Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Prepared By: ${equipmentFormData.eqPreparedBy || "___________"}`, 20, 40);
    doc.text(`Project ID: ${equipmentFormData.eqProjectId || "___________"}`, 90, 40);
    doc.text(
      `Project Name: ${equipmentFormData.eqProjectName || "___________"}`,
      160,
      40
    );
    doc.text(`Date: ${formatDate(equipmentFormData.eqDate)}`, 230, 40);

    // Table using jspdf-autotable
    autoTable(doc, {
      startY: 50,
      head: [["Item ID", "Item Name", "Intended Use", "Approval Req?", "Comments"]],
      body: equipmentFormData.items.map((item) => [
        item.itemId,
        item.itemName,
        item.intendedUse,
        item.approvalReq,
        item.eqComments,
      ]),
      theme: "grid",
      headStyles: { fillColor: [50, 50, 50] }, // Dark header
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        // Adjust column widths if necessary (total width depends on orientation and margins)
        0: { cellWidth: 25 },
        1: { cellWidth: 45 },
        2: { cellWidth: 60 },
        3: { cellWidth: 35 },
        4: { cellWidth: "auto" }, // Let the last column take remaining space
      },
      didDrawPage: function (data) {
        // Footer
        const pageHeight =
          doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.text(
          "RW Projects Inc. - Equipment Log",
          data.settings.margin.left,
          pageHeight - 10
        );
        doc.text(
          `Page ${data.pageNumber}`,
          doc.internal.pageSize.width - data.settings.margin.right - 10,
          pageHeight - 10
        );
      },
    });

    // Save the PDF
    doc.save(`RW_Projects_EquipmentLog_${new Date().toISOString().slice(0, 10)}.pdf`);
    console.log("Equipment Log PDF Generated");
  };

  // --- PDF Generation for Supply Log ---
  const generateSupplyLogPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("RW | PROJECTS", 20, 20);
    doc.setFontSize(14);
    doc.text("PROJECT SUPPLY SOURCE LOG", 20, 30);

    // Basic Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Prepared By: ${supplyLogFormData.slPreparedBy || "___________"}`, 20, 40);
    doc.text(`Project ID: ${supplyLogFormData.slProjectId || "___________"}`, 90, 40);
    doc.text(
      `Project Name: ${supplyLogFormData.slProjectName || "___________"}`,
      160,
      40
    );
    doc.text(`Date: ${formatDate(supplyLogFormData.slDate)}`, 230, 40);

    // Table using jspdf-autotable
    autoTable(doc, {
      startY: 50,
      head: [
        [
          "Item ID",
          "Product Name",
          "Manufacturer",
          "Description",
          "Associated Task",
          "Supplier",
        ],
      ],
      body: supplyLogFormData.items.map((item) => [
        item.supplyItemId,
        item.productName,
        item.manufacturer,
        item.description,
        item.associatedTask,
        item.supplier,
      ]),
      theme: "grid",
      headStyles: { fillColor: [50, 50, 50] },
      styles: { fontSize: 8, cellPadding: 1.5 }, // Slightly smaller font for more columns
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 60 }, // Description wider
        4: { cellWidth: 40 },
        5: { cellWidth: "auto" }, // Supplier auto
      },
      didDrawPage: function (data) {
        // Footer
        const pageHeight =
          doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.text(
          "RW Projects Inc. - Supply Source Log",
          data.settings.margin.left,
          pageHeight - 10
        );
        doc.text(
          `Page ${data.pageNumber}`,
          doc.internal.pageSize.width - data.settings.margin.right - 10,
          pageHeight - 10
        );
      },
    });

    // Save the PDF
    doc.save(`RW_Projects_SupplyLog_${new Date().toISOString().slice(0, 10)}.pdf`);
    console.log("Supply Log PDF Generated");
  };

  // --- Form Reset (Update to reset all forms) ---
  const resetForm = () => {
    if (confirm("Are you sure you want to reset the form? All data will be lost.")) {
      // Reset Submittal Form
      setSubmittalFormData({
        submittalId: "",
        projectId: "",
        projectName: "",
        submittalDate: "",
        submittedTo: "",
        submittalType: {
          shopDrawing: false,
          productData: false,
          rfi: false,
          compForm: false,
          qualityDoc: false,
          other: false,
          otherDescribe: "",
        },
        description: "",
        attachments: "",
        comments: "",
        clientPoc: "",
        reviewStatus: {
          pending: false,
          approved: false,
          approvedNoted: false,
          disapproved: false,
          incomplete: false,
          other: false,
          otherDescribe: "",
        },
        preparedBy: "",
        preparerTitle: "",
        prepDate: "",
        approvedBy: "",
        approvingTitle: "",
        approvalDate: "",
      });
      // Reset Change Order Form
      setChangeOrderFormData({
        changeId: "",
        coProjectId: "",
        coProjectName: "",
        coDate: "",
        coSubmittedTo: "",
        coSubmittedBy: "",
        changeRequestedBy: {
          selfCompany: false,
          client: false,
          architect: false,
          engineer: false,
          constructionManager: false,
          codeOfficial: false,
          other: false,
          otherDescribe: "",
        },
        coDescription: "",
        justification: "",
        supportingDocs: "",
        timeImpact: { yes: false, no: false },
        daysNumber: "",
        timeReason: "",
        timeSupportingDocs: "",
        budgetImpact: { yes: false, no: false },
        amount: "",
        budgetReason: "",
        budgetSupportingDocs: "",
        clientApprovalParty: "",
        clientApprovalTitle: "",
        clientApprovalDate: "",
        coApprovalParty: "",
        coApprovalTitle: "",
        coApprovalDate: "",
      });
      // Reset Equipment Form
      setEquipmentFormData({
        eqPreparedBy: "",
        eqProjectId: "",
        eqProjectName: "",
        eqDate: "",
        items: [],
      });
      // Reset Supply Log Form (Add later)
      setSupplyLogFormData({
        slPreparedBy: "",
        slProjectId: "",
        slProjectName: "",
        slDate: "",
        items: [],
      });

      // Maybe reset active tab to default?
      // setActiveTab("submittal");
    }
  };

  // --- Tab Switching ---
  const TabButton = ({ tabId, label }: { tabId: string; label: string }) => (
    <button
      className={`py-2 px-4 rounded-t-md mr-1 focus:outline-none ${
        activeTab === tabId
          ? "bg-black text-white"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
      onClick={() => setActiveTab(tabId)}
    >
      {label}
    </button>
  );

  return (
    <div className="container mx-auto p-5 font-sans">
      {/* Logo */}
      <div className="mb-8 text-3xl font-bold flex items-center">
        <span className="logo-text">RW</span>
        <span className="divider inline-block border-l-2 border-black h-10 mx-2 align-middle"></span>
        <span className="logo-text">PROJECTS</span>
      </div>

      {/* Tab Container */}
      <div className="mb-8">
        {/* Tab Buttons */}
        <div className="flex border-b border-gray-300 mb-5 overflow-x-auto">
          <TabButton tabId="submittal" label="Construction Submittal" />
          <TabButton tabId="change-order" label="Change Order" />
          <TabButton tabId="equipment" label="Equipment and Materials" />
          <TabButton tabId="supply-log" label="Project Supply Source Log" />
        </div>

        {/* Submittal Form Tab Content */}
        <div
          id="submittal"
          className={`tab-content ${activeTab === "submittal" ? "block" : "hidden"}`}
        >
          <div className="bg-white shadow-md rounded-md p-6 mb-8">
            <div className="border-b-2 border-gray-200 pb-2 mb-5">
              <h2 className="text-2xl font-semibold text-black">
                Construction Submittal Form
              </h2>
            </div>

            {/* Basic Info Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/4 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="submittalId"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Submittal ID
                </label>
                <input
                  type="text"
                  id="submittalId"
                  name="submittalId"
                  value={submittalFormData.submittalId}
                  onChange={handleSubmittalInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/4 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="projectId"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Project ID
                </label>
                <input
                  type="text"
                  id="projectId"
                  name="projectId"
                  value={submittalFormData.projectId}
                  onChange={handleSubmittalInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/4 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="projectName"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Project Name
                </label>
                <input
                  type="text"
                  id="projectName"
                  name="projectName"
                  value={submittalFormData.projectName}
                  onChange={handleSubmittalInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/4 px-3">
                <label
                  htmlFor="submittalDate"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Date
                </label>
                <input
                  type="date"
                  id="submittalDate"
                  name="submittalDate"
                  value={submittalFormData.submittalDate}
                  onChange={handleSubmittalInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
            </div>

            {/* Submitted To Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/2 px-3">
                <label
                  htmlFor="submittedTo"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Submitted To
                </label>
                <input
                  type="text"
                  id="submittedTo"
                  name="submittedTo"
                  value={submittalFormData.submittedTo}
                  onChange={handleSubmittalInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
            </div>

            {/* Submittal Type Row */}
            <div className="mb-5">
              <label className="block mb-2 font-bold text-sm text-gray-700">
                Submittal Type
              </label>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="shop-drawing"
                    name="shopDrawing"
                    checked={submittalFormData.submittalType.shopDrawing}
                    onChange={(e) => handleSubmittalCheckboxChange(e, "submittalType")}
                    className="mr-2"
                  />
                  <label htmlFor="shop-drawing">Shop Drawing</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="product-data"
                    name="productData"
                    checked={submittalFormData.submittalType.productData}
                    onChange={(e) => handleSubmittalCheckboxChange(e, "submittalType")}
                    className="mr-2"
                  />
                  <label htmlFor="product-data">Product Data</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rfi"
                    name="rfi"
                    checked={submittalFormData.submittalType.rfi}
                    onChange={(e) => handleSubmittalCheckboxChange(e, "submittalType")}
                    className="mr-2"
                  />
                  <label htmlFor="rfi">Request For Information</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="comp-form"
                    name="compForm"
                    checked={submittalFormData.submittalType.compForm}
                    onChange={(e) => handleSubmittalCheckboxChange(e, "submittalType")}
                    className="mr-2"
                  />
                  <label htmlFor="comp-form">Comp. Form / Quality Rec.</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="quality-doc"
                    name="qualityDoc"
                    checked={submittalFormData.submittalType.qualityDoc}
                    onChange={(e) => handleSubmittalCheckboxChange(e, "submittalType")}
                    className="mr-2"
                  />
                  <label htmlFor="quality-doc">Quality System Doc</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="other-type"
                    name="other"
                    checked={submittalFormData.submittalType.other}
                    onChange={(e) => handleSubmittalCheckboxChange(e, "submittalType")}
                    className="mr-2"
                  />
                  <label htmlFor="other-type">Other</label>
                </div>
              </div>
              {submittalFormData.submittalType.other && (
                <div className="mt-3 pl-6">
                  <input
                    type="text"
                    id="other-type-describe"
                    name="otherDescribe"
                    value={submittalFormData.submittalType.otherDescribe}
                    onChange={(e) => handleSubmittalOtherDescChange(e, "submittalType")}
                    placeholder="Describe..."
                    className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md box-border"
                  />
                </div>
              )}
            </div>

            {/* Description Row */}
            <div className="mb-5">
              <label
                htmlFor="description"
                className="block mb-1 font-bold text-sm text-gray-700"
              >
                Description of Submittal
              </label>
              <textarea
                id="description"
                name="description"
                value={submittalFormData.description}
                onChange={handleSubmittalInputChange}
                className="w-full p-2 border border-gray-300 rounded-md box-border min-h-[100px] resize-y"
              ></textarea>
            </div>

            {/* Attachments Row */}
            <div className="mb-5">
              <label
                htmlFor="attachments"
                className="block mb-1 font-bold text-sm text-gray-700"
              >
                Attachments
              </label>
              <textarea
                id="attachments"
                name="attachments"
                value={submittalFormData.attachments}
                onChange={handleSubmittalInputChange}
                className="w-full p-2 border border-gray-300 rounded-md box-border min-h-[80px] resize-y"
              ></textarea>
            </div>

            {/* Comments Row */}
            <div className="mb-5">
              <label
                htmlFor="comments"
                className="block mb-1 font-bold text-sm text-gray-700"
              >
                Comments
              </label>
              <textarea
                id="comments"
                name="comments"
                value={submittalFormData.comments}
                onChange={handleSubmittalInputChange}
                className="w-full p-2 border border-gray-300 rounded-md box-border min-h-[80px] resize-y"
              ></textarea>
            </div>

            {/* Client POC & Review Status Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/2 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="clientPoc"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Client Point of Contact
                </label>
                <input
                  type="text"
                  id="clientPoc"
                  name="clientPoc"
                  value={submittalFormData.clientPoc}
                  onChange={handleSubmittalInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/2 px-3">
                <label className="block mb-2 font-bold text-sm text-gray-700">
                  Review Status
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pending"
                      name="pending"
                      checked={submittalFormData.reviewStatus.pending}
                      onChange={(e) => handleSubmittalCheckboxChange(e, "reviewStatus")}
                      className="mr-1"
                    />
                    <label htmlFor="pending">Pending</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="approved"
                      name="approved"
                      checked={submittalFormData.reviewStatus.approved}
                      onChange={(e) => handleSubmittalCheckboxChange(e, "reviewStatus")}
                      className="mr-1"
                    />
                    <label htmlFor="approved">Approved</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="approved-noted"
                      name="approvedNoted"
                      checked={submittalFormData.reviewStatus.approvedNoted}
                      onChange={(e) => handleSubmittalCheckboxChange(e, "reviewStatus")}
                      className="mr-1"
                    />
                    <label htmlFor="approved-noted">Approved As Noted</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="disapproved"
                      name="disapproved"
                      checked={submittalFormData.reviewStatus.disapproved}
                      onChange={(e) => handleSubmittalCheckboxChange(e, "reviewStatus")}
                      className="mr-1"
                    />
                    <label htmlFor="disapproved">Disapproved - Resubmit</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="incomplete"
                      name="incomplete"
                      checked={submittalFormData.reviewStatus.incomplete}
                      onChange={(e) => handleSubmittalCheckboxChange(e, "reviewStatus")}
                      className="mr-1"
                    />
                    <label htmlFor="incomplete">Incomplete - Resubmit</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="other-status"
                      name="other"
                      checked={submittalFormData.reviewStatus.other}
                      onChange={(e) => handleSubmittalCheckboxChange(e, "reviewStatus")}
                      className="mr-1"
                    />
                    <label htmlFor="other-status">Other</label>
                  </div>
                </div>
                {submittalFormData.reviewStatus.other && (
                  <div className="mt-2 pl-4">
                    <input
                      type="text"
                      id="other-status-describe"
                      name="otherDescribe"
                      value={submittalFormData.reviewStatus.otherDescribe}
                      onChange={(e) => handleSubmittalOtherDescChange(e, "reviewStatus")}
                      placeholder="Describe..."
                      className="w-full p-2 border border-gray-300 rounded-md box-border text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Prepared By Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/3 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="preparedBy"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Prepared By
                </label>
                <input
                  type="text"
                  id="preparedBy"
                  name="preparedBy"
                  value={submittalFormData.preparedBy}
                  onChange={handleSubmittalInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/3 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="preparerTitle"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Preparer Title
                </label>
                <input
                  type="text"
                  id="preparerTitle"
                  name="preparerTitle"
                  value={submittalFormData.preparerTitle}
                  onChange={handleSubmittalInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/3 px-3">
                <label
                  htmlFor="prepDate"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Date
                </label>
                <input
                  type="date"
                  id="prepDate"
                  name="prepDate"
                  value={submittalFormData.prepDate}
                  onChange={handleSubmittalInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
            </div>

            {/* Approved By Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/3 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="approvedBy"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Approved By
                </label>
                <input
                  type="text"
                  id="approvedBy"
                  name="approvedBy"
                  value={submittalFormData.approvedBy}
                  onChange={handleSubmittalInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/3 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="approvingTitle"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Approving Party Title
                </label>
                <input
                  type="text"
                  id="approvingTitle"
                  name="approvingTitle"
                  value={submittalFormData.approvingTitle}
                  onChange={handleSubmittalInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/3 px-3">
                <label
                  htmlFor="approvalDate"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Date
                </label>
                <input
                  type="date"
                  id="approvalDate"
                  name="approvalDate"
                  value={submittalFormData.approvalDate}
                  onChange={handleSubmittalInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Change Order Form Tab Content */}
        <div
          id="change-order"
          className={`tab-content ${activeTab === "change-order" ? "block" : "hidden"}`}
        >
          <div className="bg-white shadow-md rounded-md p-6 mb-8">
            <div className="border-b-2 border-gray-200 pb-2 mb-5">
              <h2 className="text-2xl font-semibold text-black">Change Order</h2>
            </div>

            {/* Basic Info Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/4 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="changeId"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Change ID
                </label>
                <input
                  type="text"
                  id="changeId"
                  name="changeId"
                  value={changeOrderFormData.changeId}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/4 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="coProjectId"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Project ID
                </label>
                <input
                  type="text"
                  id="coProjectId"
                  name="coProjectId"
                  value={changeOrderFormData.coProjectId}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/4 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="coProjectName"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Project Name
                </label>
                <input
                  type="text"
                  id="coProjectName"
                  name="coProjectName"
                  value={changeOrderFormData.coProjectName}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/4 px-3">
                <label
                  htmlFor="coDate"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Date
                </label>
                <input
                  type="date"
                  id="coDate"
                  name="coDate"
                  value={changeOrderFormData.coDate}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
            </div>

            {/* Submitted To/By Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/2 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="coSubmittedTo"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Submitted To
                </label>
                <input
                  type="text"
                  id="coSubmittedTo"
                  name="coSubmittedTo"
                  value={changeOrderFormData.coSubmittedTo}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/2 px-3">
                <label
                  htmlFor="coSubmittedBy"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Submitted By
                </label>
                <input
                  type="text"
                  id="coSubmittedBy"
                  name="coSubmittedBy"
                  value={changeOrderFormData.coSubmittedBy}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
            </div>

            {/* Change Requested By Row */}
            <div className="mb-5">
              <label className="block mb-2 font-bold text-sm text-gray-700">
                Change Requested By
              </label>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="self-company"
                    name="selfCompany"
                    checked={changeOrderFormData.changeRequestedBy.selfCompany}
                    onChange={(e) =>
                      handleChangeOrderCheckboxChange(e, "changeRequestedBy")
                    }
                    className="mr-2"
                  />
                  <label htmlFor="self-company">Self / Company</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="client"
                    name="client"
                    checked={changeOrderFormData.changeRequestedBy.client}
                    onChange={(e) =>
                      handleChangeOrderCheckboxChange(e, "changeRequestedBy")
                    }
                    className="mr-2"
                  />
                  <label htmlFor="client">Client</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="architect"
                    name="architect"
                    checked={changeOrderFormData.changeRequestedBy.architect}
                    onChange={(e) =>
                      handleChangeOrderCheckboxChange(e, "changeRequestedBy")
                    }
                    className="mr-2"
                  />
                  <label htmlFor="architect">Architect</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="engineer"
                    name="engineer"
                    checked={changeOrderFormData.changeRequestedBy.engineer}
                    onChange={(e) =>
                      handleChangeOrderCheckboxChange(e, "changeRequestedBy")
                    }
                    className="mr-2"
                  />
                  <label htmlFor="engineer">Engineer</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="construction-manager"
                    name="constructionManager"
                    checked={changeOrderFormData.changeRequestedBy.constructionManager}
                    onChange={(e) =>
                      handleChangeOrderCheckboxChange(e, "changeRequestedBy")
                    }
                    className="mr-2"
                  />
                  <label htmlFor="construction-manager">Construction Manager</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="code-official"
                    name="codeOfficial"
                    checked={changeOrderFormData.changeRequestedBy.codeOfficial}
                    onChange={(e) =>
                      handleChangeOrderCheckboxChange(e, "changeRequestedBy")
                    }
                    className="mr-2"
                  />
                  <label htmlFor="code-official">Code Enforc. Official</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="other-requester"
                    name="other"
                    checked={changeOrderFormData.changeRequestedBy.other}
                    onChange={(e) =>
                      handleChangeOrderCheckboxChange(e, "changeRequestedBy")
                    }
                    className="mr-2"
                  />
                  <label htmlFor="other-requester">Other</label>
                </div>
              </div>
              {changeOrderFormData.changeRequestedBy.other && (
                <div className="mt-3 pl-6">
                  <input
                    type="text"
                    id="other-requester-describe"
                    name="otherDescribe"
                    value={changeOrderFormData.changeRequestedBy.otherDescribe}
                    onChange={(e) =>
                      handleChangeOrderOtherDescChange(e, "changeRequestedBy")
                    }
                    placeholder="Describe..."
                    className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md box-border"
                  />
                </div>
              )}
            </div>

            {/* Description Row */}
            <div className="mb-5">
              <label
                htmlFor="coDescription"
                className="block mb-1 font-bold text-sm text-gray-700"
              >
                Description of Change Order
              </label>
              <textarea
                id="coDescription"
                name="coDescription"
                value={changeOrderFormData.coDescription}
                onChange={handleChangeOrderInputChange}
                className="w-full p-2 border border-gray-300 rounded-md box-border min-h-[100px] resize-y"
              ></textarea>
            </div>

            {/* Justification / Supporting Docs Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/2 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="justification"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Justification
                </label>
                <textarea
                  id="justification"
                  name="justification"
                  value={changeOrderFormData.justification}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border min-h-[80px] resize-y"
                ></textarea>
              </div>
              <div className="w-full md:w-1/2 px-3">
                <label
                  htmlFor="supportingDocs"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Supporting Documents
                </label>
                <textarea
                  id="supportingDocs"
                  name="supportingDocs"
                  value={changeOrderFormData.supportingDocs}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border min-h-[80px] resize-y"
                ></textarea>
              </div>
            </div>

            {/* Time Impact Row */}
            <div className="flex flex-wrap mb-5 -mx-3 items-center">
              <div className="w-full md:w-1/3 px-3 mb-4 md:mb-0">
                <label className="block mb-2 font-bold text-sm text-gray-700">
                  Time / Schedule Impact?
                </label>
                <div className="flex gap-x-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="time-yes"
                      name="yes"
                      checked={changeOrderFormData.timeImpact.yes}
                      onChange={(e) => handleChangeOrderCheckboxChange(e, "timeImpact")}
                      className="mr-2"
                    />
                    <label htmlFor="time-yes">Yes</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="time-no"
                      name="no"
                      checked={changeOrderFormData.timeImpact.no}
                      onChange={(e) => handleChangeOrderCheckboxChange(e, "timeImpact")}
                      className="mr-2"
                    />
                    <label htmlFor="time-no">No</label>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/3 px-3">
                <label
                  htmlFor="daysNumber"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Number of Days
                </label>
                <input
                  type="number"
                  id="daysNumber"
                  name="daysNumber"
                  value={changeOrderFormData.daysNumber}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
            </div>

            {/* Time Reason / Supporting Docs Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/2 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="timeReason"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Reason for Time / Schedule Impact
                </label>
                <textarea
                  id="timeReason"
                  name="timeReason"
                  value={changeOrderFormData.timeReason}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border min-h-[80px] resize-y"
                ></textarea>
              </div>
              <div className="w-full md:w-1/2 px-3">
                <label
                  htmlFor="timeSupportingDocs"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Supporting Documents
                </label>
                <textarea
                  id="timeSupportingDocs"
                  name="timeSupportingDocs"
                  value={changeOrderFormData.timeSupportingDocs}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border min-h-[80px] resize-y"
                ></textarea>
              </div>
            </div>

            {/* Budget Impact Row */}
            <div className="flex flex-wrap mb-5 -mx-3 items-center">
              <div className="w-full md:w-1/3 px-3 mb-4 md:mb-0">
                <label className="block mb-2 font-bold text-sm text-gray-700">
                  Budget Impact?
                </label>
                <div className="flex gap-x-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="budget-yes"
                      name="yes"
                      checked={changeOrderFormData.budgetImpact.yes}
                      onChange={(e) => handleChangeOrderCheckboxChange(e, "budgetImpact")}
                      className="mr-2"
                    />
                    <label htmlFor="budget-yes">Yes</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="budget-no"
                      name="no"
                      checked={changeOrderFormData.budgetImpact.no}
                      onChange={(e) => handleChangeOrderCheckboxChange(e, "budgetImpact")}
                      className="mr-2"
                    />
                    <label htmlFor="budget-no">No</label>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/3 px-3">
                <label
                  htmlFor="amount"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Amount $
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  step="0.01"
                  value={changeOrderFormData.amount}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
            </div>

            {/* Budget Reason / Supporting Docs Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/2 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="budgetReason"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Reason for Budget Impact
                </label>
                <textarea
                  id="budgetReason"
                  name="budgetReason"
                  value={changeOrderFormData.budgetReason}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border min-h-[80px] resize-y"
                ></textarea>
              </div>
              <div className="w-full md:w-1/2 px-3">
                <label
                  htmlFor="budgetSupportingDocs"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Supporting Documents
                </label>
                <textarea
                  id="budgetSupportingDocs"
                  name="budgetSupportingDocs"
                  value={changeOrderFormData.budgetSupportingDocs}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border min-h-[80px] resize-y"
                ></textarea>
              </div>
            </div>

            {/* Client Approval Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/3 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="clientApprovalParty"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Client Approv. Party
                </label>
                <input
                  type="text"
                  id="clientApprovalParty"
                  name="clientApprovalParty"
                  value={changeOrderFormData.clientApprovalParty}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/3 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="clientApprovalTitle"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="clientApprovalTitle"
                  name="clientApprovalTitle"
                  value={changeOrderFormData.clientApprovalTitle}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/3 px-3">
                <label
                  htmlFor="clientApprovalDate"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Date of Approval
                </label>
                <input
                  type="date"
                  id="clientApprovalDate"
                  name="clientApprovalDate"
                  value={changeOrderFormData.clientApprovalDate}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
            </div>

            {/* Company Approval Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/3 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="coApprovalParty"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Co. Approv. Party
                </label>
                <input
                  type="text"
                  id="coApprovalParty"
                  name="coApprovalParty"
                  value={changeOrderFormData.coApprovalParty}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/3 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="coApprovalTitle"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="coApprovalTitle"
                  name="coApprovalTitle"
                  value={changeOrderFormData.coApprovalTitle}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/3 px-3">
                <label
                  htmlFor="coApprovalDate"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Date of Approval
                </label>
                <input
                  type="date"
                  id="coApprovalDate"
                  name="coApprovalDate"
                  value={changeOrderFormData.coApprovalDate}
                  onChange={handleChangeOrderInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Equipment Form Tab Content */}
        <div
          id="equipment"
          className={`tab-content ${activeTab === "equipment" ? "block" : "hidden"}`}
        >
          <div className="bg-white shadow-md rounded-md p-6 mb-8">
            <div className="border-b-2 border-gray-200 pb-2 mb-5">
              <h2 className="text-2xl font-semibold text-black">
                Equipment and Materials Log
              </h2>
            </div>

            {/* Basic Info Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/4 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="eqPreparedBy"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Prepared By
                </label>
                <input
                  type="text"
                  id="eqPreparedBy"
                  name="eqPreparedBy"
                  value={equipmentFormData.eqPreparedBy}
                  onChange={handleEquipmentInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/4 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="eqProjectId"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Project ID
                </label>
                <input
                  type="text"
                  id="eqProjectId"
                  name="eqProjectId"
                  value={equipmentFormData.eqProjectId}
                  onChange={handleEquipmentInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/4 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="eqProjectName"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Project Name
                </label>
                <input
                  type="text"
                  id="eqProjectName"
                  name="eqProjectName"
                  value={equipmentFormData.eqProjectName}
                  onChange={handleEquipmentInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/4 px-3">
                <label
                  htmlFor="eqDate"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Date
                </label>
                <input
                  type="date"
                  id="eqDate"
                  name="eqDate"
                  value={equipmentFormData.eqDate}
                  onChange={handleEquipmentInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
            </div>

            {/* Equipment Table */}
            <div className="overflow-x-auto mb-5">
              <table className="min-w-full bg-white border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Item ID
                    </th>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Item Name
                    </th>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Intended Use
                    </th>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Approval Req?
                    </th>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Comments
                    </th>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentFormData.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 border-b border-gray-200">
                        <input
                          type="text"
                          name="itemId"
                          value={item.itemId}
                          onChange={(e) => handleEquipmentItemChange(e, item.id)}
                          className="w-full p-1 border border-gray-300 rounded-sm box-border text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200">
                        <input
                          type="text"
                          name="itemName"
                          value={item.itemName}
                          onChange={(e) => handleEquipmentItemChange(e, item.id)}
                          className="w-full p-1 border border-gray-300 rounded-sm box-border text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200">
                        <textarea
                          name="intendedUse"
                          value={item.intendedUse}
                          onChange={(e) => handleEquipmentItemChange(e, item.id)}
                          className="w-full p-1 border border-gray-300 rounded-sm box-border text-sm min-h-[40px] resize-y"
                        ></textarea>
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200">
                        <input
                          type="text"
                          name="approvalReq"
                          value={item.approvalReq}
                          onChange={(e) => handleEquipmentItemChange(e, item.id)}
                          className="w-full p-1 border border-gray-300 rounded-sm box-border text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200">
                        <textarea
                          name="eqComments"
                          value={item.eqComments}
                          onChange={(e) => handleEquipmentItemChange(e, item.id)}
                          className="w-full p-1 border border-gray-300 rounded-sm box-border text-sm min-h-[40px] resize-y"
                        ></textarea>
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200 text-center">
                        <button
                          type="button"
                          onClick={() => removeEquipmentItem(item.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-semibold"
                          aria-label={`Remove item ${item.itemId || item.id}`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Item Button */}
            <div className="text-left">
              <button
                type="button"
                onClick={addEquipmentItem}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-300 text-sm"
              >
                + Add Equipment Item
              </button>
            </div>
          </div>
        </div>

        {/* Supply Log Form Tab Content (Placeholder) */}
        <div
          id="supply-log"
          className={`tab-content ${activeTab === "supply-log" ? "block" : "hidden"}`}
        >
          <div className="bg-white shadow-md rounded-md p-6 mb-8">
            <div className="border-b-2 border-gray-200 pb-2 mb-5">
              <h2 className="text-2xl font-semibold text-black">
                Project Supply Source Log
              </h2>
            </div>

            {/* Basic Info Row */}
            <div className="flex flex-wrap mb-5 -mx-3">
              <div className="w-full md:w-1/4 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="slPreparedBy"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Prepared By
                </label>
                <input
                  type="text"
                  id="slPreparedBy"
                  name="slPreparedBy"
                  value={supplyLogFormData.slPreparedBy}
                  onChange={handleSupplyLogInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/4 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="slProjectId"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Project ID
                </label>
                <input
                  type="text"
                  id="slProjectId"
                  name="slProjectId"
                  value={supplyLogFormData.slProjectId}
                  onChange={handleSupplyLogInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/4 px-3 mb-4 md:mb-0">
                <label
                  htmlFor="slProjectName"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Project Name
                </label>
                <input
                  type="text"
                  id="slProjectName"
                  name="slProjectName"
                  value={supplyLogFormData.slProjectName}
                  onChange={handleSupplyLogInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
              <div className="w-full md:w-1/4 px-3">
                <label
                  htmlFor="slDate"
                  className="block mb-1 font-bold text-sm text-gray-700"
                >
                  Date
                </label>
                <input
                  type="date"
                  id="slDate"
                  name="slDate"
                  value={supplyLogFormData.slDate}
                  onChange={handleSupplyLogInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md box-border"
                />
              </div>
            </div>

            {/* Supply Log Table */}
            <div className="overflow-x-auto mb-5">
              <table className="min-w-full bg-white border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Item ID
                    </th>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Product Name
                    </th>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Manufacturer
                    </th>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Description
                    </th>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Associated Task
                    </th>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Supplier
                    </th>
                    <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {supplyLogFormData.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 border-b border-gray-200">
                        <input
                          type="text"
                          name="supplyItemId"
                          value={item.supplyItemId}
                          onChange={(e) => handleSupplyItemChange(e, item.id)}
                          className="w-full p-1 border border-gray-300 rounded-sm box-border text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200">
                        <input
                          type="text"
                          name="productName"
                          value={item.productName}
                          onChange={(e) => handleSupplyItemChange(e, item.id)}
                          className="w-full p-1 border border-gray-300 rounded-sm box-border text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200">
                        <input
                          type="text"
                          name="manufacturer"
                          value={item.manufacturer}
                          onChange={(e) => handleSupplyItemChange(e, item.id)}
                          className="w-full p-1 border border-gray-300 rounded-sm box-border text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200">
                        <textarea
                          name="description"
                          value={item.description}
                          onChange={(e) => handleSupplyItemChange(e, item.id)}
                          className="w-full p-1 border border-gray-300 rounded-sm box-border text-sm min-h-[40px] resize-y"
                        ></textarea>
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200">
                        <input
                          type="text"
                          name="associatedTask"
                          value={item.associatedTask}
                          onChange={(e) => handleSupplyItemChange(e, item.id)}
                          className="w-full p-1 border border-gray-300 rounded-sm box-border text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200">
                        <input
                          type="text"
                          name="supplier"
                          value={item.supplier}
                          onChange={(e) => handleSupplyItemChange(e, item.id)}
                          className="w-full p-1 border border-gray-300 rounded-sm box-border text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200 text-center">
                        <button
                          type="button"
                          onClick={() => removeSupplyItem(item.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-semibold"
                          aria-label={`Remove supply item ${
                            item.supplyItemId || item.id
                          }`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Item Button */}
            <div className="text-left">
              <button
                type="button"
                onClick={addSupplyItem}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-300 text-sm"
              >
                + Add Supply Item
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="mt-8 text-right">
        <button
          type="button"
          className="bg-black text-white border-none py-3 px-6 text-base rounded-md cursor-pointer mr-2 transition duration-300 hover:bg-gray-800 disabled:opacity-50"
          onClick={generatePDF}
          // disabled={activeTab === 'equipment' || activeTab === 'supply-log'} // Disable for tabs without PDF generation yet
        >
          Generate PDF
        </button>
        <button
          type="button"
          className="bg-gray-500 text-white border-none py-3 px-6 text-base rounded-md cursor-pointer transition duration-300 hover:bg-gray-700"
          onClick={resetForm}
        >
          Reset Form
        </button>
      </div>
    </div>
  );
};

export default SubmittalPage;
