// src/app/dashboard/vendors/new/page.tsx

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import { createVendor } from "@/lib/services/VendorService";

export default function NewVendorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Hard-coded orgId, or fetch from global context if needed
  const orgId = "my-org";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await createVendor(orgId, {
        name,
        trade,
        contactEmail,
        contactPhone,
      });
      router.push("/dashboard/vendors");
    } catch (err: any) {
      console.error("Create vendor error:", err);
      setError(err.message || "Failed to create vendor.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    router.push("/dashboard/vendors");
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add New Vendor</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600 mt-2">{error}</p>}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block mb-1 font-medium">Name</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Trade</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              placeholder="e.g. Plumbing, Electrical..."
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Email</label>
            <input
              type="email"
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Phone</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <GrayButton type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Vendor"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
