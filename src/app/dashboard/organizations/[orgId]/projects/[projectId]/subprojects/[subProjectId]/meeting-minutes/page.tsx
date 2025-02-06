"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchAllMeetings,
  MeetingMinutesDoc,
  deleteMeeting,
} from "@/lib/services/MeetingMinutesService";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import Link from "next/link";

/**
 * MeetingMinutesListPage
 * Lists all the meeting minutes for the subProject
 * Similar style to the Site Visits main page
 */
export default function MeetingMinutesListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();

  const [meetings, setMeetings] = useState<MeetingMinutesDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMeetings() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        const data = await fetchAllMeetings(orgId, projectId, subProjectId);

        // Example: sort by date desc
        const sorted = data.sort((a, b) => {
          const aDate = a.date ? new Date(a.date).getTime() : 0;
          const bDate = b.date ? new Date(b.date).getTime() : 0;
          return bDate - aDate; // descending
        });
        setMeetings(sorted);
      } catch (err: any) {
        setError("Failed to load Meeting Minutes");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadMeetings();
  }, [orgId, projectId, subProjectId]);

  async function handleDelete(meetingId: string) {
    try {
      await deleteMeeting(orgId, projectId, subProjectId, meetingId);
      // remove locally
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
    } catch (err) {
      console.error("Delete meeting error:", err);
      setError("Failed to delete meeting");
    }
  }

  if (loading) {
    return <PageContainer>Loading meeting minutes...</PageContainer>;
  }

  if (error) {
    return <PageContainer>{error}</PageContainer>;
  }

  return (
    <PageContainer>
      {/* Top controls: Back button + Create new */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() =>
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
            )
          }
          className="bg-gray-300 text-black hover:bg-gray-400 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 px-4 py-2 rounded-xl "
        >
          &larr; Back
        </button>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes/new`}
        >
          <GrayButton>Create New Meeting</GrayButton>
        </Link>
      </div>

      <Card>
        <h1 className="text-xl font-semibold mb-2">Meeting Minutes</h1>
        {meetings.length === 0 ? (
          <p className=" text-neutral-600">No meeting minutes found.</p>
        ) : (
          <div className="space-y-3">
            {meetings.map((meet) => {
              // convert date to short string
              const meetDate = meet.date
                ? new Date(meet.date).toLocaleDateString()
                : "No date";

              // short snippet of attendees
              const attendeeSnippet =
                meet.attendees && meet.attendees.length > 0
                  ? meet.attendees.map((a) => a.name || "").join(", ")
                  : "No attendees";

              return (
                <div
                  key={meet.id}
                  className="p-2 border-b last:border-none hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{meetDate}</p>
                      <p className=" text-neutral-600">
                        Title: {meet.title || "Untitled"}
                      </p>
                      <p className=" text-neutral-600">Attendees: {attendeeSnippet}</p>
                    </div>
                    <div className="flex gap-2">
                      <GrayButton
                        onClick={() =>
                          router.push(
                            `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes/${meet.id}`
                          )
                        }
                      >
                        View
                      </GrayButton>
                      <GrayButton
                        onClick={() => handleDelete(meet.id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Delete
                      </GrayButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
