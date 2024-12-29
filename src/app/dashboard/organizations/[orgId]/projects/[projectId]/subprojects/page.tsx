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
          setError("Main project not found");
          setLoading(false);
          return;
        }
        setMainProjectName(mainSnap.data().name || projectId);

        // fetch subprojects
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

  if (loading) return <div className="p-4">Loading sub-projects...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <main className="p-4">
      {/* Back to Main Project */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}`}
        className="text-blue-600 underline"
      >
        &larr; Back to {mainProjectName}
      </Link>

      <h1 className="text-xl font-bold mt-4">Sub-Projects of {mainProjectName}</h1>

      {subProjects.length === 0 && <p>No sub-projects found.</p>}

      <ul className="mt-4 space-y-3">
        {subProjects.map((sp) => (
          <li key={sp.id} className="border p-3 rounded">
            <h3 className="font-semibold">{sp.name}</h3>
            <p>Status: {sp.status || "active"}</p>
            <Link
              href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${sp.id}`}
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              Open Sub-Project
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
