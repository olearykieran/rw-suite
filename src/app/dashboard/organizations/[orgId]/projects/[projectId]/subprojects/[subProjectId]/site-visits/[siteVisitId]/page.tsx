// File: src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/site-visits/[siteVisitId]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import {
  fetchSiteVisit,
  updateSiteVisit,
  updatePhotoAnnotation,
  SiteVisitDoc,
} from "@/lib/services/SiteVisitService";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// For photo annotation
import { ReactPictureAnnotation } from "react-picture-annotation";

// For recording audio
import { ReactMediaRecorder } from "react-media-recorder";

export default function SiteVisitDetailPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId, siteVisitId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    siteVisitId: string;
  };

  const [visit, setVisit] = useState<SiteVisitDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For adding new photos or new voice notes
  const [newPhotos, setNewPhotos] = useState<FileList | null>(null);
  const [newVoiceNotes, setNewVoiceNotes] = useState<FileList | null>(null);

  // For editing main notes
  const [notes, setNotes] = useState("");

  // For photo annotation display
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // ============================================================
  // 1) Load Site Visit
  // ============================================================
  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchSiteVisit(orgId, projectId, subProjectId, siteVisitId);
        setVisit(data);
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

  // ============================================================
  // 2) Update Site Visit (general notes)
  // ============================================================
  async function handleSaveNotes() {
    if (!visit) return;
    try {
      await updateSiteVisit(orgId, projectId, subProjectId, siteVisitId, {
        notes,
      });
      // Reload
      const data = await fetchSiteVisit(orgId, projectId, subProjectId, siteVisitId);
      setVisit(data);
    } catch (err: any) {
      setError(err.message || "Failed to update notes");
    }
  }

  // ============================================================
  // 3) Attach new photos
  // ============================================================
  async function handleAttachNewPhotos() {
    if (!visit || !newPhotos) return;
    try {
      const storage = getStorage();
      const newPhotoData = [...(visit.photos || [])];

      for (let i = 0; i < newPhotos.length; i++) {
        const file = newPhotos[i];
        const fileRef = ref(
          storage,
          `siteVisits/${orgId}/${projectId}/${subProjectId}/${siteVisitId}/photos/${file.name}`
        );
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        newPhotoData.push({
          url: downloadURL,
          annotations: [],
        });
      }

      await updateSiteVisit(orgId, projectId, subProjectId, siteVisitId, {
        photos: newPhotoData,
      });

      setNewPhotos(null);
      // Reload
      const data = await fetchSiteVisit(orgId, projectId, subProjectId, siteVisitId);
      setVisit(data);
    } catch (err: any) {
      setError(err.message || "Failed to attach new photos");
    }
  }

  // ============================================================
  // 4) Attach new voice notes
  // ============================================================
  async function handleAttachNewVoiceNotes() {
    if (!visit || !newVoiceNotes) return;
    try {
      const storage = getStorage();
      const newAudioList = [...(visit.voiceNotes || [])];

      for (let i = 0; i < newVoiceNotes.length; i++) {
        const audio = newVoiceNotes[i];
        const audioRef = ref(
          storage,
          `siteVisits/${orgId}/${projectId}/${subProjectId}/${siteVisitId}/voiceNotes/${audio.name}`
        );
        await uploadBytes(audioRef, audio);
        const downloadURL = await getDownloadURL(audioRef);
        newAudioList.push(downloadURL);
      }

      await updateSiteVisit(orgId, projectId, subProjectId, siteVisitId, {
        voiceNotes: newAudioList,
      });

      setNewVoiceNotes(null);
      // Reload
      const data = await fetchSiteVisit(orgId, projectId, subProjectId, siteVisitId);
      setVisit(data);
    } catch (err: any) {
      setError(err.message || "Failed to attach new voice notes");
    }
  }

  // ============================================================
  // 5) Handle photo annotation changes
  // ============================================================
  // react-picture-annotation's onChange returns an array of annotation objects
  // We'll store them in that photo's "annotations" field in Firestore
  async function handleAnnotationChange(newAnnotation: any) {
    if (selectedPhotoIndex === null || !visit?.photos) return;
    const photoUrl = visit.photos[selectedPhotoIndex].url;

    try {
      await updatePhotoAnnotation(
        orgId,
        projectId,
        subProjectId,
        siteVisitId,
        photoUrl,
        newAnnotation
      );
      // Reload
      const data = await fetchSiteVisit(orgId, projectId, subProjectId, siteVisitId);
      setVisit(data);
    } catch (err: any) {
      setError(err.message || "Failed to update annotation");
    }
  }

  // ============================================================
  // 6) Render
  // ============================================================
  if (loading) {
    return <PageContainer>Loading Site Visit...</PageContainer>;
  }
  if (error) {
    return <PageContainer className="text-red-600">{error}</PageContainer>;
  }
  if (!visit) {
    return <PageContainer>Site Visit not found.</PageContainer>;
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/site-visits`}
          className="text-sm font-medium text-blue-600 underline"
        >
          &larr; Back to Site Visits
        </Link>
      </div>

      <Card>
        <h1 className="text-xl font-semibold mb-1">
          Site Visit: {new Date(visit.visitDate).toLocaleDateString()}
        </h1>
        <p className="text-sm text-neutral-600 mb-4">
          Participants: {visit.participants.join(", ") || "N/A"}
        </p>
        <div className="mt-2">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            className="border p-2 w-full rounded"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mt-2">
            <GrayButton onClick={handleSaveNotes}>Save Notes</GrayButton>
          </div>
        </div>
      </Card>

      {/* Photos */}
      <Card>
        <h2 className="text-lg font-semibold mb-2">Photos</h2>
        {visit.photos && visit.photos.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {visit.photos.map((photo, idx) => (
              <div key={photo.url} className="w-48 h-48 relative border rounded p-1">
                <img
                  src={photo.url}
                  alt="Site visit photo"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setSelectedPhotoIndex(idx)}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-600">No photos yet.</p>
        )}

        <div className="mt-4 text-sm space-y-3">
          <div>
            <label className="block mb-1 font-medium">Add/Upload Photos</label>
            <input
              type="file"
              multiple
              accept="image/*"
              capture="environment"
              onChange={(e) => setNewPhotos(e.target.files)}
              className="file:mr-2 file:py-2 file:px-3 file:border-0 file:rounded file:bg-gray-300 file:text-black hover:file:bg-gray-400"
            />
          </div>
          <GrayButton onClick={handleAttachNewPhotos} disabled={!newPhotos}>
            Upload Photos
          </GrayButton>
        </div>

        {/* Photo annotation modal or panel */}
        {selectedPhotoIndex !== null && visit.photos && (
          <AnnotationOverlay
            photo={visit.photos[selectedPhotoIndex]}
            onClose={() => setSelectedPhotoIndex(null)}
            onSave={(newAnnotations) => handleAnnotationChange(newAnnotations)}
          />
        )}
      </Card>

      {/* Voice Notes */}
      <Card>
        <h2 className="text-lg font-semibold mb-2">Voice Notes</h2>
        {visit.voiceNotes && visit.voiceNotes.length > 0 ? (
          <ul className="space-y-2">
            {visit.voiceNotes.map((audioUrl, index) => (
              <li key={index}>
                <audio controls src={audioUrl} className="w-full" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-600">No voice notes yet.</p>
        )}

        {/* Record new voice note inline (using react-media-recorder) */}
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-1">Record a New Voice Note</h3>
          <ReactMediaRecorder
            audio
            render={({ status, startRecording, stopRecording, mediaBlobUrl }) => (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-neutral-500">Status: {status}</p>
                <div className="flex gap-2">
                  <GrayButton onClick={startRecording}>Start Recording</GrayButton>
                  <GrayButton onClick={stopRecording}>Stop Recording</GrayButton>
                </div>
                {mediaBlobUrl && (
                  <div className="flex flex-col gap-2 mt-2">
                    <audio src={mediaBlobUrl} controls className="w-full" />
                    <GrayButton
                      onClick={async () => {
                        // Upload the recorded audio blob to Firebase
                        const blob = await fetch(mediaBlobUrl).then((r) => r.blob());
                        const file = new File([blob], `voice-note-${Date.now()}.wav`, {
                          type: "audio/wav",
                        });
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        setNewVoiceNotes(dt.files);
                      }}
                    >
                      Save Voice Note
                    </GrayButton>
                  </div>
                )}
              </div>
            )}
          />
        </div>

        {/* Or attach existing audio files */}
        <div className="mt-4">
          <label className="block mb-1 text-sm font-medium">Attach Audio File(s)</label>
          <input
            type="file"
            multiple
            accept="audio/*"
            onChange={(e) => setNewVoiceNotes(e.target.files)}
            className="file:mr-2 file:py-2 file:px-3 file:border-0 file:rounded file:bg-gray-300 file:text-black hover:file:bg-gray-400"
          />
          <div className="mt-2">
            <GrayButton onClick={handleAttachNewVoiceNotes} disabled={!newVoiceNotes}>
              Upload Voice Note(s)
            </GrayButton>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}

/**
 * Simple modal/popup for annotation
 */
function AnnotationOverlay({
  photo,
  onClose,
  onSave,
}: {
  photo: { url: string; annotations?: any };
  onClose: () => void;
  onSave: (newAnnotations: any) => void;
}) {
  // We'll store annotation state locally, so we can "cancel" if needed
  const [annotationData, setAnnotationData] = useState<any>(photo.annotations || []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-3xl w-full h-[80vh] p-4 relative overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-2">Annotate Photo</h2>
        <ReactPictureAnnotation
          image={photo.url}
          width={600}
          height={400}
          annotationData={annotationData}
          onChange={(data) => setAnnotationData(data)}
          onSelect={() => {}}
          selectedId={null}
        />
        <div className="mt-4 flex gap-2">
          <GrayButton onClick={() => onClose()}>Cancel</GrayButton>
          <GrayButton
            onClick={() => {
              onSave(annotationData);
              onClose();
            }}
          >
            Save Annotation
          </GrayButton>
        </div>
      </div>
    </div>
  );
}
