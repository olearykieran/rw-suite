// src/app/dashboard/organizations/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrgs = async () => {
      const ref = collection(firestore, "organizations");
      const snap = await getDocs(ref);
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOrgs(data);
      setLoading(false);
    };
    fetchOrgs();
  }, []);

  if (loading) return <div className="p-4">Loading organizations...</div>;

  return (
    <main className="p-4">
      <h1 className="text-xl mb-4">Organizations</h1>
      <ul className="space-y-2">
        {orgs.map((org) => (
          <li key={org.id} className="border p-2 rounded">
            <p className="font-semibold">{org.name || org.id}</p>
            <Link
              href={`/dashboard/organizations/${org.id}`}
              className="text-blue-600 hover:underline text-sm mt-1 inline-block"
            >
              View Organization
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
