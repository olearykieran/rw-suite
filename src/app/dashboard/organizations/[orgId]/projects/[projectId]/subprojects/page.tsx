// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

export default function SubProjectsPage() {
  const { orgId, projectId } = useParams() as { orgId: string; projectId: string };
  const [subProjects, setSubProjects] = useState<any[]>([]);
  const [mainProjectName, setMainProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        // 1) Load the main project doc for the name
        const mainProjectRef = doc(
          firestore,
          "organizations",
          orgId,
          "projects",
          projectId
        );
        const mainSnap = await getDoc(mainProjectRef);
        if (!mainSnap.exists()) {
          setError("Main project not found.");
          setLoading(false);
          return;
        }
        setMainProjectName(mainSnap.data().name || projectId);

        // 2) Load sub-projects
        const subprojectsRef = collection(mainProjectRef, "subprojects");
        const snap = await getDocs(subprojectsRef);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSubProjects(data);
      } catch (err: any) {
        console.error("Fetch subprojects error:", err);
        setError("Failed to load sub-projects.");
      } finally {
        setLoading(false);
      }
    }
    if (orgId && projectId) {
      fetchData();
    }
  }, [orgId, projectId]);

  if (loading) {
    return <div className="p-6 text-sm">Loading projects...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      {/* Back link to main project */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}`}
        className="
          text-sm font-medium text-blue-600 underline
          hover:text-blue-700 dark:text-blue-400
          dark:hover:text-blue-300 transition-colors
        "
      >
        &larr; Back to {mainProjectName}
      </Link>

      <h1 className="text-2xl font-bold mt-4">Sub-Projects under {mainProjectName}</h1>

      {subProjects.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
          No sub-projects found.
        </p>
      ) : (
        <div className="space-y-3 mt-4">
          {subProjects.map((sp) => (
            <Card key={sp.id}>
              <h3 className="font-semibold text-lg">{sp.name}</h3>
              <p className="text-sm">Status: {sp.status || "active"}</p>
              <Link
                href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${sp.id}`}
                className="
                  text-blue-600 hover:underline text-sm mt-2 inline-block
                  hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300
                "
              >
                Open Project
              </Link>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
