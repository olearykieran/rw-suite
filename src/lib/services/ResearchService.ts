// src/lib/services/ResearchService.ts
import { firestore, auth } from "@/lib/firebaseConfig";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";

/**
 * Interface representing a single research entry.
 */
export interface ResearchEntry {
  title: string;
  url: string;
  type: string;
  source: string;
  date: string; // ISO date string (e.g., "2024-01-01")
  tags: string[]; // Array of tag strings (e.g., ["Market Growth", "NYC"])
  summary: string;
  author?: string; // Optional: author of the article
  notes?: string; // Optional: additional personal notes or commentary
}

/**
 * Creates multiple research entries in Firestore in one batch.
 *
 * The entries are stored under:
 * organizations/{orgId}/projects/{projectId}/subprojects/{subProjectId}/researchEntries
 *
 * @param orgId - Organization ID
 * @param projectId - Project ID
 * @param subProjectId - Sub-Project ID
 * @param entries - Array of research entries to add
 */
export async function createResearchEntries(
  orgId: string,
  projectId: string,
  subProjectId: string,
  entries: ResearchEntry[]
): Promise<void> {
  const researchCollection = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "researchEntries"
  );

  // Save each entry using addDoc (could be enhanced with batch writes if needed)
  const savePromises = entries.map(async (entry) => {
    await addDoc(researchCollection, {
      ...entry,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || null,
    });
  });

  await Promise.all(savePromises);
}

/**
 * Fetches all research entries from Firestore for the specified subproject.
 *
 * @param orgId - Organization ID
 * @param projectId - Project ID
 * @param subProjectId - Sub-Project ID
 * @returns Array of research entries.
 */
export async function fetchResearchEntries(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<ResearchEntry[]> {
  const researchCollection = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "researchEntries"
  );
  const snapshot = await getDocs(researchCollection);
  const entries: ResearchEntry[] = [];
  snapshot.forEach((doc) => {
    entries.push(doc.data() as ResearchEntry);
  });
  return entries;
}
