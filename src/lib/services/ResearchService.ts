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
  author?: string; // Optional: author of the article or social media account name
  notes?: string; // Optional: additional personal notes or commentary
  image?: string; // URL to an image, especially for social media posts
  likes?: number; // Number of likes (for social media posts)
  shares?: number; // Number of shares/retweets (for social media posts)
  comments?: number; // Number of comments (for social media posts)
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
  try {
    console.log("Fetching research entries for:", { orgId, projectId, subProjectId });

    // Try both collection names to ensure we find the data
    let collRef = collection(
      firestore,
      "organizations",
      orgId,
      "projects",
      projectId,
      "subprojects",
      subProjectId,
      "researchEntries" // Try this collection name first
    );

    let snapshot = await getDocs(collRef);

    // If no documents found, try the other collection name
    if (snapshot.empty) {
      collRef = collection(
        firestore,
        "organizations",
        orgId,
        "projects",
        projectId,
        "subprojects",
        subProjectId,
        "research" // Try this collection name as fallback
      );
      snapshot = await getDocs(collRef);
    }

    console.log("Found entries:", snapshot.docs.length);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || "",
        url: data.url || "",
        type: data.type || "",
        source: data.source || "",
        date: data.date || "",
        tags: data.tags || [],
        summary: data.summary || "",
        author: data.author,
        notes: data.notes,
        image: data.image,
        likes: data.likes,
        shares: data.shares,
        comments: data.comments,
        ...data,
      } as ResearchEntry;
    });
  } catch (error) {
    console.error("Error fetching research entries:", error);
    throw error;
  }
}
