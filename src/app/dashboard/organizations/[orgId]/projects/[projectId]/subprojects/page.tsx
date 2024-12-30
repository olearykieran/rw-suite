// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

export default function SubProjectsPage() {
  const { orgId, projectId } = useParams() as { orgId: string; projectId: string };
  const [subProjects, setSubProjects] = useState<any[]>([]);
  const [mainProjectName, setMainProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
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
    fetchData();
  }, [orgId, projectId]);

  if (loading) return <div className="p-6 text-gray-700">Loading projects...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <main className="p-6 space-y-6">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}`}
        className="text-blue-600 underline"
      >
        &larr; Back to {mainProjectName}
      </Link>

      <h1 className="text-2xl font-bold text-gray-800">
        Projects within {mainProjectName}
      </h1>

      {subProjects.length === 0 && <p className="text-gray-700">No projects found.</p>}

      <ul className="space-y-4">
        {subProjects.map((sp) => (
          <li
            key={sp.id}
            className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-semibold text-lg text-gray-900">{sp.name}</h3>
            <p className="text-sm text-gray-600">Status: {sp.status || "active"}</p>
            <Link
              href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${sp.id}`}
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              Open Project
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
