// src/app/dashboard/organizations/[orgId]/projects/new/page.tsx
"use client";

import { useState } from "react";
import { firestore } from "@/lib/firebaseConfig";
import { doc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const { orgId } = useParams() as { orgId: string };
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [hasSubprojects, setHasSubprojects] = useState(false);
  const [subprojectNames, setSubprojectNames] = useState<string[]>([]);

  const [error, setError] = useState("");

  const handleAddSubprojectField = () => {
    setSubprojectNames([...subprojectNames, ""]);
  };

  const handleSubprojectNameChange = (index: number, value: string) => {
    const updated = [...subprojectNames];
    updated[index] = value;
    setSubprojectNames(updated);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // main project
      const mainProjectId = name.trim().toLowerCase().replace(/\s+/g, "-");
      if (!mainProjectId) {
        throw new Error("Please provide a valid project name.");
      }

      const mainProjectRef = doc(
        firestore,
        "organizations",
        orgId,
        "projects",
        mainProjectId
      );
      await setDoc(mainProjectRef, {
        name: name.trim(),
        status,
        hasSubprojects,
        createdAt: serverTimestamp(),
      });

      if (hasSubprojects) {
        // create multiple sub-projects
        // Sub-projects stored in a sub-collection "subprojects"
        // OR stored as separate docs in the same "projects" collection referencing the mainProjectId
        // We'll do a sub-collection approach:
        for (const spName of subprojectNames) {
          const spSlug =
            spName.trim().toLowerCase().replace(/\s+/g, "-") ||
            Math.random().toString(36).slice(2);
          const spRef = doc(collection(mainProjectRef, "subprojects"), spSlug);
          await setDoc(spRef, {
            name: spName.trim() || "Untitled Sub-Project",
            status: "active",
            createdAt: serverTimestamp(),
            // Possibly store mainProjectId again if needed
          });
        }
      } else {
        // auto-create a single sub-project with the same name
        const spRef = doc(collection(mainProjectRef, "subprojects"), mainProjectId); // same slug
        await setDoc(spRef, {
          name: name.trim(),
          status: "active",
          createdAt: serverTimestamp(),
        });
      }

      router.push(`/dashboard/organizations/${orgId}/projects/${mainProjectId}`);
    } catch (err: any) {
      console.error("Create project error:", err);
      setError(err.message || "Failed to create project");
    }
  };

  return (
    <main className="p-4">
      {/* Back button */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects`}
        className="text-blue-600 underline mb-4 inline-block"
      >
        &larr; Back to Projects
      </Link>

      <h1 className="text-xl font-semibold mb-4">Create Project (Umbrella)</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleCreateProject} className="space-y-4">
        <div>
          <label className="block mb-1">Main Project Name</label>
          <input
            className="border p-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example: Chinatown Conversion"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Status</label>
          <select
            className="border p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* new checkbox for hasSubprojects */}
        <div>
          <label className="block mb-1 font-medium">
            Does this project have multiple sub-projects?
          </label>
          <input
            type="checkbox"
            checked={hasSubprojects}
            onChange={(e) => setHasSubprojects(e.target.checked)}
          />{" "}
          <span className="ml-2">Yes, I'd like to create sub-projects.</span>
        </div>

        {hasSubprojects && (
          <div className="border p-3 rounded">
            <p className="font-medium mb-2">Sub-Project Names</p>
            {subprojectNames.map((sp, idx) => (
              <div key={idx} className="mb-2">
                <input
                  className="border p-2 w-full"
                  placeholder={`Sub-Project ${idx + 1}`}
                  value={sp}
                  onChange={(e) => handleSubprojectNameChange(idx, e.target.value)}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddSubprojectField}
              className=" px-3 py-1 rounded  hover:"
            >
              + Add Another Sub-Project
            </button>
          </div>
        )}

        <button type="submit" className="bg-black text-white px-4 py-2">
          Create
        </button>
      </form>
    </main>
  );
}
