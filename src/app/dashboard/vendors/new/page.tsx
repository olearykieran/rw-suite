// src/app/dashboard/vendors/new/page.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createVendor } from "@/lib/services/VendorService";

export default function NewVendorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const orgId = "my-org";

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

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Add New Vendor</h1>
      {error && <p className="text-red-600 mb-2">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block mb-1 font-medium">Name</label>
          <input
            className="border p-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Trade</label>
          <input
            className="border p-2 w-full"
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            placeholder="e.g. Plumbing, Electrical..."
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            className="border p-2 w-full"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Phone</label>
          <input
            className="border p-2 w-full"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          {loading ? "Saving..." : "Save Vendor"}
        </button>
      </form>
    </main>
  );
}
