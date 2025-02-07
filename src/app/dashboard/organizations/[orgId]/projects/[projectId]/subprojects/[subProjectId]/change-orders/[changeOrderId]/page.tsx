// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/change-orders/[changeOrderId]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchChangeOrder,
  updateChangeOrder,
  uploadChangeOrderAttachment,
  ChangeOrderDoc,
} from "@/lib/services/ChangeOrderService";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { useLoadingBar } from "@/context/LoadingBarContext";

export default function ChangeOrderDetailPage() {
  const { orgId, projectId, subProjectId, changeOrderId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    changeOrderId: string;
  };
  const router = useRouter();
  const { setIsLoading } = useLoadingBar();

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

  // For fade-in
  const [showContent, setShowContent] = useState(false);

  // 1. Load the change order and populate local state
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (!orgId || !projectId || !subProjectId || !changeOrderId) return;
        const co = await fetchChangeOrder(orgId, projectId, subProjectId, changeOrderId);
        setChangeOrder(co);

        // Populate local state from fetched data
        setTitle(co.title || "");
        setDescription(co.description || "");
        setReason(co.reason || "");
        setStatus(co.status || "draft");
        setCostImpact(co.costImpact != null ? String(co.costImpact) : "");
        setScheduleImpact(co.scheduleImpact != null ? String(co.scheduleImpact) : "");
      } catch (err: any) {
        console.error("Fetch change order error:", err);
        setError("Failed to load change order.");
      } finally {
        setLoading(false);
        // Trigger fade-in
        setTimeout(() => setShowContent(true), 100);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, changeOrderId]);

  // 2. Update the change order document
  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!changeOrder) return;
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

  // 3. Upload attachments and update the change order document
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

  if (loading) {
    return <div className="p-6">Loading change order...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!changeOrder) {
    return <div className="p-6">No change order found.</div>;
  }

  return (
    <PageContainer>
      {/* === Section #1: Back Button & Title === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[0ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <GrayButton
          onClick={() => {
            setIsLoading(true);
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/change-orders`
            );
          }}
        >
          &larr; Back to Change Orders
        </GrayButton>

        <div className="space-y-1 mt-2">
          <h1 className="text-2xl font-bold">Change Order: {changeOrder.title}</h1>
          {/* Additional info such as cost, schedule, or status can be displayed here if desired */}
        </div>
      </div>

      {/* === Section #2: Main Details Form === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[100ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Card>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Title</label>
              <input
                className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Description</label>
              <textarea
                className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Reason</label>
              <input
                className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Status */}
              <div>
                <label className="block font-medium mb-1">Status</label>
                <select
                  className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Cost Impact */}
              <div>
                <label className="block font-medium mb-1">Cost Impact (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                  value={costImpact}
                  onChange={(e) => setCostImpact(e.target.value)}
                />
              </div>
            </div>

            {/* Schedule Impact */}
            <div>
              <label className="block font-medium mb-1">Schedule Impact (days)</label>
              <input
                type="number"
                className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                value={scheduleImpact}
                onChange={(e) => setScheduleImpact(e.target.value)}
              />
            </div>

            <div>
              <GrayButton type="submit">Update Change Order</GrayButton>
            </div>
          </form>
        </Card>
      </div>

      {/* === Section #3: Attachments === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[200ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Card>
          <h2 className="text-lg font-semibold">Attachments</h2>

          {changeOrder.attachments && changeOrder.attachments.length > 0 ? (
            <ul className="list-disc ml-5 mt-2">
              {changeOrder.attachments.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {url.split("/").pop()}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1">No attachments yet.</p>
          )}

          {/* Upload new files */}
          <div className="mt-4 space-y-2">
            <label className="block font-medium">Upload Files</label>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="file:mr-2 file:py-2 file:px-3 file:border-0 file:rounded file:bg-gray-300 file:text-black hover:file:bg-gray-400 dark:file:bg-gray-700 dark:file:text-white dark:hover:file:bg-gray-600 transition-colors"
            />
            <GrayButton onClick={handleUpload}>Upload</GrayButton>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
