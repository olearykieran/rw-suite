"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ReactWebcam from "react-webcam";
import { ReactMediaRecorder } from "react-media-recorder";
import { v4 as uuidv4 } from "uuid";
import { Dialog, Transition } from "@headlessui/react";
import { ReactSketchCanvas } from "react-sketch-canvas";

import {
  fetchSiteVisit,
  updateSiteVisit,
  ExtendedSiteVisitDoc,
  SiteVisitEntry,
} from "@/lib/services/SiteVisitService";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

// --------------------------------------------------------------------
// Types
// --------------------------------------------------------------------

// Represents a captured media item (either a photo or a video)
// Now includes an optional annotation property.
interface CapturedMedia {
  id: string;
  type: "photo" | "video";
  src: string;
  annotation?: Annotation;
}

// Annotation interface (for storing annotation data)
interface Annotation {
  id: string;
  paths: any[];
  comment?: string;
}

// --------------------------------------------------------------------
// AnnotationModal Component
// A modal to annotate a given photo.
// Uses ReactSketchCanvas over the photo and provides Save/Cancel buttons.
// --------------------------------------------------------------------
function AnnotationModal({
  isOpen,
  onClose,
  photo,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  photo: CapturedMedia;
  onSave: (annotation: Annotation) => void;
}) {
  const canvasRef = useRef<any>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    console.log("AnnotationModal mounted", { isOpen, photo });
  }, [isOpen, photo]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-70" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left shadow-xl transition-all">
                <Dialog.Title className="text-2xl font-bold text-black dark:text-white mb-4">
                  Annotate Photo
                </Dialog.Title>
                <div
                  className="relative border rounded overflow-hidden bg-gray-100 dark:bg-gray-700"
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
                    src={photo.src}
                    alt="Photo to annotate"
                    className="max-w-full max-h-full object-contain"
                    onLoad={() => {
                      console.log("Annotation image loaded");
                      setImageLoaded(true);
                    }}
                    // Prevent the image from capturing pointer events so the canvas can receive them.
                    style={{ pointerEvents: "none" }}
                  />
                  {imageLoaded && (
                    <div className="absolute inset-0">
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
                <div className="mt-4 flex justify-end gap-4">
                  <GrayButton onClick={onClose}>Cancel</GrayButton>
                  <GrayButton
                    onClick={async () => {
                      if (canvasRef.current) {
                        const paths = await canvasRef.current.exportPaths();
                        console.log("Exported paths:", paths);
                        if (!paths || paths.length === 0) {
                          alert(
                            "No annotation found. Please draw on the image before saving."
                          );
                          return;
                        }
                        const newAnnotation: Annotation = {
                          id: uuidv4(),
                          paths,
                        };
                        onSave(newAnnotation);
                        onClose();
                      }
                    }}
                  >
                    Save Annotation
                  </GrayButton>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// --------------------------------------------------------------------
// NewEntryModal Component with Company Cam–like Camera UI
// --------------------------------------------------------------------
function NewEntryModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (entry: SiteVisitEntry) => void;
}) {
  // State for the entry note
  const [entryNote, setEntryNote] = useState("");

  // State for captured media (photos/videos)
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia[]>([]);

  // State for voice notes (URLs from Firebase after upload)
  const [voiceNotes, setVoiceNotes] = useState<string[]>([]);

  // State to control the current capture mode ("photo" or "video")
  const [captureMode, setCaptureMode] = useState<"photo" | "video">("photo");

  // State to control video recording status (only relevant in video mode)
  const [isRecording, setIsRecording] = useState(false);

  // State for controlling the full‑screen media review modal
  const [isMediaReviewOpen, setIsMediaReviewOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<CapturedMedia | null>(null);

  // State for controlling the annotation modal
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
  const [annotationModalMedia, setAnnotationModalMedia] = useState<CapturedMedia | null>(
    null
  );

  // Refs for the camera components
  const webcamRef = useRef<any>(null);

  // Firebase storage instance
  const storage = getStorage();

  // Capture a photo using react-webcam and add it to capturedMedia.
  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        const newMedia: CapturedMedia = {
          id: uuidv4(),
          type: "photo",
          src: imageSrc,
        };
        console.log("Captured photo:", newMedia);
        setCapturedMedia((prev) => [...prev, newMedia]);
      }
    }
  };

  // Upload a File to Firebase Storage and return its download URL.
  async function uploadFile(file: File, folder: string): Promise<string> {
    const uniqueName = `${uuidv4()}-${file.name}`;
    const fileRef = ref(storage, `${folder}/${uniqueName}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }

  // Handle saving the entry:
  //   - Upload captured photos (base64 images are converted to File objects)
  //   - Use video URLs directly (or re-upload if needed)
  //   - Attach any voice notes recorded
  async function handleSaveEntry() {
    try {
      const photoData: { url: string; annotations?: Annotation[] }[] = [];
      for (const media of capturedMedia) {
        if (media.type === "photo") {
          const res = await fetch(media.src);
          const blob = await res.blob();
          const file = new File([blob], `photo-${Date.now()}.png`, { type: blob.type });
          const url = await uploadFile(file, "siteVisitPhotos");
          photoData.push({
            url,
            annotations: media.annotation ? [media.annotation] : [],
          });
        } else if (media.type === "video") {
          // For video, use the URL returned from ReactMediaRecorder.
          photoData.push({ url: media.src });
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
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black bg-opacity-70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-t-lg p-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Entry Note Section */}
        <div className="mb-4">
          <label className="block font-medium mb-1 text-black dark:text-white">
            Entry Note
          </label>
          <textarea
            className="w-full border p-2 rounded text-black dark:text-white dark:bg-gray-700"
            rows={3}
            value={entryNote}
            onChange={(e) => setEntryNote(e.target.value)}
            placeholder="Enter your notes for this entry..."
          />
        </div>

        {/* Camera Preview Section */}
        <div className="mb-4">
          <ReactWebcam
            audio={captureMode === "video"}
            ref={webcamRef}
            screenshotFormat="image/png"
            className="w-full rounded"
          />
        </div>

        {/* Bottom Navigation Bar */}
        <div className="flex items-center justify-between">
          {/* Left: Thumbnail of the last captured media */}
          <div className="w-16 h-16">
            {capturedMedia.length > 0 ? (
              <img
                src={capturedMedia[capturedMedia.length - 1].src}
                alt="Last captured"
                className="w-full h-full object-cover rounded cursor-pointer"
                onClick={() => {
                  console.log(
                    "Opening media review for:",
                    capturedMedia[capturedMedia.length - 1]
                  );
                  setSelectedMedia(capturedMedia[capturedMedia.length - 1]);
                  setIsMediaReviewOpen(true);
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-300 dark:bg-gray-600 rounded" />
            )}
          </div>

          {/* Center: Capture Button */}
          <div>
            {captureMode === "photo" ? (
              <GrayButton onClick={capturePhoto}>Capture Photo</GrayButton>
            ) : (
              <ReactMediaRecorder
                video
                audio
                render={({ startRecording, stopRecording, mediaBlobUrl }) => (
                  <div className="flex flex-col items-center">
                    {!isRecording ? (
                      <GrayButton
                        onClick={() => {
                          setIsRecording(true);
                          startRecording();
                        }}
                      >
                        Start Video
                      </GrayButton>
                    ) : (
                      <GrayButton
                        onClick={() => {
                          setIsRecording(false);
                          stopRecording();
                        }}
                      >
                        Stop Video
                      </GrayButton>
                    )}
                    {mediaBlobUrl && !isRecording && (
                      <GrayButton
                        onClick={() => {
                          const newMedia: CapturedMedia = {
                            id: uuidv4(),
                            type: "video",
                            src: mediaBlobUrl,
                          };
                          setCapturedMedia((prev) => [...prev, newMedia]);
                        }}
                        className="mt-2"
                      >
                        Save Video
                      </GrayButton>
                    )}
                  </div>
                )}
              />
            )}
          </div>

          {/* Right: Voice Note Button */}
          <div>
            <ReactMediaRecorder
              audio
              render={({ startRecording, stopRecording, mediaBlobUrl, status }) => (
                <div className="flex flex-col items-center">
                  {!mediaBlobUrl ? (
                    <GrayButton onClick={startRecording}>Record Voice</GrayButton>
                  ) : (
                    <GrayButton
                      onClick={async () => {
                        const blob = await fetch(mediaBlobUrl).then((r) => r.blob());
                        const file = new File([blob], `voice-note-${Date.now()}.wav`, {
                          type: "audio/wav",
                        });
                        const url = await uploadFile(file, "siteVisitVoiceNotes");
                        setVoiceNotes((prev) => [...prev, url]);
                      }}
                    >
                      Save Voice Note
                    </GrayButton>
                  )}
                </div>
              )}
            />
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mt-4">
          <GrayButton
            onClick={() => setCaptureMode("photo")}
            className={`${captureMode === "photo" ? "bg-blue-600" : ""} mr-2`}
          >
            Photo
          </GrayButton>
          <GrayButton
            onClick={() => setCaptureMode("video")}
            className={`${captureMode === "video" ? "bg-blue-600" : ""}`}
          >
            Video
          </GrayButton>
        </div>

        {/* Full-Screen Media Review Modal */}
        <Transition appear show={isMediaReviewOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setIsMediaReviewOpen(false)}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-70" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-200"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-150"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left shadow-xl transition-all">
                    <Dialog.Title className="text-2xl font-bold text-black dark:text-white mb-4">
                      Review Captured Media
                    </Dialog.Title>
                    <div className="grid grid-cols-1 gap-4">
                      {capturedMedia.map((media) => (
                        <div key={media.id} className="flex flex-col items-center">
                          {media.type === "photo" ? (
                            <img
                              src={media.src}
                              alt="Captured"
                              className="w-full max-h-96 object-contain rounded"
                            />
                          ) : (
                            <video
                              src={media.src}
                              controls
                              className="w-full max-h-96 rounded"
                            />
                          )}
                          {media.type === "photo" && (
                            <GrayButton
                              onClick={() => {
                                console.log("Opening annotation modal for media:", media);
                                // Close the media review modal before opening annotation modal
                                setIsMediaReviewOpen(false);
                                setAnnotationModalMedia(media);
                                setIsAnnotationModalOpen(true);
                              }}
                              className="mt-2"
                            >
                              Annotate
                            </GrayButton>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <GrayButton onClick={() => setIsMediaReviewOpen(false)}>
                        Close
                      </GrayButton>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Annotation Modal */}
        {isAnnotationModalOpen && annotationModalMedia && (
          <AnnotationModal
            isOpen={isAnnotationModalOpen}
            onClose={() => {
              console.log("Annotation modal closed");
              setIsAnnotationModalOpen(false);
            }}
            photo={annotationModalMedia}
            onSave={(annotation: Annotation) => {
              console.log("Annotation saved:", annotation);
              // Update the annotation property for the selected media
              setCapturedMedia((prev) =>
                prev.map((media) =>
                  media.id === annotationModalMedia.id ? { ...media, annotation } : media
                )
              );
            }}
          />
        )}

        {/* Save Entry Button */}
        <div className="flex justify-end mt-4">
          <GrayButton onClick={handleSaveEntry}>Save Entry</GrayButton>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Main SiteVisitDetailPage Component
// --------------------------------------------------------------------
export default function SiteVisitDetailPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId, siteVisitId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    siteVisitId: string;
  };

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
        <h1 className="text-2xl font-bold mb-1 text-black dark:text-white">
          Site Visit: {new Date(visit.visitDate).toLocaleDateString()}
        </h1>
        <p className="mb-2 text-black dark:text-white">
          Participants: {visit.participants.join(", ") || "N/A"}
        </p>
        <div>
          <label className="block font-medium mb-1 text-black dark:text-white">
            Main Notes
          </label>
          <textarea
            className="border p-2 w-full rounded text-black dark:text-white dark:bg-gray-700"
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
                <p className="text-black dark:text-white">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
                {entry.note && (
                  <p className="mt-2 text-black dark:text-white">{entry.note}</p>
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
            <p className="text-black dark:text-white">
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
