// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/site-visits/page.tsx
"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ReactSketchCanvas } from "react-sketch-canvas";
import { ReactMediaRecorder } from "react-media-recorder";
import { v4 as uuidv4 } from "uuid";

import {
  fetchSiteVisit,
  updateSiteVisit,
  updatePhotoAnnotation,
  ExtendedSiteVisitDoc,
  SiteVisitEntry,
} from "@/lib/services/SiteVisitService";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

// --------------------------------------------------------------------
// Define an Annotation interface for picture annotations
// --------------------------------------------------------------------
interface Annotation {
  id: string;
  // For ReactSketchCanvas, we store the exported paths as the annotation data.
  paths: any[];
  comment?: string;
}

// --------------------------------------------------------------------
// NewEntryModal Component
// --------------------------------------------------------------------
function NewEntryModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (entry: SiteVisitEntry) => void;
}) {
  const [entryNote, setEntryNote] = useState("");
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
  const [voiceFiles, setVoiceFiles] = useState<FileList | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const storage = getStorage();

  const canvasRef = useRef<any>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Upload file and return its download URL.
  async function uploadFile(file: File, folder: string): Promise<string> {
    const uniqueName = `${uuidv4()}-${file.name}`;
    const fileRef = ref(storage, `${folder}/${uniqueName}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }

  // Handle photo selection and set up for annotation.
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setPhotoFiles(e.target.files);
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setTempImage(previewUrl);
      setSelectedImageUrl(null);
      setAnnotations([]);
      setImageLoaded(false);
      if (canvasRef.current) {
        canvasRef.current.clearCanvas();
      }
    }
  }

  // Save the annotation drawn on the canvas.
  async function handleSaveAnnotation() {
    if (canvasRef.current) {
      const paths = await canvasRef.current.exportPaths();
      if (!paths || paths.length === 0) {
        alert("No annotation found. Please draw on the image before saving.");
        return;
      }
      const newAnnotation: Annotation = {
        id: uuidv4(),
        paths,
      };
      setAnnotations([newAnnotation]);
      setSelectedImageUrl(tempImage);
      alert("Annotation saved!");
    }
  }

  // Clear the current annotation from the canvas.
  function handleClearAnnotation() {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
      setAnnotations([]);
      setSelectedImageUrl(null);
    }
  }

  // Save the new site visit entry.
  async function handleSaveEntry() {
    try {
      const photoData: { url: string; annotations?: Annotation[] }[] = [];
      if (photoFiles && photoFiles.length > 0) {
        for (let i = 0; i < photoFiles.length; i++) {
          const file = photoFiles[i];
          const url = await uploadFile(file, "siteVisitPhotos");
          let photoEntry = { url, annotations: [] as Annotation[] };
          if (tempImage && selectedImageUrl === tempImage && annotations.length > 0) {
            photoEntry.annotations = annotations;
          }
          photoData.push(photoEntry);
        }
      }
      const voiceNotes: string[] = [];
      if (voiceFiles && voiceFiles.length > 0) {
        for (let i = 0; i < voiceFiles.length; i++) {
          const audio = voiceFiles[i];
          const url = await uploadFile(audio, "siteVisitVoiceNotes");
          voiceNotes.push(url);
        }
      }
      const newEntry: SiteVisitEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        note: entryNote,
        photos: photoData,
        voiceNotes,
      };
      onSave(newEntry);
      onClose();
    } catch (err: any) {
      console.error("Error saving entry:", err);
      alert("Failed to save entry.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded p-6 max-w-4xl w-full relative overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">New Site Visit Entry</h2>
        <div className="mb-4">
          <label className="block font-medium mb-1 text-black">Entry Note</label>
          <textarea
            className="w-full border p-2 rounded text-black"
            rows={3}
            value={entryNote}
            onChange={(e) => setEntryNote(e.target.value)}
            placeholder="Enter your notes for this entry..."
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Add Photos</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoChange}
            className="w-full"
          />
          {tempImage && (
            <div className="mt-2">
              <p className="font-medium mb-1">Annotate Photo:</p>
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
                  src={tempImage}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                  onLoad={() => setImageLoaded(true)}
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
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <GrayButton onClick={handleSaveAnnotation} disabled={!imageLoaded}>
                  Save Annotation
                </GrayButton>
                <GrayButton onClick={handleClearAnnotation} disabled={!imageLoaded}>
                  Clear Annotation
                </GrayButton>
              </div>
              <p className="text-xs text-black mt-1">
                Draw on the image as desired. You can circle items, add notes, or freehand
                annotate.
              </p>
            </div>
          )}
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">
            Add Voice Notes (Record or Upload)
          </label>
          <ReactMediaRecorder
            audio
            render={({ status, startRecording, stopRecording, mediaBlobUrl }) => (
              <div className="mb-2">
                <p className="text-xs text-black">Recording Status: {status}</p>
                <div className="flex gap-2 mb-2">
                  <GrayButton onClick={startRecording}>Start</GrayButton>
                  <GrayButton onClick={stopRecording}>Stop</GrayButton>
                </div>
                {mediaBlobUrl && (
                  <div className="mb-2">
                    <audio controls src={mediaBlobUrl} className="w-full" />
                    <GrayButton
                      onClick={async () => {
                        const blob = await fetch(mediaBlobUrl).then((r) => r.blob());
                        const file = new File([blob], `voice-note-${Date.now()}.wav`, {
                          type: "audio/wav",
                        });
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        setVoiceFiles(dt.files);
                      }}
                      className="mt-2"
                    >
                      Save Recorded Voice Note
                    </GrayButton>
                  </div>
                )}
              </div>
            )}
          />
          <input
            type="file"
            multiple
            accept="audio/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setVoiceFiles(e.target.files);
              }
            }}
            className="w-full"
          />
        </div>
        <div className="flex justify-end gap-4">
          <GrayButton onClick={onClose}>Cancel</GrayButton>
          <GrayButton onClick={handleSaveEntry}>Save Entry</GrayButton>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// SiteVisitDetailPage Component
// --------------------------------------------------------------------
export default function SiteVisitDetailPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId, siteVisitId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    siteVisitId: string;
  };

  // Using ExtendedSiteVisitDoc ensures that entries is always an array.
  const [visit, setVisit] = useState<ExtendedSiteVisitDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchSiteVisit(orgId, projectId, subProjectId, siteVisitId);
        setVisit({ ...data, entries: data.entries || [] });
        setNotes(data.notes || "");
      } catch (err: any) {
        setError(err.message || "Failed to load site visit");
      } finally {
        setLoading(false);
      }
    }
    if (orgId && projectId && subProjectId && siteVisitId) {
      loadData();
    }
  }, [orgId, projectId, subProjectId, siteVisitId]);

  async function handleSaveNotes() {
    if (!visit) return;
    try {
      await updateSiteVisit(orgId, projectId, subProjectId, siteVisitId, { notes });
      const data = await fetchSiteVisit(orgId, projectId, subProjectId, siteVisitId);
      setVisit({ ...data, entries: data.entries || [] });
    } catch (err: any) {
      setError(err.message || "Failed to update notes");
    }
  }

  async function handleAddEntry(newEntry: SiteVisitEntry) {
    if (!visit) return;
    try {
      const updatedEntries = [...(visit.entries || []), newEntry];
      await updateSiteVisit(orgId, projectId, subProjectId, siteVisitId, {
        entries: updatedEntries,
      });
      const data = await fetchSiteVisit(orgId, projectId, subProjectId, siteVisitId);
      setVisit({ ...data, entries: data.entries || [] });
    } catch (err: any) {
      setError(err.message || "Failed to add entry");
    }
  }

  if (loading) return <PageContainer>Loading Site Visit...</PageContainer>;
  if (error) return <PageContainer className="text-red-600">{error}</PageContainer>;
  if (!visit) return <PageContainer>Site Visit not found.</PageContainer>;

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <GrayButton
          onClick={() =>
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/site-visits`
            )
          }
        >
          &larr; Back to Site Visits
        </GrayButton>
        <GrayButton onClick={() => setShowNewEntryModal(true)}>+ New Entry</GrayButton>
      </div>

      <Card className="mb-4 p-4">
        <h1 className="text-2xl font-bold mb-1">
          Site Visit: {new Date(visit.visitDate).toLocaleDateString()}
        </h1>
        <p className="mb-2">Participants: {visit.participants.join(", ") || "N/A"}</p>
        <div>
          <label className="block font-medium mb-1">Main Notes</label>
          <textarea
            className="border p-2 w-full rounded"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mt-2">
            <GrayButton onClick={handleSaveNotes}>Save Main Notes</GrayButton>
          </div>
        </div>
      </Card>

      {/* Entries List */}
      <div className="space-y-4">
        {visit.entries && visit.entries.length > 0 ? (
          visit.entries
            .sort(
              (a: SiteVisitEntry, b: SiteVisitEntry) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )
            .map((entry: SiteVisitEntry) => (
              <Card key={entry.id} className="p-4">
                <p className="text-black">{new Date(entry.timestamp).toLocaleString()}</p>
                {entry.note && <p className="mt-2 text-black">{entry.note}</p>}
                {entry.photos && entry.photos.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {entry.photos.map(
                      (
                        photo: { url: string; annotations?: Annotation[] },
                        idx: number
                      ) => (
                        <div key={idx} className="relative border rounded p-1">
                          <img
                            src={photo.url}
                            alt="Entry photo"
                            className="w-full h-40 object-cover cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/site-visits/${siteVisitId}/annotation?photoUrl=${encodeURIComponent(
                                  photo.url
                                )}&entryId=${entry.id}`
                              )
                            }
                          />
                        </div>
                      )
                    )}
                  </div>
                )}
                {entry.voiceNotes && entry.voiceNotes.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {entry.voiceNotes.map((audioUrl: string, idx: number) => (
                      <audio key={idx} controls src={audioUrl} className="w-full" />
                    ))}
                  </div>
                )}
              </Card>
            ))
        ) : (
          <Card className="p-4">
            <p>No entries have been added for this site visit.</p>
          </Card>
        )}
      </div>

      {/* New Entry Modal */}
      {showNewEntryModal && (
        <NewEntryModal
          onClose={() => setShowNewEntryModal(false)}
          onSave={handleAddEntry}
        />
      )}
    </PageContainer>
  );
}
