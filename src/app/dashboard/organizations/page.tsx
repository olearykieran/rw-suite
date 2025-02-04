// src/app/dashboard/organizations/page.tsx

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { AnimatedList } from "@/components/ui/AnimatedList";

interface Organization {
  id: string;
  name?: string;
  status?: string;
  [key: string]: any;
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const ref = collection(firestore, "organizations");
        const snap = await getDocs(ref);
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Organization[];
        setOrgs(data);
      } catch (err: any) {
        console.error("Fetch orgs error:", err);
        setError("Failed to load organizations.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  // Wrapper component to maintain grid layout with AnimatedList
  const GridLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">{children}</div>
  );

  const renderOrganization = (org: Organization) => (
    <Card>
      <p className="font-semibold text-lg">{org.name || org.id}</p>
      {org.status && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Status: {org.status}
        </p>
      )}
      <Link
        href={`/dashboard/organizations/${org.id}/projects`}
        className="mt-2 inline-block"
      >
        <GrayButton>View Organization</GrayButton>
      </Link>
    </Card>
  );

  if (error) {
    return (
      <PageContainer>
        <div className="p-6 text-red-600">{error}</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Organizations</h1>
        {/*
          <Link href="/dashboard/organizations/new">
          <GrayButton>Create New Organization</GrayButton>
        </Link>
        */}
      </div>

      <AnimatedList
        items={orgs}
        renderItem={renderOrganization}
        isLoading={loading}
        className="mt-4"
        itemClassName="w-full"
        emptyMessage={
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
            No organizations found.
          </p>
        }
        WrapperComponent={GridLayout}
      />
    </PageContainer>
  );
}
