"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchVendor, updateVendor, VendorDoc } from "@/lib/services/VendorService";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

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

  // For fade-in
  const [showContent, setShowContent] = useState(false);

  // 1. Load from Firestore
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
        // Trigger fade-in
        setTimeout(() => setShowContent(true), 100);
      }
    }
    if (vendorId) {
      load();
    }
  }, [vendorId, user]);

  // 2. Update vendor
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
      router.push("/dashboard/vendors");
    } catch (err: any) {
      console.error("Update vendor error:", err);
      setError(err.message || "Failed to update vendor.");
    }
  }

  // ---------- RENDER ----------
  if (!user) {
    return <div className="p-6">Please sign in.</div>;
  }

  if (loading) {
    return <div className="p-6 ">Loading vendor...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!vendor) {
    return <div className="p-6">Vendor not found.</div>;
  }

  return (
    <PageContainer>
      {/* === Section #1: Back + Title === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[0ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <GrayButton onClick={() => router.back()} className="mb-4 ">
          &larr; Back
        </GrayButton>

        <h1 className="text-2xl font-bold">Edit Vendor</h1>
      </div>

      {/* === Section #2: Edit Form === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[100ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Card>
          <form onSubmit={handleUpdate} className="space-y-4">
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
                placeholder="Plumbing, Electrical..."
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

            <GrayButton type="submit">Update</GrayButton>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
