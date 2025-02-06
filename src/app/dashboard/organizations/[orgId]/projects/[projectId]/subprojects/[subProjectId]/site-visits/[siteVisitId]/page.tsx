"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ReactPictureAnnotation } from "react-picture-annotation";
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
  mark: string;
  x: number;
  y: number;
  width: number;
  height: number;
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
  const storage = getStorage();

  // Upload file and return its download URL
  async function uploadFile(file: File, folder: string): Promise<string> {
    const uniqueName = `${uuidv4()}-${file.name}`;
    const fileRef = ref(storage, `${folder}/${uniqueName}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }

  // Handle photo selection and set up for annotation
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setPhotoFiles(e.target.files);
      // Use the first photo for annotation preview.
      const file = e.target.files[0];
      setTempImage(URL.createObjectURL(file));
      setSelectedImageUrl(null);
      setAnnotations([]);
    }
  }

  // Save the new site visit entry
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
        className="bg-white rounded p-6 max-w-2xl w-full relative overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">New Site Visit Entry</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Entry Note</label>
          <textarea
            className="w-full border p-2 rounded"
            rows={3}
            value={entryNote}
            onChange={(e) => setEntryNote(e.target.value)}
            placeholder="Enter your notes for this entry..."
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Add Photos</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoChange}
            className="w-full"
          />
          {tempImage && (
            <div className="mt-2">
              <p className="text-sm font-medium mb-1">Annotate Photo:</p>
              <ReactPictureAnnotation
                image={tempImage}
                width={600}
                height={400}
                annotationData={annotations}
                onChange={(data: any[]) => setAnnotations(data as Annotation[])}
                onSelect={() => {}}
                selectedId={null}
              />
              <p className="text-xs text-black dark:text-white">
                Draw on the image as desired. Annotations will be saved with this photo.
              </p>
            </div>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Add Voice Notes (Record or Upload)
          </label>
          <ReactMediaRecorder
            audio
            render={({ status, startRecording, stopRecording, mediaBlobUrl }) => (
              <div className="mb-2">
                <p className="text-xs text-black dark:text-white">
                  Recording Status: {status}
                </p>
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
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/site-visits`}
          className="text-sm font-medium text-blue-600 underline"
        >
          &larr; Back to Site Visits
        </Link>
        <GrayButton onClick={() => setShowNewEntryModal(true)}>+ New Entry</GrayButton>
      </div>

      <Card className="mb-4 p-4 text-black dark:text-white">
        <h1 className="text-2xl font-bold mb-1">
          Site Visit: {new Date(visit.visitDate).toLocaleDateString()}
        </h1>
        <p className="text-sm text-black dark:text-white mb-2">
          Participants: {visit.participants.join(", ") || "N/A"}
        </p>
        <div>
          <label className="block text-sm font-medium mb-1">Main Notes</label>
          <textarea
            className="border p-2 w-full text-black dark:text-black rounded"
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
                <p className="text-sm text-black dark:text-white">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
                {entry.note && (
                  <p className="mt-2 text-sm text-black dark:text-white">{entry.note}</p>
                )}
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
            <p className="text-sm text-black dark:text-white">
              No entries have been added for this site visit.
            </p>
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
