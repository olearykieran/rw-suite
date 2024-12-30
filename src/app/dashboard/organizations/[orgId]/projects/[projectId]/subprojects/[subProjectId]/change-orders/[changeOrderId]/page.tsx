// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/change-orders/[changeOrderId]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  fetchChangeOrder,
  updateChangeOrder,
  uploadChangeOrderAttachment,
  ChangeOrderDoc,
} from "@/lib/services/ChangeOrderService";

export default function ChangeOrderDetailPage() {
  const { orgId, projectId, subProjectId, changeOrderId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    changeOrderId: string;
  };

  const [changeOrder, setChangeOrder] = useState<ChangeOrderDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Local states for editing
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("draft");
  const [costImpact, setCostImpact] = useState("");
  const [scheduleImpact, setScheduleImpact] = useState("");

  // Attachments
  const [files, setFiles] = useState<FileList | null>(null);

  useEffect(() => {
    async function load() {
      try {
        if (!orgId || !projectId || !subProjectId || !changeOrderId) return;
        setLoading(true);
        const co = await fetchChangeOrder(orgId, projectId, subProjectId, changeOrderId);
        setChangeOrder(co);

        // Populate local states
        setTitle(co.title || "");
        setDescription(co.description || "");
        setReason(co.reason || "");
        setStatus(co.status || "draft");
        setCostImpact(
          co.costImpact !== undefined && co.costImpact !== null
            ? String(co.costImpact)
            : ""
        );
        setScheduleImpact(
          co.scheduleImpact !== undefined && co.scheduleImpact !== null
            ? String(co.scheduleImpact)
            : ""
        );
      } catch (err: any) {
        console.error("Fetch change order error:", err);
        setError("Failed to load change order.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, changeOrderId]);

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!changeOrder) return;
    setError("");

    try {
      await updateChangeOrder(orgId, projectId, subProjectId, changeOrder.id, {
        title,
        description,
        reason,
        status,
        costImpact: costImpact ? parseFloat(costImpact) : 0,
        scheduleImpact: scheduleImpact ? parseFloat(scheduleImpact) : 0,
      });
      alert("Change order updated!");
    } catch (err: any) {
      console.error("Update change order error:", err);
      setError("Failed to update change order.");
    }
  }

  async function handleUpload() {
    if (!changeOrder || !files || files.length === 0) return;
    try {
      const updatedAtt = changeOrder.attachments ? [...changeOrder.attachments] : [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadChangeOrderAttachment(
          orgId,
          projectId,
          subProjectId,
          changeOrder.id,
          file
        );
        updatedAtt.push(url);
      }
      await updateChangeOrder(orgId, projectId, subProjectId, changeOrder.id, {
        attachments: updatedAtt,
      });
      setChangeOrder({ ...changeOrder, attachments: updatedAtt });
      setFiles(null);
      alert("Attachments uploaded!");
    } catch (err: any) {
      console.error("Upload attachments error:", err);
      setError("Failed to upload attachments.");
    }
  }

  if (loading) return <div className="p-4">Loading change order...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!changeOrder) return <div className="p-4">No change order found.</div>;

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/change-orders`}
        className="text-blue-600 underline"
      >
        &larr; Back to Change Orders
      </Link>

      <h1 className="text-2xl font-bold">Change Order: {changeOrder.title}</h1>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Title</label>
          <input
            className="border p-2 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea
            className="border p-2 w-full"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Reason</label>
          <input
            className="border p-2 w-full"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Status</label>
          <select
            className="border p-2 w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Cost Impact (USD)</label>
          <input
            type="number"
            className="border p-2 w-full"
            value={costImpact}
            onChange={(e) => setCostImpact(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Schedule Impact (days)</label>
          <input
            type="number"
            className="border p-2 w-full"
            value={scheduleImpact}
            onChange={(e) => setScheduleImpact(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Update Change Order
        </button>
      </form>

      {/* Attachments */}
      <div className="border-t pt-4 space-y-4">
        <h2 className="text-xl font-semibold">Attachments</h2>
        {changeOrder.attachments && changeOrder.attachments.length > 0 ? (
          <ul className="list-disc ml-5">
            {changeOrder.attachments.map((url, i) => (
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
          <p>No attachments yet.</p>
        )}

        <div>
          <label className="block font-medium mb-1">Upload Attachments</label>
          <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white px-3 py-1 rounded mt-2"
          >
            Upload
          </button>
        </div>
      </div>
    </main>
  );
}
