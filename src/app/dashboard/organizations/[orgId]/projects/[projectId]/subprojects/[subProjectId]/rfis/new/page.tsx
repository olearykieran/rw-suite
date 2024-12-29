// src/app/dashboard/organizations/[orgId]/projects/[projectId]/rfis/new/page.tsx

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { firestore, auth } from "@/lib/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function NewRfiPage() {
  const router = useRouter();
  const { orgId, projectId } = useParams() as { orgId: string; projectId: string };
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState("draft"); // default "draft"
  const [importance, setImportance] = useState("normal");
  const [distributionList, setDistributionList] = useState(""); // comma-separated
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateRfi(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const rfiId =
        subject.toLowerCase().replace(/\s+/g, "-") || Math.random().toString(36).slice(2);

      // Upload attachments
      const attachmentUrls: string[] = [];
      if (files && files.length > 0) {
        const storage = getStorage();
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const storageRef = ref(
            storage,
            `rfis/${orgId}/${projectId}/${rfiId}/${file.name}`
          );
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);
          attachmentUrls.push(downloadURL);
        }
      }

      // parse distributionList by commas
      const distArray = distributionList
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      // create RFI doc
      const rfiRef = doc(
        firestore,
        "organizations",
        orgId,
        "projects",
        projectId,
        "rfis",
        rfiId
      );
      await setDoc(rfiRef, {
        subject,
        question,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : null,
        status, // "draft" if Standard
        importance,
        distributionList: distArray,
        attachments: attachmentUrls,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
        officialResponse: null,
        responseDate: null,
        triggersChangeOrder: false,
      });

      router.push(`/dashboard/organizations/${orgId}/projects/${projectId}/rfis`);
    } catch (err: any) {
      console.error("Create RFI error:", err);
      setError(err.message || "Failed to create RFI");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold mb-4">Create RFI</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleCreateRfi} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Subject</label>
          <input
            className="border p-2 w-full"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="RFI Subject"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Question / Description</label>
          <textarea
            className="border p-2 w-full"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Details about the RFI..."
            rows={3}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Assigned To (userId/vendorId)</label>
          <input
            className="border p-2 w-full"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="some-user-id"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">
            Distribution List (comma-separated)
          </label>
          <input
            className="border p-2 w-full"
            value={distributionList}
            onChange={(e) => setDistributionList(e.target.value)}
            placeholder="userId1, userId2, vendorId1"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Due Date</label>
          <input
            type="date"
            className="border p-2 w-full"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">
            Attachments (PDF, images, etc.)
          </label>
          <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
        </div>

        {/* RFI Status: "draft" if standard user, "open" if admin wants to skip draft */}
        <div>
          <label className="block mb-1 font-medium">Status</label>
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
          <label className="block mb-1 font-medium">Importance</label>
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

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          {loading ? "Creating..." : "Create RFI"}
        </button>
      </form>
    </main>
  );
}
