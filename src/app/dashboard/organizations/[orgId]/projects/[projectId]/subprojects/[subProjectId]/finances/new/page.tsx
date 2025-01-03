// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/finances/new/page.tsx

"use client";

import React, { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createFinance } from "@/lib/services/FinanceService";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

enum Step {
  TYPE_AMOUNT,
  PARTY_DATES,
  STATUS_DESCRIPTION,
  REVIEW_SUBMIT,
}

export default function NewFinanceWizardPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  // Wizard states
  const [currentStep, setCurrentStep] = useState<Step>(Step.TYPE_AMOUNT);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form fields
  const [type, setType] = useState("invoice");
  const [amount, setAmount] = useState("0.00");
  const [vendorId, setVendorId] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("unpaid");
  const [description, setDescription] = useState("");

  function nextStep() {
    if (currentStep < Step.REVIEW_SUBMIT) {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function prevStep() {
    if (currentStep > Step.TYPE_AMOUNT) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances`
    );
  }

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
        amount: numericAmount,
        vendorId: vendorId || null,
        contractorId: contractorId || null,
        date: dateObj,
        dueDate: dueObj,
        status,
        description,
      });

      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances`
      );
    } catch (err: any) {
      console.error("Create finance wizard error:", err);
      setError(err.message || "Failed to create finance record.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      {/* Page Title + Cancel */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create New Finance (Wizard)</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && (
        <p className="text-red-600 bg-red-50 dark:bg-red-900 p-2 rounded">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          {/* Step 1: TYPE & AMOUNT */}
          {currentStep === Step.TYPE_AMOUNT && (
            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Type</label>
                <select
                  className="
                    border p-2 w-full
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
                <label className="block mb-1 font-medium">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="
                    border p-2 w-full
                    bg-white text-black
                    dark:bg-neutral-800 dark:text-white
                  "
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: PARTY & DATES */}
          {currentStep === Step.PARTY_DATES && (
            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Vendor ID (optional)</label>
                <input
                  className="
                    border p-2 w-full
                    bg-white text-black
                    dark:bg-neutral-800 dark:text-white
                  "
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Contractor ID (optional)</label>
                <input
                  className="
                    border p-2 w-full
                    bg-white text-black
                    dark:bg-neutral-800 dark:text-white
                  "
                  value={contractorId}
                  onChange={(e) => setContractorId(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block mb-1 font-medium">Date</label>
                  <input
                    type="date"
                    className="
                      border p-2 w-full
                      bg-white text-black
                      dark:bg-neutral-800 dark:text-white
                    "
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Due Date</label>
                  <input
                    type="date"
                    className="
                      border p-2 w-full
                      bg-white text-black
                      dark:bg-neutral-800 dark:text-white
                    "
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: STATUS & DESCRIPTION */}
          {currentStep === Step.STATUS_DESCRIPTION && (
            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Status</label>
                <select
                  className="
                    border p-2 w-full
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
              <div>
                <label className="block mb-1 font-medium">Description</label>
                <textarea
                  className="
                    border p-2 w-full
                    bg-white text-black
                    dark:bg-neutral-800 dark:text-white
                  "
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 4: REVIEW & SUBMIT */}
          {currentStep === Step.REVIEW_SUBMIT && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Review & Submit</h2>
              <ul className="list-disc ml-5 space-y-1 text-sm">
                <li>Type: {type}</li>
                <li>Amount: {amount}</li>
                <li>Vendor ID: {vendorId || "N/A"}</li>
                <li>Contractor ID: {contractorId || "N/A"}</li>
                <li>Date: {date || "N/A"}</li>
                <li>Due Date: {dueDate || "N/A"}</li>
                <li>Status: {status}</li>
                <li>Description: {description}</li>
              </ul>
            </div>
          )}
        </Card>

        {/* Wizard Buttons */}
        <div className="flex gap-4">
          {/* Potential Cancel if you want a second button: 
          <GrayButton type="button" onClick={handleCancel}>Cancel</GrayButton> 
          */}
          {currentStep !== Step.TYPE_AMOUNT && (
            <GrayButton type="button" onClick={prevStep}>
              Back
            </GrayButton>
          )}
          {currentStep !== Step.REVIEW_SUBMIT && (
            <GrayButton type="button" onClick={nextStep}>
              Next
            </GrayButton>
          )}
          {currentStep === Step.REVIEW_SUBMIT && (
            <GrayButton type="submit" disabled={loading}>
              {loading ? "Creating..." : "Submit Finance"}
            </GrayButton>
          )}
        </div>
      </form>
    </PageContainer>
  );
}
