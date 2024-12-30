// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/finances/[financeId]/page.tsx

"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchFinance,
  updateFinance,
  uploadReceipt,
  FinanceDoc,
} from "@/lib/services/FinanceService";

export default function FinanceDetailPage() {
  const { orgId, projectId, subProjectId, financeId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    financeId: string;
  };
  const router = useRouter();

  const [finance, setFinance] = useState<FinanceDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For editing
  const [type, setType] = useState("invoice");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [status, setStatus] = useState("unpaid");

  // For uploading receipts
  const [receiptFiles, setReceiptFiles] = useState<FileList | null>(null);

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

  async function handleUploadReceipts() {
    if (!finance) return;
    if (!receiptFiles || receiptFiles.length === 0) return;

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
    return <div className="p-4">Loading finance record...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }
  if (!finance) {
    return <div className="p-4">No finance record found.</div>;
  }

  return (
    <main className="p-4 space-y-4">
      {/* Back link */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances`}
        className="text-blue-600 underline"
      >
        &larr; Back to Finances
      </Link>

      <h1 className="text-2xl font-bold">
        Finance: {finance.type} - ${finance.amount?.toFixed(2)}
      </h1>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Type</label>
          <select
            className="border p-2"
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
          <label className="block font-medium mb-1">Description</label>
          <textarea
            className="border p-2 w-full"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            className="border p-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Status</label>
          <select
            className="border p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Update Finance
        </button>
      </form>

      {/* Attachments display */}
      <div className="border-t pt-4">
        <h2 className="text-xl font-semibold">Receipts / Attachments</h2>
        {finance.attachments && finance.attachments.length > 0 ? (
          <ul className="list-disc ml-5">
            {finance.attachments.map((url, i) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600"
                >
                  {url.split("/").pop()}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No attachments yet.</p>
        )}
      </div>

      {/* Upload new receipts */}
      <div className="border-t pt-4 space-y-3">
        <h2 className="text-xl font-semibold">Upload Receipts / Documents</h2>
        <input type="file" multiple onChange={(e) => setReceiptFiles(e.target.files)} />
        <button
          onClick={handleUploadReceipts}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Upload
        </button>
      </div>
    </main>
  );
}
