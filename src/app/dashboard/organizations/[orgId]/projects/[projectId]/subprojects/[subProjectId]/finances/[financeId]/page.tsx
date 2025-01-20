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
import { useLoading } from "@/components/ui/LoadingProvider";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { AnimatedList } from "@/components/ui/AnimatedList";

export default function FinanceDetailPage() {
  const { withLoading } = useLoading();
  const [showContent, setShowContent] = useState(false);

  // State management
  const [finance, setFinance] = useState<FinanceDoc | null>(null);
  const [error, setError] = useState("");
  const [type, setType] = useState("invoice");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [status, setStatus] = useState("unpaid");
  const [receiptFiles, setReceiptFiles] = useState<FileList | null>(null);

  // Get params
  const { orgId, projectId, subProjectId, financeId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    financeId: string;
  };

  // Load initial data
  useEffect(() => {
    withLoading(async () => {
      try {
        if (!orgId || !projectId || !subProjectId || !financeId) return;
        const data = await fetchFinance(orgId, projectId, subProjectId, financeId);

        setFinance(data);
        setType(data.type || "invoice");
        setDescription(data.description || "");
        setAmount(data.amount?.toString() || "0.00");
        setStatus(data.status || "unpaid");

        // Trigger animations after data is loaded
        setTimeout(() => setShowContent(true), 100);
      } catch (err: any) {
        console.error("Fetch finance error:", err);
        setError("Failed to load finance record.");
      }
    });
  }, [orgId, projectId, subProjectId, financeId, withLoading]);

  // Event handlers
  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!finance) return;

    await withLoading(async () => {
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
    });
  }

  async function handleUploadReceipts() {
    if (!finance || !receiptFiles || receiptFiles.length === 0) return;

    await withLoading(async () => {
      try {
        const updatedAttachments = finance.attachments ? [...finance.attachments] : [];
        for (let i = 0; i < receiptFiles.length; i++) {
          const file = receiptFiles[i];
          const url = await uploadReceipt(
            orgId,
            projectId,
            subProjectId,
            finance.id,
            file
          );
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
    });
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!finance) {
    return null;
  }

  return (
    <PageContainer>
      <div
        className={`
        opacity-0 transition-all duration-500 ease-out delay-[0ms]
        ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
      `}
      >
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances`}
          className="text-sm font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          &larr; Back to Finances
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            {finance.type.toUpperCase()} – ${finance.amount.toFixed(2)}
          </h1>
        </div>
      </div>

      <div
        className={`
        opacity-0 transition-all duration-500 ease-out delay-[100ms]
        ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
      `}
      >
        <Card>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  className="border p-2 rounded w-full bg-white text-black dark:bg-neutral-800 dark:text-white"
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
                  className="border p-2 rounded w-full bg-white text-black dark:bg-neutral-800 dark:text-white"
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

            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                className="border p-2 rounded w-full bg-white text-black dark:bg-neutral-800 dark:text-white"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="border p-2 rounded w-full bg-white text-black dark:bg-neutral-800 dark:text-white"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <GrayButton type="submit">Update Finance</GrayButton>
            </div>
          </form>
        </Card>
      </div>

      <div
        className={`
        opacity-0 transition-all duration-500 ease-out delay-[200ms]
        ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
      `}
      >
        <Card>
          <h2 className="text-lg font-semibold">Receipts / Attachments</h2>

          {finance.attachments && finance.attachments.length > 0 ? (
            <AnimatedList
              items={finance.attachments}
              className="mt-2"
              emptyMessage={<p className="text-sm mt-1">No attachments yet.</p>}
              renderItem={(url, index) => (
                <li className="list-disc ml-5 text-sm">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {url.split("/").pop()}
                  </a>
                </li>
              )}
            />
          ) : (
            <p className="text-sm mt-1">No attachments yet.</p>
          )}

          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium">Upload Files</label>
            <input
              type="file"
              multiple
              onChange={(e) => setReceiptFiles(e.target.files)}
              className="file:mr-2 file:py-2 file:px-3 file:border-0 file:rounded file:bg-gray-300 file:text-black hover:file:bg-gray-400 dark:file:bg-gray-700 dark:file:text-white dark:hover:file:bg-gray-600"
            />
            <GrayButton onClick={handleUploadReceipts}>Upload</GrayButton>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
