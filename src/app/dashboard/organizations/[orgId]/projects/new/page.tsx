// src/app/dashboard/organizations/[orgId]/projects/new/page.tsx
"use client";

import { useState } from "react";
import { firestore } from "@/lib/firebaseConfig";
import { doc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";

// Shared UI Components
import { PageContainer } from "@/components/ui/PageContainer";
import { GrayButton } from "@/components/ui/GrayButton";

// Import the global loading bar hook.
import { useLoadingBar } from "@/context/LoadingBarContext";

export default function NewProjectPage() {
  const router = useRouter();
  const { orgId } = useParams() as { orgId: string };
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [hasSubprojects, setHasSubprojects] = useState(false);
  const [subprojectNames, setSubprojectNames] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Get the global loading bar setter.
  const { setIsLoading } = useLoadingBar();

  // Adds an empty field for a new sub-project.
  const handleAddSubprojectField = () => {
    setSubprojectNames([...subprojectNames, ""]);
  };

  // Updates the sub-project name at the specified index.
  const handleSubprojectNameChange = (index: number, value: string) => {
    const updated = [...subprojectNames];
    updated[index] = value;
    setSubprojectNames(updated);
  };

  // Handles the form submission to create the new project.
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Activate the global loading bar.
    setIsLoading(true);

    try {
      // Create a slug for the main project based on the name.
      const mainProjectId = name.trim().toLowerCase().replace(/\s+/g, "-");
      if (!mainProjectId) {
        throw new Error("Please provide a valid project name.");
      }

      // Reference to the main project document.
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
        // Create multiple sub-projects in a sub-collection "subprojects".
        for (const spName of subprojectNames) {
          const spSlug =
            spName.trim().toLowerCase().replace(/\s+/g, "-") ||
            Math.random().toString(36).slice(2);
          const spRef = doc(collection(mainProjectRef, "subprojects"), spSlug);
          await setDoc(spRef, {
            name: spName.trim() || "Untitled Sub-Project",
            status: "active",
            createdAt: serverTimestamp(),
          });
        }
      } else {
        // Auto-create a single sub-project with the same name.
        const spRef = doc(collection(mainProjectRef, "subprojects"), mainProjectId);
        await setDoc(spRef, {
          name: name.trim(),
          status: "active",
          createdAt: serverTimestamp(),
        });
      }

      // Navigate to the newly created project's page.
      router.push(`/dashboard/organizations/${orgId}/projects`);
    } catch (err: any) {
      console.error("Create project error:", err);
      setError(err.message || "Failed to create project");
      // Deactivate the loading bar if there was an error.
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      {/* Back button with loading bar trigger */}
      <GrayButton
        onClick={() => {
          setIsLoading(true); // Trigger loading bar before navigation
          router.push(`/dashboard/organizations/${orgId}/projects`);
        }}
      >
        &larr; Back to Projects
      </GrayButton>

      <h1 className="text-2xl font-bold mt-4">Create Project (Umbrella)</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
        <div>
          <label className="block mb-1">Main Project Name</label>
          <input
            className="border text-black p-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example: Chinatown Conversion"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Status</label>
          <select
            className="border text-black p-2 w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Checkbox to determine if the project has multiple sub-projects */}
        <div>
          <label className="block mb-1 font-medium">
            Does this project have multiple sub-projects?
          </label>
          <input
            type="checkbox"
            checked={hasSubprojects}
            onChange={(e) => setHasSubprojects(e.target.checked)}
            className="mr-2"
          />
          <span>Yes, I'd like to create sub-projects.</span>
        </div>

        {hasSubprojects && (
          <div className="border p-3 rounded">
            <p className="font-medium mb-2">Sub-Project Names</p>
            {subprojectNames.map((sp, idx) => (
              <div key={idx} className="mb-2">
                <input
                  className="border text-black p-2 w-full"
                  placeholder={`Sub-Project ${idx + 1}`}
                  value={sp}
                  onChange={(e) => handleSubprojectNameChange(idx, e.target.value)}
                />
              </div>
            ))}
            <GrayButton type="button" onClick={handleAddSubprojectField}>
              + Add Another Sub-Project
            </GrayButton>
          </div>
        )}

        {/* Create button with loading bar trigger on form submission */}
        <GrayButton type="submit">Create</GrayButton>
      </form>
    </PageContainer>
  );
}
