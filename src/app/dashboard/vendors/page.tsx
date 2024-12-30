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

export default function VendorsPage() {
  const [user] = useAuthState(auth);

  // Hard-coded orgId for demonstration. Replace or fetch from localStorage as needed.
  const orgId = "my-org";

  const [vendors, setVendors] = useState<VendorDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");

  // Load all vendors once user is available
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
    return <div className="p-4">Please sign in to view vendors.</div>;
  }

  if (loading) {
    return <div className="p-4">Loading Vendors…</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Vendors</h1>

      {/* Create new vendor */}
      <div className="flex items-center gap-2">
        <input
          className="border p-2"
          placeholder="Vendor Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          onClick={handleCreateVendor}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          Add Vendor
        </button>
      </div>

      {/* List existing vendors */}
      {vendors.length === 0 && <p>No vendors found.</p>}
      <ul className="space-y-2">
        {vendors.map((v) => (
          <li key={v.id} className="border p-2 rounded flex justify-between items-center">
            <div>
              <p className="font-semibold">{v.name}</p>
              {/* If vendor has more fields like contactEmail or contactPhone */}
              {v.contactEmail && (
                <p className="text-sm text-gray-500">Email: {v.contactEmail}</p>
              )}
              {v.contactPhone && (
                <p className="text-sm text-gray-500">Phone: {v.contactPhone}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Link to detail page for editing */}
              <Link
                href={`/dashboard/vendors/${v.id}`}
                className="text-blue-600 underline text-sm"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDeleteVendor(v.id)}
                className="text-red-600 text-sm underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
