"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

// Import Firestore methods for deletion
import { doc, deleteDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";

// Import the bid submission service and PDF generator function
import {
  fetchAllBidSubmissions,
  BidSubmission,
} from "@/lib/services/BidSubmissionService";
import { generateBidSubmissionGuidelinesPDF } from "@/lib/services/BidSubmissionGuidelinesPDFGenerator";

/**
 * BidManagementPage
 * - Lists all bid submissions for the selected subproject.
 * - Provides options to view (generate) the guidelines PDF and to delete a submission.
 */
export default function BidManagementPage() {
  // Get orgId, projectId, and subProjectId from the URL
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();

  // State for bid submissions, loading and error messages
  const [bidSubmissions, setBidSubmissions] = useState<BidSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch bid submissions from Firestore when orgId, projectId, or subProjectId changes
  useEffect(() => {
    async function loadBidSubmissions() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        const data = await fetchAllBidSubmissions(orgId, projectId, subProjectId);
        // Optionally sort by createdAt descending
        const sorted = data.sort((a, b) => {
          const aTime = a.createdAt ? a.createdAt.seconds : 0;
          const bTime = b.createdAt ? b.createdAt.seconds : 0;
          return bTime - aTime;
        });
        setBidSubmissions(sorted);
      } catch (err: any) {
        console.error("Failed to load bid submissions:", err);
        setError("Failed to load bid submissions.");
      } finally {
        setLoading(false);
      }
    }
    loadBidSubmissions();
  }, [orgId, projectId, subProjectId]);

  // Handler to view (generate) the PDF using the stored bid submission data
  function handleViewPDF(submission: BidSubmission) {
    generateBidSubmissionGuidelinesPDF(submission);
  }

  // Handler to delete a bid submission from Firestore and update local state
  async function handleDelete(submissionId: string) {
    try {
      const submissionDocRef = doc(
        firestore,
        "organizations",
        orgId,
        "projects",
        projectId,
        "subprojects",
        subProjectId,
        "bidSubmissions",
        submissionId
      );
      await deleteDoc(submissionDocRef);
      setBidSubmissions((prev) =>
        prev.filter((submission) => submission.id !== submissionId)
      );
      console.log("Bid submission deleted successfully.");
    } catch (err: any) {
      console.error("Failed to delete bid submission:", err);
      setError("Failed to delete bid submission.");
    }
  }

  if (loading) return <PageContainer>Loading bid submissions...</PageContainer>;
  if (error) return <PageContainer>{error}</PageContainer>;

  return (
    <PageContainer>
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <GrayButton
          onClick={() =>
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
            )
          }
        >
          &larr; Back to Project
        </GrayButton>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-management/new`}
        >
          <GrayButton>Create New Bid Submission</GrayButton>
        </Link>
      </div>

      <Card>
        <h1 className="text-xl font-semibold mb-2">Bid Submissions</h1>
        {bidSubmissions.length === 0 ? (
          <p className=" text-neutral-600">No bid submissions found.</p>
        ) : (
          <div className="space-y-3">
            {bidSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="p-2 border-b last:border-none hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {submission.projectName} - {submission.contractorName}
                    </p>
                    <p className=" text-neutral-600">
                      Due Date: {submission.bidDueDate || "N/A"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <GrayButton onClick={() => handleViewPDF(submission)}>
                      View Guidelines PDF
                    </GrayButton>
                    <GrayButton
                      onClick={() => handleDelete(submission.id)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete
                    </GrayButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
