// src/app/dashboard/organizations/[orgId]/projects/[projectId]/rfis/report/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";

export default function RfiReportPage() {
  const { orgId, projectId } = useParams() as { orgId: string; projectId: string };
  const [rfis, setRfis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const ref = collection(
        firestore,
        "organizations",
        orgId,
        "projects",
        projectId,
        "rfis"
      );
      // example: order by 'importance' descending
      const q = query(ref, orderBy("importance", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRfis(data);
      setLoading(false);
    }
    if (orgId && projectId) fetchData();
  }, [orgId, projectId]);

  if (loading) return <div className="p-4">Loading RFI report...</div>;

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold mb-4">RFI Report</h1>
      <table className="w-full border">
        <thead className="border-b">
          <tr>
            <th className="p-2 text-left">Subject</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Importance</th>
            <th className="p-2 text-left">AssignedTo</th>
            <th className="p-2 text-left">DueDate</th>
          </tr>
        </thead>
        <tbody>
          {rfis.map((rfi) => (
            <tr key={rfi.id} className="border-b">
              <td className="p-2">{rfi.subject}</td>
              <td className="p-2">{rfi.status}</td>
              <td className="p-2">{rfi.importance}</td>
              <td className="p-2">{rfi.assignedTo}</td>
              <td className="p-2">
                {rfi.dueDate ? new Date(rfi.dueDate).toLocaleDateString() : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
