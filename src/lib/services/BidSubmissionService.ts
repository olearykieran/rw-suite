// src/lib/services/BidSubmissionService.ts

import { firestore } from "@/lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

/**
 * Interface for a bid submission document.
 */
export interface BidSubmission {
  id: string;
  projectName: string;
  projectLocation: string;
  contractorName: string;
  bidDueDate: string;
  submissionMethod: string;
  contactPhone: string;
  contactEmail: string;
  questionDeadline: string;
  issuerName: string;
  issuerTitle: string;
  issuerCompany: string;
  issuerPhone: string;
  issuerEmail: string;
  additionalInstructions: string;
  createdAt?: any;
}

/**
 * fetchAllBidSubmissions - Retrieves all bid submissions for a given subproject.
 * @param orgId - Organization ID.
 * @param projectId - Project ID.
 * @param subProjectId - Subproject ID.
 * @returns A promise resolving to an array of BidSubmission objects.
 */
export async function fetchAllBidSubmissions(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<BidSubmission[]> {
  const submissionsRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "bidSubmissions"
  );
  const snapshot = await getDocs(submissionsRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<BidSubmission, "id">),
  }));
}
