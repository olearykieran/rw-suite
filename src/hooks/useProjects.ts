// src/hooks/useProjects.ts

import { useState, useEffect } from "react";
import { firestore } from "@/lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

// Define the Project interface
export interface Project {
  id: string;
  name: string;
  location: string;
}

/**
 * Custom hook to fetch projects for a given organization ID from Firestore.
 * @param orgId The organization ID for which projects will be fetched.
 * @returns An object containing the projects array, loading state, and any error encountered.
 */
export function useProjects(orgId: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        // Build the reference to the projects subcollection under the given organization
        const projectsRef = collection(firestore, "organizations", orgId, "projects");
        const snapshot = await getDocs(projectsRef);
        console.log("Fetched projects snapshot size:", snapshot.size);
        // Map each document into a Project object
        const projectsList: Project[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          console.log("Project doc data:", data);
          return {
            id: doc.id,
            name: data.name,
            location: data.location || "",
          };
        });
        setProjects(projectsList);
      } catch (err: any) {
        console.error("Error fetching projects:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (orgId) {
      fetchProjects();
    }
  }, [orgId]);

  return { projects, loading, error };
}
