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

  if (loading) return <div className="p-6 text-gray-700">Loading organizations...</div>;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Organizations</h1>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orgs.map((org) => (
          <li
            key={org.id}
            className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <p className="font-semibold text-lg text-gray-900">{org.name || org.id}</p>
            <Link
              href={`/dashboard/organizations/${org.id}`}
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              View Organization
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
