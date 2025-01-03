// src/app/dashboard/vendors/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";

import {
  fetchAllVendors,
  createVendor,
  deleteVendor,
  VendorDoc,
} from "@/lib/services/VendorService";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

export default function VendorsPage() {
  const [user] = useAuthState(auth);

  // Hard-coded orgId for demonstration. Replace or fetch dynamically if needed.
  const orgId = "my-org";

  const [vendors, setVendors] = useState<VendorDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadVendors();
  }, [user]);

  async function loadVendors() {
    try {
      setLoading(true);
      const data = await fetchAllVendors(orgId);
      setVendors(data);
    } catch (err: any) {
      console.error("fetchAllVendors error:", err);
      setError(err.message || "Failed to load vendors.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateVendor() {
    if (!newName.trim()) return;
    try {
      await createVendor(orgId, { name: newName.trim() });
      setNewName("");
      loadVendors();
    } catch (err: any) {
      console.error("Create vendor error:", err);
      setError(err.message || "Failed to create vendor.");
    }
  }

  async function handleDeleteVendor(vendorId: string) {
    try {
      await deleteVendor(orgId, vendorId);
      loadVendors();
    } catch (err: any) {
      console.error("Delete vendor error:", err);
      setError(err.message || "Failed to delete vendor.");
    }
  }

  if (!user) {
    return <div className="p-6">Please sign in to view vendors.</div>;
  }

  if (loading) {
    return <div className="p-6 text-sm">Loading Vendors…</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold">Vendors</h1>

      {/* Create new vendor */}
      <Card>
        <div className="flex items-center gap-2">
          <input
            className="
              border p-2 rounded
              bg-white dark:bg-neutral-800 dark:text-white
            "
            placeholder="Vendor Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <GrayButton onClick={handleCreateVendor}>Add Vendor</GrayButton>
        </div>
      </Card>

      {/* List existing vendors */}
      {vendors.length === 0 && (
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
          No vendors found.
        </p>
      )}

      <div className="space-y-3 mt-4">
        {vendors.map((v) => (
          <Card key={v.id} className="flex justify-between items-center">
            <div>
              <p className="font-semibold">{v.name}</p>
              {/* Additional fields like contactEmail or contactPhone */}
              {v.contactEmail && <p className="text-sm">Email: {v.contactEmail}</p>}
              {v.contactPhone && <p className="text-sm">Phone: {v.contactPhone}</p>}
            </div>
            <div className="flex items-center gap-3">
              {/* Link to detail page for editing */}
              <Link
                href={`/dashboard/vendors/${v.id}`}
                className="
                  text-blue-600 underline text-sm
                  hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300
                "
              >
                Edit
              </Link>
              <GrayButton
                onClick={() => handleDeleteVendor(v.id)}
                className="text-xs bg-red-600 hover:bg-red-700"
              >
                Delete
              </GrayButton>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
