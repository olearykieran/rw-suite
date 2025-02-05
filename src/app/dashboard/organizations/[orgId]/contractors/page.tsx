// src/app/dashboard/organizations/[orgId]/contractors/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

interface Contractor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export default function ContractorsPage() {
  const { orgId } = useParams() as { orgId: string };
  const router = useRouter();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For editing a contractor
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedPhone, setEditedPhone] = useState("");

  useEffect(() => {
    async function fetchContractors() {
      try {
        const ref = collection(firestore, "organizations", orgId, "contractors");
        const snapshot = await getDocs(ref);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Contractor[];
        setContractors(data);
      } catch (err: any) {
        console.error("Fetch contractors error:", err);
        setError("Failed to load contractors.");
      } finally {
        setLoading(false);
      }
    }
    if (orgId) {
      fetchContractors();
    }
  }, [orgId]);

  async function handleSave(contractorId: string) {
    try {
      const ref = doc(firestore, "organizations", orgId, "contractors", contractorId);
      await updateDoc(ref, {
        name: editedName,
        email: editedEmail,
        phone: editedPhone,
        updatedAt: serverTimestamp(),
      });
      setContractors((prev) =>
        prev.map((c) =>
          c.id === contractorId
            ? { ...c, name: editedName, email: editedEmail, phone: editedPhone }
            : c
        )
      );
      setEditingId(null);
    } catch (err: any) {
      console.error("Save contractor error:", err);
      alert("Failed to update contractor.");
    }
  }

  if (loading) return <PageContainer>Loading contractors...</PageContainer>;
  if (error) return <PageContainer className="text-red-600">{error}</PageContainer>;

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold mb-4">Contractors</h1>
      {contractors.map((contractor) => (
        <Card key={contractor.id} className="mb-4 p-4">
          {editingId === contractor.id ? (
            <div className="space-y-2">
              <input
                type="text"
                className="border p-2 w-full rounded"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Name"
              />
              <input
                type="email"
                className="border p-2 w-full rounded"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                placeholder="Email"
              />
              <input
                type="text"
                className="border p-2 w-full rounded"
                value={editedPhone}
                onChange={(e) => setEditedPhone(e.target.value)}
                placeholder="Phone"
              />
              <div className="flex gap-2">
                <GrayButton onClick={() => handleSave(contractor.id)}>Save</GrayButton>
                <GrayButton onClick={() => setEditingId(null)}>Cancel</GrayButton>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-semibold text-lg">{contractor.name}</p>
              <p className="text-sm">Email: {contractor.email || "N/A"}</p>
              <p className="text-sm">Phone: {contractor.phone || "N/A"}</p>
              <GrayButton
                onClick={() => {
                  setEditingId(contractor.id);
                  setEditedName(contractor.name);
                  setEditedEmail(contractor.email || "");
                  setEditedPhone(contractor.phone || "");
                }}
              >
                Edit
              </GrayButton>
            </div>
          )}
        </Card>
      ))}
      <GrayButton
        onClick={() => router.push(`/dashboard/organizations/${orgId}/contractors/new`)}
      >
        + Add New Contractor
      </GrayButton>
    </PageContainer>
  );
}
