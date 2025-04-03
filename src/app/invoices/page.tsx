"use client";

import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { v4 as uuidv4 } from "uuid";

// Define interfaces for invoice items
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceFormData {
  // Invoice Info
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;

  // Client Info
  clientName: string;
  clientCompany: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  clientEmail: string;
  clientPhone: string;

  // Project Info
  projectName: string;
  projectId: string;

  // Invoice Items
  items: InvoiceItem[];

  // Totals
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;

  // Notes
  notes: string;
  terms: string;

  // Payment Info
  paymentMethod: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;

  // Company Info
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyZip: string;
  companyEmail: string;
  companyPhone: string;
}

const InvoicePage = () => {
  // Initialize form data
  const [invoiceFormData, setInvoiceFormData] = useState<InvoiceFormData>({
    invoiceNumber: "",
    invoiceDate: "",
    dueDate: "",

    clientName: "",
    clientCompany: "",
    clientAddress: "",
    clientCity: "",
    clientState: "",
    clientZip: "",
    clientEmail: "",
    clientPhone: "",

    projectName: "",
    projectId: "",

    items: [],

    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,

    notes: "",
    terms: "Net 30",

    paymentMethod: "Bank Transfer",
    bankName: "",
    accountName: "",
    accountNumber: "",
    routingNumber: "",

    companyName: "WORKSHOP | GR",
    companyAddress: "",
    companyCity: "",
    companyState: "",
    companyZip: "",
    companyEmail: "",
    companyPhone: "",
  });

  // Add state for html2pdf
  const [html2pdf, setHtml2pdf] = useState<any>(null);

  // Load html2pdf dynamically on client side
  useEffect(() => {
    import("html2pdf.js").then((module) => {
      setHtml2pdf(() => module.default);
    });
  }, []);

  // Input handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setInvoiceFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Add invoice item
  const addInvoiceItem = () => {
    setInvoiceFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: uuidv4(),
          description: "",
          quantity: 1,
          rate: 0,
          amount: 0,
        },
      ],
    }));
  };

  // Remove invoice item
  const removeInvoiceItem = (idToRemove: string) => {
    setInvoiceFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== idToRemove),
    }));
  };

  // Handle invoice item change
  const handleItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    idToUpdate: string
  ) => {
    const { name, value } = e.target;
    setInvoiceFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === idToUpdate) {
          const updatedItem = { ...item };
          if (name === "quantity" || name === "rate") {
            // Type-safe property access
            updatedItem[name as keyof Pick<InvoiceItem, "quantity" | "rate">] =
              parseFloat(value) || 0;
            // Recalculate amount
            updatedItem.amount = updatedItem.quantity * updatedItem.rate;
          } else if (name === "description") {
            updatedItem.description = value;
          }
          return updatedItem;
        }
        return item;
      }),
    }));

    // Recalculate totals
    calculateTotals();
  };

  // Calculate totals
  const calculateTotals = () => {
    setInvoiceFormData((prev) => {
      const subtotal = prev.items.reduce((sum, item) => sum + item.amount, 0);
      const taxAmount = subtotal * (prev.taxRate / 100);
      const total = subtotal + taxAmount;

      return {
        ...prev,
        subtotal,
        taxAmount,
        total,
      };
    });
  };

  // Reset form
  const resetForm = () => {
    if (confirm("Are you sure you want to reset the form? All data will be lost.")) {
      setInvoiceFormData({
        invoiceNumber: "",
        invoiceDate: "",
        dueDate: "",
        clientName: "",
        clientCompany: "",
        clientAddress: "",
        clientCity: "",
        clientState: "",
        clientZip: "",
        clientEmail: "",
        clientPhone: "",
        projectName: "",
        projectId: "",
        items: [],
        subtotal: 0,
        taxRate: 0,
        taxAmount: 0,
        total: 0,
        notes: "",
        terms: "Net 30",
        paymentMethod: "Bank Transfer",
        bankName: "",
        accountName: "",
        accountNumber: "",
        routingNumber: "",
        companyName: "WORKSHOP | GR",
        companyAddress: "",
        companyCity: "",
        companyState: "",
        companyZip: "",
        companyEmail: "",
        companyPhone: "",
      });
    }
  };

  // Modify the generatePDF function
  const generatePDF = async () => {
    if (!html2pdf) {
      console.log("PDF generator is loading...");
      return;
    }

    // Create the invoice HTML template
    const invoiceTemplate = document.createElement("div");
    invoiceTemplate.innerHTML = `
      <div class="invoice-container" style="font-family: 'Montserrat', sans-serif; padding: 0.35in; max-width: 8.5in; color: #1a1a1a;">
        <!-- Header -->
        <div style="margin-bottom: 0.2in;">
          <div style="font-size: 24px; font-weight: 700; color: #000000;">WORKSHOP | GR</div>
          <div style="border-bottom: 1px solid #000; margin: 0.1in 0;"></div>
        </div>

        <!-- Two Column Layout for Top Section -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.2in;">
          <!-- Left Column: Project Info -->
          <div style="font-size: 11px; font-weight: 500; color: #000000;">
            <div>INVOICE: #${invoiceFormData.invoiceNumber}</div>
            <div>DATE: ${invoiceFormData.invoiceDate}</div>
            <div>DUE DATE: ${invoiceFormData.dueDate}</div>
            <div style="margin-top: 0.05in;">
              <div>PROJECT: ${invoiceFormData.projectName}</div>
              <div>PROJECT ID: ${invoiceFormData.projectId}</div>
            </div>
          </div>

          <!-- Right Column: Client Info -->
          <div style="font-size: 11px; text-align: right; color: #000000;">
            <div style="font-weight: 500; margin-bottom: 0.05in;">BILL TO:</div>
            <div>${invoiceFormData.clientName}</div>
            <div>${invoiceFormData.clientCompany}</div>
            <div>${invoiceFormData.clientAddress}</div>
            <div>${invoiceFormData.clientCity}, ${invoiceFormData.clientState} ${
      invoiceFormData.clientZip
    }</div>
            <div>Phone: ${invoiceFormData.clientPhone}</div>
            <div>Email: ${invoiceFormData.clientEmail}</div>
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.2in; font-size: 10px; color: #000000;">
          <thead>
            <tr style="background-color: #000; color: #ffffff;">
              <th style="padding: 0.1in; text-align: left;">Description</th>
              <th style="padding: 0.1in; text-align: right; width: 15%;">Quantity</th>
              <th style="padding: 0.1in; text-align: right; width: 15%;">Rate</th>
              <th style="padding: 0.1in; text-align: right; width: 15%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceFormData.items
              .map(
                (item) => `
              <tr>
                <td style="padding: 0.1in; border-bottom: 1px solid #ddd;">${
                  item.description
                }</td>
                <td style="padding: 0.1in; border-bottom: 1px solid #ddd; text-align: right;">${
                  item.quantity
                }</td>
                <td style="padding: 0.1in; border-bottom: 1px solid #ddd; text-align: right;">$${item.rate.toFixed(
                  2
                )}</td>
                <td style="padding: 0.1in; border-bottom: 1px solid #ddd; text-align: right;">$${item.amount.toFixed(
                  2
                )}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <!-- Bottom Section with Three Columns -->
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #000000;">
          <!-- Left Column: Payment Info -->
          <div style="width: 30%;">
            <div style="font-weight: 500; margin-bottom: 0.05in;">Payment Information</div>
            <div>Method: ${invoiceFormData.paymentMethod}</div>
            <div>Bank: ${invoiceFormData.bankName}</div>
            <div>Account Name: ${invoiceFormData.accountName}</div>
            <div>Account #: ${invoiceFormData.accountNumber}</div>
            <div>Routing #: ${invoiceFormData.routingNumber}</div>
          </div>

          <!-- Middle Column: Notes & Terms -->
          <div style="width: 35%; padding: 0 0.1in;">
            ${
              invoiceFormData.notes || invoiceFormData.terms
                ? `
              <div style="font-weight: 500; margin-bottom: 0.05in;">Notes & Terms</div>
              <div>
                ${invoiceFormData.notes}
                ${
                  invoiceFormData.terms
                    ? `<div style="margin-top: 0.05in;">Terms: ${invoiceFormData.terms}</div>`
                    : ""
                }
              </div>
            `
                : ""
            }
          </div>

          <!-- Right Column: Totals -->
          <div style="width: 25%; background-color: #f9f9f9; border: 1px solid #ddd; padding: 0.1in;">
            <div style="font-weight: 500;">
              <div>Subtotal: $${invoiceFormData.subtotal.toFixed(2)}</div>
              <div>Tax (${
                invoiceFormData.taxRate
              }%): $${invoiceFormData.taxAmount.toFixed(2)}</div>
              <div style="margin-top: 0.05in; font-size: 11px; font-weight: 700;">Total: $${invoiceFormData.total.toFixed(
                2
              )}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 0.2in; padding-top: 0.1in; border-top: 1px solid #ddd; font-size: 9px; color: #333333; text-align: center;">
          ${invoiceFormData.companyName} | ${invoiceFormData.companyAddress}, ${
      invoiceFormData.companyCity
    }, ${invoiceFormData.companyState} ${invoiceFormData.companyZip}
          | Phone: ${invoiceFormData.companyPhone} | Email: ${
      invoiceFormData.companyEmail
    }
        </div>
      </div>
    `;

    // Add Montserrat font
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap');
    `;
    invoiceTemplate.appendChild(style);

    // Configure PDF options
    const opt = {
      margin: 0,
      filename: `WORKSHOP_GR_Invoice_${invoiceFormData.invoiceNumber}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: {
        scale: 2,
        letterRendering: true,
        useCORS: true,
      },
      jsPDF: {
        unit: "in",
        format: "letter",
        orientation: "portrait",
      },
    };

    // Generate PDF
    html2pdf().from(invoiceTemplate).set(opt).save();
  };

  return (
    <div className="container mx-auto p-5 font-sans">
      {/* Logo */}
      <div className="mb-8 text-3xl font-medium flex items-center">
        <span className="logo-text">WORKSHOP</span>
        <span className="divider inline-block border-l-2 border-black h-10 mx-2 align-middle"></span>
        <span className="logo-text">GR</span>
      </div>

      <div className="bg-white shadow-md rounded-md p-6 mb-8">
        <div className="border-b-2 border-gray-200 pb-2 mb-5">
          <h2 className="text-2xl font-semibold text-black">Invoice Generator</h2>
        </div>

        {/* Invoice Details Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Invoice Number
              </label>
              <input
                type="text"
                name="invoiceNumber"
                value={invoiceFormData.invoiceNumber}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Invoice Date
              </label>
              <input
                type="date"
                name="invoiceDate"
                value={invoiceFormData.invoiceDate}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Due Date
              </label>
              <input
                type="date"
                name="dueDate"
                value={invoiceFormData.dueDate}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Client Information Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Client Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Client Name
              </label>
              <input
                type="text"
                name="clientName"
                value={invoiceFormData.clientName}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Company Name
              </label>
              <input
                type="text"
                name="clientCompany"
                value={invoiceFormData.clientCompany}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Street Address
              </label>
              <input
                type="text"
                name="clientAddress"
                value={invoiceFormData.clientAddress}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 text-sm font-bold text-gray-700">City</label>
                <input
                  type="text"
                  name="clientCity"
                  value={invoiceFormData.clientCity}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-bold text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  name="clientState"
                  value={invoiceFormData.clientState}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-bold text-gray-700">ZIP</label>
                <input
                  type="text"
                  name="clientZip"
                  value={invoiceFormData.clientZip}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">Email</label>
              <input
                type="email"
                name="clientEmail"
                value={invoiceFormData.clientEmail}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">Phone</label>
              <input
                type="tel"
                name="clientPhone"
                value={invoiceFormData.clientPhone}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Project Information Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Project Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Project Name
              </label>
              <input
                type="text"
                name="projectName"
                value={invoiceFormData.projectName}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Project ID
              </label>
              <input
                type="text"
                name="projectId"
                value={invoiceFormData.projectId}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Invoice Items Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Invoice Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                    Description
                  </th>
                  <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                    Quantity
                  </th>
                  <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                    Rate
                  </th>
                  <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                    Amount
                  </th>
                  <th className="py-2 px-3 border-b text-left text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoiceFormData.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 border-b">
                      <input
                        type="text"
                        name="description"
                        value={item.description}
                        onChange={(e) => handleItemChange(e, item.id)}
                        className="w-full p-1 border border-gray-300 rounded-sm text-gray-900"
                      />
                    </td>
                    <td className="py-2 px-3 border-b">
                      <input
                        type="number"
                        name="quantity"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(e, item.id)}
                        className="w-full p-1 border border-gray-300 rounded-sm text-gray-900"
                      />
                    </td>
                    <td className="py-2 px-3 border-b">
                      <input
                        type="number"
                        name="rate"
                        value={item.rate}
                        onChange={(e) => handleItemChange(e, item.id)}
                        className="w-full p-1 border border-gray-300 rounded-sm text-gray-900"
                      />
                    </td>
                    <td className="py-2 px-3 border-b">${item.amount.toFixed(2)}</td>
                    <td className="py-2 px-3 border-b">
                      <button
                        onClick={() => removeInvoiceItem(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={addInvoiceItem}
            className="mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
          >
            + Add Item
          </button>
        </div>

        {/* Totals Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Totals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Tax Rate (%)
              </label>
              <input
                type="number"
                name="taxRate"
                value={invoiceFormData.taxRate}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Subtotal
              </label>
              <div className="w-full p-2 bg-gray-100 rounded-md">
                ${invoiceFormData.subtotal.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">Total</label>
              <div className="w-full p-2 bg-black text-white rounded-md">
                ${invoiceFormData.total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Notes and Terms Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Notes and Terms</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">Notes</label>
              <textarea
                name="notes"
                value={invoiceFormData.notes}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md h-32"
              ></textarea>
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">Terms</label>
              <textarea
                name="terms"
                value={invoiceFormData.terms}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md h-32"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Payment Information Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Payment Method
              </label>
              <input
                type="text"
                name="paymentMethod"
                value={invoiceFormData.paymentMethod}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Bank Name
              </label>
              <input
                type="text"
                name="bankName"
                value={invoiceFormData.bankName}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Account Name
              </label>
              <input
                type="text"
                name="accountName"
                value={invoiceFormData.accountName}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Account Number
              </label>
              <input
                type="text"
                name="accountNumber"
                value={invoiceFormData.accountNumber}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Routing Number
              </label>
              <input
                type="text"
                name="routingNumber"
                value={invoiceFormData.routingNumber}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Company Information Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={invoiceFormData.companyName}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">
                Street Address
              </label>
              <input
                type="text"
                name="companyAddress"
                value={invoiceFormData.companyAddress}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 text-sm font-bold text-gray-700">City</label>
                <input
                  type="text"
                  name="companyCity"
                  value={invoiceFormData.companyCity}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-bold text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  name="companyState"
                  value={invoiceFormData.companyState}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-bold text-gray-700">ZIP</label>
                <input
                  type="text"
                  name="companyZip"
                  value={invoiceFormData.companyZip}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">Email</label>
              <input
                type="email"
                name="companyEmail"
                value={invoiceFormData.companyEmail}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-bold text-gray-700">Phone</label>
              <input
                type="tel"
                name="companyPhone"
                value={invoiceFormData.companyPhone}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-8 text-right">
          <button
            type="button"
            className="bg-black text-white py-3 px-6 rounded-md mr-2 hover:bg-gray-800"
            onClick={generatePDF}
          >
            Generate PDF
          </button>
          <button
            type="button"
            className="bg-gray-500 text-white py-3 px-6 rounded-md hover:bg-gray-700"
            onClick={resetForm}
          >
            Reset Form
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
