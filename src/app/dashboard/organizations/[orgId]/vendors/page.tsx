"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import { useParams } from "next/navigation";

export default function VendorsPage() {
  const { orgId } = useParams() as { orgId: string };
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorName, setVendorName] = useState("");

  useEffect(() => {
    const fetchVendors = async () => {
      const ref = collection(firestore, "organizations", orgId, "vendors");
      const snap = await getDocs(ref);
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setVendors(data);
    };
    fetchVendors();
  }, [orgId]);

  const addVendor = async () => {
    if (!vendorName.trim()) return;
    const ref = collection(firestore, "organizations", orgId, "vendors");
    await addDoc(ref, { name: vendorName });
    setVendorName("");
    // re-fetch or push to local state
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold">Vendors</h1>
      <div className="my-4 flex gap-2">
        <input
          className="border p-2"
          placeholder="Vendor Name"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
        />
        <button className="bg-black text-white px-4 py-2" onClick={addVendor}>
          Add Vendor
        </button>
      </div>
      <ul>
        {vendors.map((v) => (
          <li key={v.id} className="border p-2 mb-2">
            {v.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
