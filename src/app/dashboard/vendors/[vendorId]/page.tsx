// src/app/dashboard/vendors/[vendorId]/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchVendor, updateVendor, VendorDoc } from "@/lib/services/VendorService";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";

export default function VendorDetailPage() {
  const router = useRouter();
  const { vendorId } = useParams() as { vendorId: string };
  const [user] = useAuthState(auth);

  // Hard-coded orgId for demonstration. Adjust as needed.
  const orgId = "my-org";

  const [vendor, setVendor] = useState<VendorDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Local fields
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    async function load() {
      try {
        if (!user) {
          setError("Must be signed in.");
          setLoading(false);
          return;
        }

        setLoading(true);
        const data = await fetchVendor(orgId, vendorId);
        setVendor(data);

        setName(data.name);
        setTrade(data.trade || "");
        setContactEmail(data.contactEmail || "");
        setContactPhone(data.contactPhone || "");
      } catch (err: any) {
        console.error("Fetch vendor error:", err);
        setError("Failed to load vendor.");
      } finally {
        setLoading(false);
      }
    }
    if (vendorId) {
      load();
    }
  }, [vendorId, user]);

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!vendor) return;

    try {
      await updateVendor(orgId, vendor.id, {
        name,
        trade,
        contactEmail,
        contactPhone,
      });
      alert("Vendor updated!");
      router.push("/dashboard/vendors"); // or wherever your vendor list is
    } catch (err: any) {
      console.error("Update vendor error:", err);
      setError(err.message || "Failed to update vendor.");
    }
  }

  if (!user) {
    return <div className="p-4">Please sign in.</div>;
  }

  if (loading) {
    return <div className="p-4">Loading vendor...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }
  if (!vendor) {
    return <div className="p-4">Vendor not found.</div>;
  }

  return (
    <main className="p-4 space-y-4 max-w-md">
      <button onClick={() => router.back()} className="text-blue-600 underline text-sm">
        &larr; Back
      </button>
      <h1 className="text-2xl font-bold">Edit Vendor</h1>

      <form onSubmit={handleUpdate} className="space-y-4">
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
            placeholder="Plumbing, Electrical..."
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
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Update
        </button>
      </form>
    </main>
  );
}
