// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/punch-lists/[punchListId]/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

  // For PunchList fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");

  // For attachments
  const [files, setFiles] = useState<FileList | null>(null);

  // For editing items inline
  const [items, setItems] = useState<PunchItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
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
    if (orgId && projectId && subProjectId && punchListId) load();
  }, [orgId, projectId, subProjectId, punchListId]);

  async function handleUpdatePunchList(e: FormEvent) {
    e.preventDefault();
    if (!punchList) return;
    try {
      await updatePunchList(orgId, projectId, subProjectId, punchList.id, {
        title,
        description,
        status,
        items, // replace with the updated items array
      });
      alert("Punch list updated!");
    } catch (err: any) {
      console.error("Update punch list error:", err);
      setError("Failed to update punch list.");
    }
  }

  // Add new item
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

  // Upload attachments
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

  if (loading) return <div className="p-4">Loading Punch List...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!punchList) return <div className="p-4">No punch list found.</div>;

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/punch-lists`}
        className="text-blue-600 underline"
      >
        &larr; Back to Punch Lists
      </Link>

      <h1 className="text-2xl font-bold">{punchList.title}</h1>

      <form onSubmit={handleUpdatePunchList} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Title</label>
          <input
            className="border p-2 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
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
          <label className="block font-medium mb-1">Status</label>
          <select
            className="border p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="inProgress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Items */}
        <div className="border p-3 rounded">
          <h2 className="text-lg font-semibold mb-2">Punch Items</h2>
          <button
            type="button"
            onClick={handleAddItem}
            className="bg-blue-600 text-white px-3 py-1 rounded mb-3"
          >
            Add New Item
          </button>

          {items.length === 0 && <p className="text-sm text-gray-600">No items yet.</p>}

          {items.map((item) => (
            <div key={item.id} className="border p-2 rounded mb-2 space-y-2">
              <div className="flex gap-2 items-center">
                <label className="block text-sm w-16">Title</label>
                <input
                  className="border p-1 flex-1"
                  value={item.title}
                  onChange={(e) => handleItemChange(item.id, "title", e.target.value)}
                />
              </div>

              <div className="flex gap-2 items-center">
                <label className="block text-sm w-16">Location</label>
                <input
                  className="border p-1 flex-1"
                  value={item.location || ""}
                  onChange={(e) => handleItemChange(item.id, "location", e.target.value)}
                />
              </div>

              <div className="flex gap-2 items-center">
                <label className="block text-sm w-16">Assigned</label>
                <input
                  className="border p-1 flex-1"
                  value={item.assignedTo || ""}
                  onChange={(e) =>
                    handleItemChange(item.id, "assignedTo", e.target.value)
                  }
                />
              </div>

              <div className="flex gap-2 items-center">
                <label className="block text-sm w-16">Status</label>
                <select
                  className="border p-1"
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
                  className="border p-1 w-full"
                  rows={2}
                  value={item.notes || ""}
                  onChange={(e) => handleItemChange(item.id, "notes", e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-red-600 underline text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800">
          Update Punch List
        </button>
      </form>

      {/* Attachments */}
      <div className="border-t pt-4 space-y-3">
        <h2 className="text-xl font-semibold">Attachments</h2>
        {punchList.attachments && punchList.attachments.length > 0 ? (
          <ul className="list-disc ml-5">
            {punchList.attachments.map((url, i) => (
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
          <p className="text-sm text-gray-700">No attachments yet.</p>
        )}

        <div>
          <label className="block font-medium mb-1">Upload Attachments</label>
          <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
          <button
            onClick={handleUploadAttachments}
            className="bg-blue-600 text-white px-3 py-1 rounded mt-2"
          >
            Upload
          </button>
        </div>
      </div>
    </main>
  );
}
