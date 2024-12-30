// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/finances/new/page.tsx

"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createFinance } from "@/lib/services/FinanceService";

export default function NewFinancePage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  // local states
  const [type, setType] = useState("invoice");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [vendorId, setVendorId] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("unpaid");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const numericAmount = parseFloat(amount) || 0;
      let dateObj: Date | null = null;
      let dueObj: Date | null = null;
      if (date) dateObj = new Date(date);
      if (dueDate) dueObj = new Date(dueDate);

      await createFinance(orgId, projectId, subProjectId, {
        type,
        description,
        amount: numericAmount,
        vendorId: vendorId || null,
        contractorId: contractorId || null,
        date: dateObj,
        dueDate: dueObj,
        status,
      });
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances`
      );
    } catch (err: any) {
      console.error("Create finance error:", err);
      setError(err.message || "Failed to create finance record.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances`}
        className="text-blue-600 underline"
      >
        &larr; Back to Finances
      </Link>

      <h1 className="text-2xl font-bold">Create Finance Record</h1>

      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        <div>
          <label className="block font-medium mb-1">Type</label>
          <select
            className="border p-2 w-full"
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

        {/* Description */}
        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea
            className="border p-2 w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block font-medium mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            className="border p-2 w-full"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* VendorId, ContractorId */}
        <div>
          <label className="block font-medium mb-1">Vendor ID (optional)</label>
          <input
            className="border p-2 w-full"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Contractor ID (optional)</label>
          <input
            className="border p-2 w-full"
            value={contractorId}
            onChange={(e) => setContractorId(e.target.value)}
          />
        </div>

        {/* Dates */}
        <div className="flex gap-4">
          <div>
            <label className="block font-medium mb-1">Date</label>
            <input
              type="date"
              className="border p-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Due Date</label>
            <input
              type="date"
              className="border p-2"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block font-medium mb-1">Status</label>
          <select
            className="border p-2 w-full"
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
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          {loading ? "Creating..." : "Create Finance"}
        </button>
      </form>
    </main>
  );
}
