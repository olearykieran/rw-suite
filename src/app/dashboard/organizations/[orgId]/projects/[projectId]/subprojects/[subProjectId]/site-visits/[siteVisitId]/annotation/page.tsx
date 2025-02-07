"use client";

import { useSearchParams, useRouter, useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { ReactSketchCanvas } from "react-sketch-canvas";
import { v4 as uuidv4 } from "uuid";
import { useLoadingBar } from "@/context/LoadingBarContext";
import { fetchSiteVisit, updateSiteVisit } from "@/lib/services/SiteVisitService";

interface Annotation {
  id: string;
  paths: any[];
  comment?: string;
}

export default function AnnotationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { orgId, projectId, subProjectId, siteVisitId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    siteVisitId: string;
  };
  const { setIsLoading } = useLoadingBar();

  // Get URL parameters and handle encoding
  const rawPhotoUrl = searchParams.get("photoUrl");
  const photoUrl = rawPhotoUrl || null;
  const entryId = searchParams.get("entryId");

  const canvasRef = useRef<any>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [saved, setSaved] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [visit, setVisit] = useState<any>(null);

  // Load site visit data and existing annotations
  useEffect(() => {
    const loadData = async () => {
      if (!entryId || !photoUrl) return;

      try {
        const siteVisit = await fetchSiteVisit(
          orgId,
          projectId,
          subProjectId,
          siteVisitId
        );
        setVisit(siteVisit);

        const entry = siteVisit.entries?.find((e: any) => e.id === entryId);
        if (!entry) return;

        const photo = entry.photos?.find((p: any) => p.url === photoUrl);
        if (photo?.annotations?.length > 0) {
          setAnnotations(photo.annotations);
          if (canvasRef.current && imageLoaded) {
            await canvasRef.current.loadPaths(photo.annotations[0].paths);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    if (imageLoaded) {
      loadData();
    }
  }, [orgId, projectId, subProjectId, siteVisitId, entryId, photoUrl, imageLoaded]);

  // Update canvas dimensions when image loads
  useEffect(() => {
    if (imageRef.current && imageLoaded) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setImageSize({ width: naturalWidth, height: naturalHeight });
    }
  }, [imageLoaded]);

  async function handleSave() {
    if (!canvasRef.current || !entryId || !photoUrl || !visit) {
      alert("Missing required data for saving annotation");
      return;
    }

    try {
      setIsLoading(true);
      const paths = await canvasRef.current.exportPaths();

      if (!paths || paths.length === 0) {
        alert("No annotations drawn. Please draw on the image before saving.");
        return;
      }

      const newAnnotation: Annotation = {
        id: uuidv4(),
        paths,
      };

      // Find and update the specific photo's annotations in the entry
      const updatedEntries = visit.entries.map((entry: any) => {
        if (entry.id === entryId) {
          return {
            ...entry,
            photos: entry.photos.map((photo: any) => {
              if (photo.url === photoUrl) {
                return {
                  ...photo,
                  annotations: [newAnnotation], // Replace existing annotations
                };
              }
              return photo;
            }),
          };
        }
        return entry;
      });

      // Update the entire site visit document
      await updateSiteVisit(orgId, projectId, subProjectId, siteVisitId, {
        entries: updatedEntries,
      });

      setAnnotations([newAnnotation]);
      setSaved(true);
      alert("Annotation saved successfully!");
    } catch (error) {
      console.error("Error saving annotation:", error);
      alert("Failed to save annotation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClear() {
    if (!canvasRef.current || !visit) return;

    try {
      console.log("Clearing canvas...");
      await canvasRef.current.clearCanvas();
      setAnnotations([]);
      setSaved(false);

      // Update the database to remove annotations
      if (entryId && photoUrl) {
        const updatedEntries = visit.entries.map((entry: any) => {
          if (entry.id === entryId) {
            return {
              ...entry,
              photos: entry.photos.map((photo: any) => {
                if (photo.url === photoUrl) {
                  return {
                    ...photo,
                    annotations: [], // Clear annotations
                  };
                }
                return photo;
              }),
            };
          }
          return entry;
        });

        await updateSiteVisit(orgId, projectId, subProjectId, siteVisitId, {
          entries: updatedEntries,
        });
      }
    } catch (error) {
      console.error("Error clearing annotation:", error);
      alert("Failed to clear annotation. Please try again.");
    }
  }

  function handleBack() {
    setIsLoading(true);
    router.back();
  }

  if (!photoUrl) {
    return (
      <PageContainer>
        <p>No photo URL provided.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-4">
        <GrayButton onClick={handleBack}>&larr; Back</GrayButton>
      </div>

      <Card className="p-4">
        <h1 className="text-xl font-bold mb-4">Annotate Photo</h1>
        <div
          className="relative border rounded overflow-hidden bg-gray-100"
          style={{
            minHeight: "400px",
            maxHeight: "80vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <img
            ref={imageRef}
            src={photoUrl}
            alt="Photo to annotate"
            className="max-w-full max-h-full object-contain"
            onLoad={() => {
              setImageLoaded(true);
              setImageError(null);
            }}
            onError={(e) => {
              console.error("Error loading image:", e);
              setImageError("Failed to load image. Please check the URL and try again.");
            }}
          />

          {imageLoaded && (
            <div
              className="absolute inset-0"
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              <ReactSketchCanvas
                ref={canvasRef}
                width="100%"
                height="100%"
                strokeWidth={3}
                strokeColor="red"
                canvasColor="transparent"
                preserveAspectRatio="xMidYMid meet"
              />
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-4">
          <GrayButton onClick={handleSave} disabled={!imageLoaded}>
            Save Annotation
          </GrayButton>
          <GrayButton onClick={handleClear} disabled={!imageLoaded}>
            Clear Annotation
          </GrayButton>
        </div>

        {saved && <p className="mt-2 text-green-600">Annotation saved successfully!</p>}
      </Card>
    </PageContainer>
  );
}
