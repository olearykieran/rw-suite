// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/punch-lists/[punchListId]/page.tsx

"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import {
  fetchPunchList,
  updatePunchList,
  uploadPunchListAttachment,
  PunchListDoc,
  PunchItem,
} from "@/lib/services/PunchListService";

export default function PunchListDetailPage() {
  const { orgId, projectId, subProjectId, punchListId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    punchListId: string;
  };

  const [punchList, setPunchList] = useState<PunchListDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Punch list fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");

  // For punch items
  const [items, setItems] = useState<PunchItem[]>([]);

  // Attachments
  const [files, setFiles] = useState<FileList | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (!orgId || !projectId || !subProjectId || !punchListId) return;
        const pl = await fetchPunchList(orgId, projectId, subProjectId, punchListId);

        setPunchList(pl);
        setTitle(pl.title);
        setDescription(pl.description || "");
        setStatus(pl.status || "open");
        setItems(pl.items || []);
      } catch (err: any) {
        console.error("Fetch PunchList error:", err);
        setError("Failed to load punch list.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, punchListId]);

  // 1) Update punch list doc
  async function handleUpdatePunchList(e: FormEvent) {
    e.preventDefault();
    if (!punchList) return;
    try {
      await updatePunchList(orgId, projectId, subProjectId, punchList.id, {
        title,
        description,
        status,
        items, // updated array from local state
      });
      alert("Punch list updated!");
    } catch (err: any) {
      console.error("Update punch list error:", err);
      setError("Failed to update punch list.");
    }
  }

  // 2) Manage punch items locally
  function handleAddItem() {
    const newItem: PunchItem = {
      id: "item-" + Date.now(),
      title: "New Item",
      status: "open",
    };
    setItems((prev) => [...prev, newItem]);
  }

  function handleItemChange(id: string, field: keyof PunchItem, value: any) {
    setItems((prev) =>
      prev.map((itm) => (itm.id === id ? { ...itm, [field]: value } : itm))
    );
  }

  function handleDeleteItem(id: string) {
    setItems((prev) => prev.filter((itm) => itm.id !== id));
  }

  // 3) Upload attachments
  async function handleUploadAttachments() {
    if (!punchList || !files || files.length === 0) return;
    try {
      const existingAtt = punchList.attachments ? [...punchList.attachments] : [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadPunchListAttachment(
          orgId,
          projectId,
          subProjectId,
          punchList.id,
          file
        );
        existingAtt.push(url);
      }
      await updatePunchList(orgId, projectId, subProjectId, punchList.id, {
        attachments: existingAtt,
      });
      setPunchList({ ...punchList, attachments: existingAtt });
      setFiles(null);
      alert("Attachments uploaded!");
    } catch (err: any) {
      console.error("Upload attachments error:", err);
      setError("Failed to upload attachments.");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm">Loading Punch List...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!punchList) {
    return <div className="p-6">No punch list found.</div>;
  }

  return (
    <PageContainer>
      {/* Back link */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/punch-lists`}
        className="
          text-sm font-medium text-blue-600 underline
          hover:text-blue-700 dark:text-blue-400
          dark:hover:text-blue-300 transition-colors
        "
      >
        &larr; Back to Punch Lists
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{punchList.title}</h1>
      </div>

      {/* Main Details Card */}
      <Card>
        <form onSubmit={handleUpdatePunchList} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="inProgress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Items Section */}
          <Card>
            <h2 className="text-lg font-semibold mb-2">Punch Items</h2>
            <GrayButton onClick={handleAddItem} className="mb-3">
              Add New Item
            </GrayButton>

            {items.length === 0 && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                No items yet.
              </p>
            )}

            {items.map((item) => (
              <Card key={item.id} className="space-y-2 mb-2">
                <div className="flex gap-2 items-center">
                  <label className="block text-sm w-16">Title</label>
                  <input
                    className="border p-1 flex-1 rounded"
                    value={item.title}
                    onChange={(e) => handleItemChange(item.id, "title", e.target.value)}
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <label className="block text-sm w-16">Location</label>
                  <input
                    className="border p-1 flex-1 rounded"
                    value={item.location || ""}
                    onChange={(e) =>
                      handleItemChange(item.id, "location", e.target.value)
                    }
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <label className="block text-sm w-16">Assigned</label>
                  <input
                    className="border p-1 flex-1 rounded"
                    value={item.assignedTo || ""}
                    onChange={(e) =>
                      handleItemChange(item.id, "assignedTo", e.target.value)
                    }
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <label className="block text-sm w-16">Status</label>
                  <select
                    className="border p-1 rounded"
                    value={item.status || "open"}
                    onChange={(e) => handleItemChange(item.id, "status", e.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1">Notes</label>
                  <textarea
                    className="border p-1 w-full rounded"
                    rows={2}
                    value={item.notes || ""}
                    onChange={(e) => handleItemChange(item.id, "notes", e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <GrayButton
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-xs bg-red-600 hover:bg-red-700"
                    type="button"
                  >
                    Remove
                  </GrayButton>
                </div>
              </Card>
            ))}
          </Card>

          <GrayButton type="submit">Update Punch List</GrayButton>
        </form>
      </Card>

      {/* Attachments Card */}
      <Card>
        <h2 className="text-lg font-semibold">Attachments</h2>
        {punchList.attachments && punchList.attachments.length > 0 ? (
          <ul className="list-disc ml-5 text-sm mt-2">
            {punchList.attachments.map((url, i) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    text-blue-600 underline
                    hover:text-blue-700
                    dark:text-blue-400 dark:hover:text-blue-300
                  "
                >
                  {url.split("/").pop()}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm mt-1">No attachments yet.</p>
        )}

        {/* Upload new attachments */}
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium">Upload Attachments</label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="
              file:mr-2 file:py-2 file:px-3
              file:border-0 file:rounded
              file:bg-gray-300 file:text-black
              hover:file:bg-gray-400
              dark:file:bg-gray-700 dark:file:text-white
              dark:hover:file:bg-gray-600
            "
          />
          <GrayButton onClick={handleUploadAttachments}>Upload</GrayButton>
        </div>
      </Card>
    </PageContainer>
  );
}
