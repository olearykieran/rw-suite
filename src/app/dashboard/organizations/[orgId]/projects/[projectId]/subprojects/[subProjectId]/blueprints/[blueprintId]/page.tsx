// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/blueprints/[blueprintId]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchBlueprint,
  updateAnnotations,
  BlueprintAnnotation,
} from "@/lib/services/BlueprintService";
import PDFAnnotator from "@/components/PDFAnnotatorWithZoom";
import ImageAnnotator from "@/components/ImageAnnotatorWithZoom";
// Import the global loading bar hook and GrayButton for consistent styling.
import { useLoadingBar } from "@/context/LoadingBarContext";
import { GrayButton } from "@/components/ui/GrayButton";

/**
 * Detect if a file is PDF by extension.
 */
function isPdfFile(url: string): boolean {
  const lower = url.split("?")[0].toLowerCase();
  return lower.endsWith(".pdf");
}

export default function BlueprintDetailPage() {
  const { orgId, projectId, subProjectId, blueprintId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    blueprintId: string;
  };

  const router = useRouter();
  const { setIsLoading } = useLoadingBar();

  const [blueprint, setBlueprint] = useState<any>(null);
  const [pins, setPins] = useState<BlueprintAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        if (!orgId || !projectId || !subProjectId || !blueprintId) return;
        setLoading(true);
        const doc = await fetchBlueprint(orgId, projectId, subProjectId, blueprintId);
        setBlueprint(doc);
        setPins(doc.annotations || []);
      } catch (err: any) {
        console.error("Fetch blueprint error:", err);
        setError("Failed to load blueprint.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, blueprintId]);

  // Add a new pin and update Firestore.
  async function handleAddPin(pin: BlueprintAnnotation) {
    const updated = [...pins, pin];
    setPins(updated);
    await updateAnnotations(orgId, projectId, subProjectId, blueprintId, updated);
  }

  // Update an existing pin (or delete if pinType === "DELETED").
  async function handleUpdatePin(pin: BlueprintAnnotation) {
    if (pin.pinType === "DELETED") {
      const filtered = pins.filter((p) => p.id !== pin.id);
      setPins(filtered);
      await updateAnnotations(orgId, projectId, subProjectId, blueprintId, filtered);
      return;
    }
    const updated = pins.map((p) => (p.id === pin.id ? pin : p));
    setPins(updated);
    await updateAnnotations(orgId, projectId, subProjectId, blueprintId, updated);
  }

  // Directly delete a pin.
  async function handleDeletePin(pinId: string) {
    const filtered = pins.filter((p) => p.id !== pinId);
    setPins(filtered);
    await updateAnnotations(orgId, projectId, subProjectId, blueprintId, filtered);
  }

  if (loading) {
    return <div className="p-4">Loading Blueprint...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }
  if (!blueprint) {
    return <div className="p-4">No blueprint found.</div>;
  }

  const isPdf = isPdfFile(blueprint.fileUrl);

  return (
    <main className="p-4 space-y-4">
      {/* Back Button */}
      <GrayButton
        onClick={() => {
          setIsLoading(true); // Trigger the loading bar before navigation.
          router.push(
            `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/blueprints`
          );
        }}
      >
        &larr; Back to Blueprints
      </GrayButton>

      <h1 className="text-xl font-bold">{blueprint.title}</h1>

      {isPdf ? (
        <PDFAnnotator
          fileUrl={blueprint.fileUrl}
          pins={pins}
          onAddPin={handleAddPin}
          onUpdatePin={handleUpdatePin}
          onDeletePin={handleDeletePin}
        />
      ) : (
        <ImageAnnotator
          fileUrl={blueprint.fileUrl}
          pins={pins}
          onAddPin={handleAddPin}
          onUpdatePin={handleUpdatePin}
          onDeletePin={handleDeletePin}
        />
      )}
    </main>
  );
}
