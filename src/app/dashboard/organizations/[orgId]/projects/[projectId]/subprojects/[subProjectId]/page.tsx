"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
// Import Firestore functions including the count helper functions
import { doc, getDoc, collection, query, getCountFromServer } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";
import { useLoading } from "@/components/ui/LoadingProvider";

// Define the interface for the subproject document
interface SubProjectDoc {
  id: string;
  name?: string;
  status?: string;
  // add other fields if needed (like startDate, etc.)
}

export default function SubProjectOverview() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  // States for subproject data, main project name, error state, and fade-in flag
  const [subProject, setSubProject] = useState<SubProjectDoc | null>(null);
  const [mainProjectName, setMainProjectName] = useState("");
  const [error, setError] = useState("");
  const [showContent, setShowContent] = useState(false);

  // State for feature counts: key is the route key, value is the count
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Get the global loading function from our LoadingProvider
  const { withLoading } = useLoading();

  // Define a mapping for the features.
  // Each object contains:
  // • route: the URL segment for routing
  // • collectionName: the actual Firestore subcollection name for queries
  // • label: display label for the button
  // • description: a short description for the feature
  const features = [
    {
      route: "rfis",
      collectionName: "rfis",
      label: "RFIs",
      description: "Create, distribute, and track Requests for Information.",
    },
    {
      route: "submittals",
      collectionName: "submittals",
      label: "Submittals",
      description: "Create, distribute, and track Submittals.",
    },
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
    {
      route: "finances",
      collectionName: "finances",
      label: "Finances",
      description: "Create, distribute, and track Finances.",
    },
    {
      route: "change-orders",
      collectionName: "change-orders",
      label: "Change Orders",
      description: "Track changes to scope, costs, or schedule.",
    },
    {
      route: "daily-reports",
      collectionName: "daily-reports",
      label: "Daily Reports",
      description: "Log site conditions, progress, and any incidents daily.",
    },
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
        "Track final tasks or issues that must be resolved before project close-out.",
    },
    {
      route: "site-visits",
      collectionName: "siteVisits", // Firestore collection name differs from route
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
      collectionName: "bids", // actual Firestore collection for bid-leveler
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
      collectionName: "bidSubmissions", // actual Firestore collection for bid-management
      label: "Bid Management",
      description: "Manage bid submissions and guidelines.",
    },
  ];

  // Fetch data using the global withLoading to consolidate the loading UI
  useEffect(() => {
    async function fetchData() {
      try {
        if (!orgId || !projectId || !subProjectId) return;

        // Create references to the main project and subproject documents
        const mainRef = doc(firestore, "organizations", orgId, "projects", projectId);
        const subRef = doc(mainRef, "subprojects", subProjectId);

        // Fetch the sub-project document
        const subSnap = await getDoc(subRef);
        if (!subSnap.exists()) {
          setError("Sub-project not found.");
          return;
        }
        const subProjData: SubProjectDoc = {
          id: subSnap.id,
          ...(subSnap.data() as Omit<SubProjectDoc, "id">),
        };
        setSubProject(subProjData);

        // Update localStorage for future reference
        const oldName = localStorage.getItem("selectedSubProjectName") || "";
        const newName = subProjData.name || "";
        localStorage.setItem("selectedOrgId", orgId);
        localStorage.setItem("selectedProjectId", projectId);
        localStorage.setItem("selectedSubProjectId", subProjectId);
        if (oldName !== newName) {
          localStorage.setItem("selectedSubProjectName", newName);
          window.location.assign(
            `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
          );
          return;
        }

        // Fetch main project name
        const mainSnap = await getDoc(mainRef);
        if (mainSnap.exists()) {
          setMainProjectName((mainSnap.data().name as string) || projectId);
        }

        // Helper function: Fetch counts for each feature subcollection using collectionName
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

        // Fade in content after data is loaded
        setShowContent(true);
      } catch (err) {
        console.error("Fetch sub-project error:", err);
        setError("Failed to load sub-project.");
      }
    }

    // Wrap the fetchData function with the global loading handler
    withLoading(fetchData);
  }, [orgId, projectId, subProjectId, withLoading]);

  // Function to deselect the current subproject (clearing related localStorage keys)
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
  if (!subProject) {
    return <div className="p-6">No sub-project found.</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Section #1: Back link & Sub-Project Header */}
      <div
        className={`opacity-0 transition-all duration-500 ease-out delay-[0ms] ${
          showContent ? "opacity-100 translate-y-0" : "translate-y-4"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() =>
              router.push(
                `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects`
              )
            }
            className="bg-gray-300 text-black hover:bg-gray-400 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors px-4 py-2 rounded-xl text-sm"
          >
            &larr; Back to Sub-Projects of {mainProjectName}
          </button>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-gray-600 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">
              Sub-Project: {subProject.name || subProjectId}
            </h1>
            <button
              onClick={handleDeselectSubProject}
              className="bg-gray-300 text-black hover:bg-gray-400 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors px-6 py-3 rounded-xl text-base"
            >
              Deselect
            </button>
          </div>
          <p className="text-sm">
            <strong>Status:</strong> {subProject.status || "N/A"}
          </p>
        </div>
      </div>

      {/* Section #2: Sub-Project Features */}
      <div
        className={`opacity-0 transition-all duration-500 ease-out delay-[100ms] ${
          showContent ? "opacity-100 translate-y-0" : "translate-y-4"
        }`}
      >
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-gray-600 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Sub-Project Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((feature) => (
              <Link
                key={feature.route}
                href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/${feature.route}`}
                className="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-gray-600 rounded-xl p-6 shadow-sm hover:shadow-md transition"
              >
                <h3 className="font-bold mb-1">
                  {feature.label} ({counts[feature.route] ?? 0})
                </h3>
                <p className="text-sm">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
