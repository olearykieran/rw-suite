// /dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query } from "firebase/firestore";
import { getCountFromServer } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";
import { ShimmerCard } from "@/components/ui/ShimmerCard";
import { useLoadingBar } from "@/context/LoadingBarContext";
import { GrayButton } from "@/components/ui/GrayButton"; // Import GrayButton for consistent styling

interface SubProjectDoc {
  id: string;
  name?: string;
  status?: string;
  // Additional fields as needed.
}

export default function SubProjectOverview() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  // Local states for sub‑project data, main project name, error state, and display flag.
  const [subProject, setSubProject] = useState<SubProjectDoc | null>(null);
  const [mainProjectName, setMainProjectName] = useState("");
  const [error, setError] = useState("");
  const [showContent, setShowContent] = useState(false);

  // State for feature counts.
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Use the global loading bar setter.
  const { setIsLoading } = useLoadingBar();

  // Define a mapping for the features.
  const features = [
    {
      route: "rfis",
      collectionName: "rfis",
      label: "RFIs",
      description: "Create, distribute, and track Requests for Information.",
    },
    // {
    //   route: "submittals",
    //   collectionName: "submittals",
    //   label: "Submittals",
    //   description: "Create, distribute, and track Submittals.",
    // },
    {
      route: "blueprints",
      collectionName: "blueprints",
      label: "Blueprints",
      description: "Create, distribute, and track Blueprints.",
    },
    {
      route: "tasks",
      collectionName: "tasks",
      label: "Tasks & Scheduling",
      description: "Create, distribute, and track Tasks.",
    },
    // {
    //   route: "finances",
    //   collectionName: "finances",
    //   label: "Finances",
    //   description: "Create, distribute, and track Finances.",
    // },
    {
      route: "change-orders",
      collectionName: "change-orders",
      label: "Change Orders",
      description: "Track changes to scope, costs, or schedule.",
    },
    // {
    //   route: "daily-reports",
    //   collectionName: "daily-reports",
    //   label: "Daily Reports",
    //   description: "Log site conditions, progress, and any incidents daily.",
    // },
    {
      route: "meeting-minutes",
      collectionName: "meeting-minutes",
      label: "Meeting Minutes",
      description: "Document discussions, decisions, and next steps from meetings.",
    },
    {
      route: "punch-lists",
      collectionName: "punch-lists",
      label: "Punch Lists",
      description:
        "Track final tasks or issues that must be resolved before project close‑out.",
    },
    {
      route: "site-visits",
      collectionName: "siteVisits",
      label: "Site Visits",
      description:
        "Record details, upload/annotate photos, and attach voice notes from site visits.",
    },
    {
      route: "master-takeoff",
      collectionName: "master-takeoff",
      label: "Master Takeoff",
      description: "Import or create a master list of items to compare against bids.",
    },
    {
      route: "bid-leveler",
      collectionName: "bids",
      label: "Bid Leveler",
      description: "Compare contractor bids and identify scope gaps.",
    },
    {
      route: "lighting-schedule",
      collectionName: "lighting-schedule",
      label: "Lighting Schedule",
      description: "Estimate lighting costs and schedule installation.",
    },
    {
      route: "bid-management",
      collectionName: "bidSubmissions",
      label: "Bid Management",
      description: "Manage bid submissions and guidelines.",
    },
    {
      route: "research",
      collectionName: "research",
      label: "Research",
      description: "Manage research and documentation.",
    },
  ];

  // Fetch data for the detailed sub‑project view.
  useEffect(() => {
    async function fetchData() {
      try {
        if (!orgId || !projectId || !subProjectId) return;

        // Create references to the main project and sub‑project documents.
        const mainRef = doc(firestore, "organizations", orgId, "projects", projectId);
        const subRef = doc(mainRef, "subprojects", subProjectId);

        // Fetch the sub‑project document.
        const subSnap = await getDoc(subRef);
        if (!subSnap.exists()) {
          setError("Sub‑project not found.");
          return;
        }
        const subProjData: SubProjectDoc = {
          id: subSnap.id,
          ...(subSnap.data() as Omit<SubProjectDoc, "id">),
        };
        setSubProject(subProjData);

        // Update localStorage for future reference.
        const oldName = localStorage.getItem("selectedSubProjectName") || "";
        const newName = subProjData.name || "";
        localStorage.setItem("selectedOrgId", orgId);
        localStorage.setItem("selectedProjectId", projectId);
        localStorage.setItem("selectedSubProjectId", subProjectId);
        if (oldName !== newName) {
          localStorage.setItem("selectedSubProjectName", newName);
          // Instead of using window.location.assign (which flashes black),
          // trigger the global loading bar and use router.replace.
          setIsLoading(true);
          router.replace(
            `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
          );
          // Clear the loading state after a short delay.
          setTimeout(() => {
            setIsLoading(false);
          }, 500);
          return;
        }

        // Fetch main project name.
        const mainSnap = await getDoc(mainRef);
        if (mainSnap.exists()) {
          setMainProjectName((mainSnap.data().name as string) || projectId);
        }

        // Helper: Fetch counts for each feature subcollection.
        async function fetchFeatureCounts() {
          const newCounts: Record<string, number> = {};
          await Promise.all(
            features.map(async (feature) => {
              try {
                const featureColRef = collection(subRef, feature.collectionName);
                const q = query(featureColRef);
                const snapshot = await getCountFromServer(q);
                newCounts[feature.route] = snapshot.data().count;
              } catch (error) {
                console.error(
                  `Error fetching count for ${feature.collectionName}:`,
                  error
                );
                newCounts[feature.route] = 0;
              }
            })
          );
          setCounts(newCounts);
        }
        await fetchFeatureCounts();

        // Fade in content after data is loaded.
        setShowContent(true);
      } catch (err) {
        console.error("Fetch sub‑project error:", err);
        setError("Failed to load sub‑project.");
      }
    }

    fetchData();
  }, [orgId, projectId, subProjectId, router, setIsLoading]);

  function handleDeselectSubProject() {
    localStorage.removeItem("selectedSubProjectId");
    localStorage.removeItem("selectedProjectId");
    localStorage.removeItem("selectedOrgId");
    localStorage.removeItem("selectedSubProjectName");
    router.push(`/dashboard/organizations/${orgId}/projects`);
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!showContent) {
    return (
      <div className="relative p-6">
        <ShimmerCard />
      </div>
    );
  }

  if (!subProject) {
    return <div className="p-6">No sub‑project found.</div>;
  }

  return (
    <>
      {/* Note: The TopLoadingBar is handled globally via TopHeader */}
      <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-8 relative">
        {/* Section #1: Back link & Sub‑Project Header */}
        <div
          className={`opacity-0 transition-all duration-500 ease-out ${
            showContent ? "opacity-100 translate-y-0" : "translate-y-4"
          }`}
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            {/* Updated back button using GrayButton with loading context */}
            <GrayButton
              onClick={() => {
                setIsLoading(true); // Activate the global loading bar before navigation.
                router.push(
                  `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects`
                );
              }}
            >
              &larr; Back to Sub‑Projects of {mainProjectName}
            </GrayButton>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-black dark:border-gray-600 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h1 className="text-2xl sm:text-3xl text-black dark:text-white font-bold">
                Sub‑Project: {subProject.name || subProjectId}
              </h1>
              <button
                onClick={handleDeselectSubProject}
                className="bg-gray-300 text-black hover:bg-gray-400 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-base"
              >
                Deselect
              </button>
            </div>
            <p className="text-black dark:text-white">
              <strong>Status:</strong> {subProject.status || "N/A"}
            </p>
          </div>
        </div>

        {/* Section #2: Sub‑Project Features */}
        <div
          className={`opacity-0 transition-all duration-500 ease-out delay-[100ms] ${
            showContent ? "opacity-100 translate-y-0" : "translate-y-4"
          }`}
        >
          <div className="bg-white dark:bg-neutral-900 border border-black dark:border-gray-600 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
            <h2 className="text-2xl text-black dark:text-white font-semibold">
              Sub‑Project Features
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {features.map((feature) => (
                <Link
                  key={feature.route}
                  href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/${feature.route}`}
                  // Trigger the global loading bar when a feature is clicked.
                  onClick={() => setIsLoading(true)}
                  className="bg-white text-black min-h-52 dark:text-white dark:bg-neutral-700 border dark:hover:bg-black hover:bg-black hover:text-white border-black dark:border-gray-600 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition"
                >
                  <h3 className="font-bold mb-1">
                    {feature.label} ({counts[feature.route] ?? 0})
                  </h3>
                  <p>{feature.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
