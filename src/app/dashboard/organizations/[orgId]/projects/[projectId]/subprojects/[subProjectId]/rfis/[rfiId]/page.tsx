// src/app/dashboard/organizations/[orgId]/projects/[projectId]/rfis/[rfiId]/page.tsx

"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { firestore, auth } from "@/lib/firebaseConfig";
import Link from "next/link";

export default function RfiDetailPage() {
  const { orgId, projectId, rfiId } = useParams() as {
    orgId: string;
    projectId: string;
    rfiId: string;
  };

  const [rfi, setRfi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [officialResponse, setOfficialResponse] = useState("");
  const [importance, setImportance] = useState("normal");

  useEffect(() => {
    const fetchRfi = async () => {
      try {
        if (!orgId || !projectId || !rfiId) return;
        const rfiRef = doc(
          firestore,
          "organizations",
          orgId,
          "projects",
          projectId,
          "rfis",
          rfiId
        );
        const snap = await getDoc(rfiRef);
        if (!snap.exists()) {
          setError("RFI not found or insufficient permissions.");
          return;
        }
        const data = snap.data();
        setRfi({ id: snap.id, ...data });
        setStatus(data.status || "draft");
        setImportance(data.importance || "normal");
        setOfficialResponse(data.officialResponse || "");
      } catch (err: any) {
        console.error("Fetch RFI error:", err);
        setError("Failed to load RFI");
      } finally {
        setLoading(false);
      }
    };
    fetchRfi();
  }, [orgId, projectId, rfiId]);

  async function handleUpdate() {
    if (!rfi) return;
    try {
      const rfiRef = doc(
        firestore,
        "organizations",
        orgId,
        "projects",
        projectId,
        "rfis",
        rfiId
      );

      await updateDoc(rfiRef, {
        status,
        importance,
        officialResponse,
        updatedAt: serverTimestamp(),
      });
      alert("RFI updated!");
    } catch (err: any) {
      console.error("Update RFI error:", err);
      setError("Failed to update RFI");
    }
  }

  // Example: if status == 'draft' and user can send to RFI manager
  async function handleSendToManager() {
    if (!rfi) return;
    try {
      const rfiRef = doc(
        firestore,
        "organizations",
        orgId,
        "projects",
        projectId,
        "rfis",
        rfiId
      );
      // sending draft -> open
      await updateDoc(rfiRef, {
        status: "open",
        updatedAt: serverTimestamp(),
      });
      alert("RFI moved from draft to open!");
      setStatus("open");
    } catch (err: any) {
      console.error("Send to manager error:", err);
      setError("Failed to send RFI to manager");
    }
  }

  // Example: triggers a change order
  async function handleTriggerChangeOrder() {
    if (!rfi) return;
    try {
      const rfiRef = doc(
        firestore,
        "organizations",
        orgId,
        "projects",
        projectId,
        "rfis",
        rfiId
      );
      await updateDoc(rfiRef, {
        triggersChangeOrder: true,
        updatedAt: serverTimestamp(),
      });
      alert("RFI triggered a Change Order!");
    } catch (err: any) {
      console.error("Trigger CO error:", err);
      setError("Failed to trigger change order");
    }
  }

  if (loading) {
    return <div className="p-4">Loading RFI...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!rfi) {
    return <div className="p-4">No RFI found.</div>;
  }

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/rfis`}
        className="text-blue-600 underline"
      >
        &larr; Back to RFIs
      </Link>

      <h1 className="text-xl font-bold">{rfi.subject}</h1>
      <p className="text-gray-600">{rfi.question}</p>

      <div>
        <label className="block font-medium">Assigned To:</label>
        <p>{rfi.assignedTo || "N/A"}</p>
      </div>

      <div>
        <label className="block font-medium">Distribution List:</label>
        {rfi.distributionList && rfi.distributionList.length > 0 ? (
          <ul className="list-disc ml-5">
            {rfi.distributionList.map((d: string, i: number) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        ) : (
          <p>None</p>
        )}
      </div>

      <div>
        <label className="block font-medium">Due Date:</label>
        <p>{rfi.dueDate ? new Date(rfi.dueDate).toLocaleDateString() : "N/A"}</p>
      </div>

      <div>
        <label className="block font-medium">Attachments:</label>
        {rfi.attachments && rfi.attachments.length > 0 ? (
          <ul className="list-disc ml-5">
            {rfi.attachments.map((url: string, i: number) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600"
                >
                  {url.split("/").pop()}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No attachments</p>
        )}
      </div>

      <div>
        <label className="block font-medium">Status</label>
        <select
          className="border p-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div>
        <label className="block font-medium">Importance</label>
        <select
          className="border p-2"
          value={importance}
          onChange={(e) => setImportance(e.target.value)}
        >
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div>
        <label className="block font-medium">Official Response</label>
        <textarea
          className="border p-2 w-full"
          value={officialResponse}
          onChange={(e) => setOfficialResponse(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex gap-4 mt-4">
        {rfi.status === "draft" && (
          <button
            onClick={handleSendToManager}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Send to RFI Manager
          </button>
        )}
        <button
          onClick={handleUpdate}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Update RFI
        </button>
        <button
          onClick={handleTriggerChangeOrder}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Trigger Change Order
        </button>
      </div>
    </main>
  );
}
