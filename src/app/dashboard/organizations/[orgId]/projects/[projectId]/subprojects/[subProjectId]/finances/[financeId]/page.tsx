// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/finances/[financeId]/page.tsx

"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  fetchFinance,
  updateFinance,
  uploadReceipt,
  FinanceDoc,
} from "@/lib/services/FinanceService";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

export default function FinanceDetailPage() {
  const { orgId, projectId, subProjectId, financeId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    financeId: string;
  };

  const [finance, setFinance] = useState<FinanceDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Editing fields
  const [type, setType] = useState("invoice");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [status, setStatus] = useState("unpaid");

  // For uploading attachments
  const [receiptFiles, setReceiptFiles] = useState<FileList | null>(null);

  // 1. Fetch finance data
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (!orgId || !projectId || !subProjectId || !financeId) return;
        const data = await fetchFinance(orgId, projectId, subProjectId, financeId);

        setFinance(data);
        setType(data.type || "invoice");
        setDescription(data.description || "");
        setAmount(data.amount?.toString() || "0.00");
        setStatus(data.status || "unpaid");
      } catch (err: any) {
        console.error("Fetch finance error:", err);
        setError("Failed to load finance record.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, financeId]);

  // 2. Update finance doc
  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!finance) return;
    try {
      await updateFinance(orgId, projectId, subProjectId, finance.id, {
        type,
        description,
        amount: parseFloat(amount) || 0,
        status,
      });
      alert("Finance record updated!");
    } catch (err: any) {
      console.error("Update finance error:", err);
      setError("Failed to update finance record.");
    }
  }

  // 3. Upload attachments (receipts)
  async function handleUploadReceipts() {
    if (!finance || !receiptFiles || receiptFiles.length === 0) return;
    try {
      const updatedAttachments = finance.attachments ? [...finance.attachments] : [];
      for (let i = 0; i < receiptFiles.length; i++) {
        const file = receiptFiles[i];
        const url = await uploadReceipt(orgId, projectId, subProjectId, finance.id, file);
        updatedAttachments.push(url);
      }
      await updateFinance(orgId, projectId, subProjectId, finance.id, {
        attachments: updatedAttachments,
      });
      setFinance({ ...finance, attachments: updatedAttachments });
      setReceiptFiles(null);
      alert("Receipts uploaded!");
    } catch (err: any) {
      console.error("Upload receipts error:", err);
      setError("Failed to upload receipts");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm">Loading finance record...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!finance) {
    return <div className="p-6">No finance record found.</div>;
  }

  return (
    <PageContainer>
      {/* Back link */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances`}
        className="
          text-sm font-medium text-blue-600 underline 
          hover:text-blue-700 dark:text-blue-400 
          dark:hover:text-blue-300 transition-colors
        "
      >
        &larr; Back to Finances
      </Link>

      {/* Finance Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          {finance.type.toUpperCase()} – ${finance.amount.toFixed(2)}
        </h1>
        {/* If you want more fields in header, add them here */}
      </div>

      {/* Primary Details Card */}
      <Card>
        <form onSubmit={handleUpdate} className="space-y-4">
          {/* Row 1: Type, Description */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                className="
                  border p-2 rounded w-full
                  bg-white text-black
                  dark:bg-neutral-800 dark:text-white
                "
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="invoice">Invoice</option>
                <option value="expense">Expense</option>
                <option value="payment">Payment</option>
                <option value="receipt">Receipt</option>
                <option value="bill">Bill</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="
                  border p-2 rounded w-full
                  bg-white text-black
                  dark:bg-neutral-800 dark:text-white
                "
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Row 2: Amount */}
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              className="
                border p-2 rounded w-full
                bg-white text-black
                dark:bg-neutral-800 dark:text-white
              "
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Row 3: Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="
                border p-2 rounded w-full
                bg-white text-black
                dark:bg-neutral-800 dark:text-white
              "
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Update button */}
          <div>
            <GrayButton type="submit">Update Finance</GrayButton>
          </div>
        </form>
      </Card>

      {/* Attachments Card */}
      <Card>
        <h2 className="text-lg font-semibold">Receipts / Attachments</h2>

        {/* Existing attachments */}
        {finance.attachments && finance.attachments.length > 0 ? (
          <ul className="list-disc ml-5 text-sm mt-2">
            {finance.attachments.map((url, i) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    text-blue-600 underline
                    hover:text-blue-700
                    dark:text-blue-400 dark:hover:text-blue-300
                  "
                >
                  {url.split("/").pop()}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm mt-1">No attachments yet.</p>
        )}

        {/* Upload new receipts */}
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium">Upload Files</label>
          <input
            type="file"
            multiple
            onChange={(e) => setReceiptFiles(e.target.files)}
            className="
              file:mr-2 file:py-2 file:px-3
              file:border-0 file:rounded
              file:bg-gray-300 file:text-black
              hover:file:bg-gray-400
              dark:file:bg-gray-700 dark:file:text-white
              dark:hover:file:bg-gray-600
            "
          />
          <GrayButton onClick={handleUploadReceipts}>Upload</GrayButton>
        </div>
      </Card>
    </PageContainer>
  );
}
