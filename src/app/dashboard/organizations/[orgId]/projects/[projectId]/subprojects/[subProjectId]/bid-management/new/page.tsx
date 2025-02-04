"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";

// Import the custom hook for fetching projects
import { useProjects } from "@/hooks/useProjects";

interface Contractor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

/**
 * NewBidSubmissionPage
 * - Displays a form to capture bid submission details.
 * - Saves the submission under the subproject's "bidSubmissions" subcollection.
 * - Redirects the user to the Bid Management page on success.
 */
export default function NewBidSubmissionPage() {
  // Get orgId, projectId, and subProjectId from the URL
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();

  // Get user profile info
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();

  // Use custom hook to fetch projects
  const { projects, loading: projectsLoading, error: projectsError } = useProjects(orgId);

  // State for contractors
  const [contractors, setContractors] = useState<Contractor[]>([]);

  // Form fields for bid submission
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [bidDueDate, setBidDueDate] = useState(""); // datetime-local string
  const [submissionMethod, setSubmissionMethod] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [questionDeadline, setQuestionDeadline] = useState("");
  // Contractor selection: dropdown with an "Other" option.
  const [selectedContractor, setSelectedContractor] = useState("");
  const [isNewContractor, setIsNewContractor] = useState(false);
  const [newContractor, setNewContractor] = useState("");
  // Extra fields for a new contractor:
  const [newContractorEmail, setNewContractorEmail] = useState("");
  const [newContractorPhone, setNewContractorPhone] = useState("");
  // Issuer info fields (auto-populated from profile)
  const [issuerName, setIssuerName] = useState("");
  const [issuerTitle, setIssuerTitle] = useState("");
  const [issuerCompany, setIssuerCompany] = useState("");
  const [issuerPhone, setIssuerPhone] = useState("");
  const [issuerEmail, setIssuerEmail] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // Fetch contractors from Firestore for this organization
  useEffect(() => {
    async function fetchContractors() {
      try {
        const contractorsRef = collection(
          firestore,
          "organizations",
          orgId,
          "contractors"
        );
        const snapshot = await getDocs(contractorsRef);
        const contractorsList: Contractor[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email,
          phone: doc.data().phone,
        }));
        setContractors(contractorsList);
      } catch (err) {
        console.error("Failed to fetch contractors:", err);
      }
    }
    if (orgId) {
      fetchContractors();
    }
  }, [orgId]);

  // Populate issuer info from user profile when available
  useEffect(() => {
    if (profile) {
      setIssuerName(profile.issuerName || "");
      setIssuerTitle(profile.issuerTitle || "");
      setIssuerCompany(profile.issuerCompany || "");
      setIssuerPhone(profile.issuerPhone || "");
      setIssuerEmail(profile.issuerEmail || "");
      setSubmissionMethod(profile.submissionMethod || "");
    }
  }, [profile]);

  // When a project is selected (via dropdown) update the project name and location fields
  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedId = e.target.value;
    setSelectedProjectId(selectedId);
    const project = projects.find((p) => p.id === selectedId);
    if (project) {
      setProjectName(project.name);
      setProjectLocation(project.location);
    } else {
      setProjectName("");
      setProjectLocation("");
    }
  }

  // NEW: When the selectedProjectId or projects change, update projectName and projectLocation
  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const project = projects.find((p) => p.id === selectedProjectId);
      if (project) {
        setProjectName(project.name);
        setProjectLocation(project.location);
      }
    }
  }, [selectedProjectId, projects]);

  // Handle contractor selection; if "other" is selected, show input for new contractor.
  function handleContractorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value;
    if (selected === "other") {
      setIsNewContractor(true);
      setSelectedContractor("");
    } else {
      setIsNewContractor(false);
      setSelectedContractor(selected);
    }
  }

  // Helper: Add a new contractor to Firestore with additional details
  async function addNewContractor(name: string, email: string, phone: string) {
    try {
      const contractorsRef = collection(firestore, "organizations", orgId, "contractors");
      const docRef = await addDoc(contractorsRef, {
        name,
        email,
        phone,
        createdAt: serverTimestamp(),
      });
      setContractors((prev) => [...prev, { id: docRef.id, name, email, phone }]);
    } catch (err) {
      console.error("Failed to add new contractor:", err);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Determine contractor name: if "other" is selected, use the new contractor value
    let contractorName = "";
    if (isNewContractor) {
      contractorName = newContractor.trim();
      if (contractorName) {
        const exists = contractors.find(
          (c) => c.name.toLowerCase() === contractorName.toLowerCase()
        );
        if (!exists) {
          await addNewContractor(
            contractorName,
            newContractorEmail.trim(),
            newContractorPhone.trim()
          );
        }
      }
    } else {
      contractorName = selectedContractor;
    }

    // Build the bid submission data object
    const submissionData = {
      projectName,
      projectLocation,
      contractorName,
      bidDueDate,
      submissionMethod,
      contactPhone,
      contactEmail,
      questionDeadline,
      issuerName,
      issuerTitle,
      issuerCompany,
      issuerPhone,
      issuerEmail,
      additionalInstructions,
      logoUrl:
        "https://firebasestorage.googleapis.com/v0/b/rw-project-management.firebasestorage.app/o/rw-logo-title.png?alt=media&token=03a42c6c-980c-4857-ae0d-f84c37baa2fe",
    };

    // Save the bid submission data to Firestore under the subproject's "bidSubmissions" subcollection
    try {
      if (!selectedProjectId) {
        throw new Error(
          "No project selected. Please select a project to submit your bid."
        );
      }
      const bidSubmissionRef = collection(
        firestore,
        "organizations",
        orgId,
        "projects",
        selectedProjectId,
        "subprojects",
        subProjectId,
        "bidSubmissions"
      );
      await addDoc(bidSubmissionRef, {
        ...submissionData,
        createdAt: serverTimestamp(),
      });
      console.log("Bid submission saved successfully.");
      // Redirect to the Bid Management listing page for this subproject
      router.push(
        `/dashboard/organizations/${orgId}/projects/${selectedProjectId}/subprojects/${subProjectId}/bid-management`
      );
    } catch (err: any) {
      console.error("Error saving bid submission:", err);
    }
  }

  return (
    <PageContainer>
      <Card>
        <h1 className="text-2xl font-bold mb-4">New Bid Submission</h1>
        {profileLoading && <p className="text-sm">Loading profile info…</p>}
        {profileError && <p className="text-sm text-red-500">{profileError}</p>}
        {projectsLoading && <p className="text-sm">Loading projects…</p>}
        {projectsError && <p className="text-sm text-red-500">{projectsError}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Details Dropdown */}
          <div>
            <label className="block text-sm font-medium">Select Project</label>
            <select
              value={selectedProjectId}
              onChange={handleProjectChange}
              className="border p-2 w-full text-black rounded"
            >
              <option value="">-- Select a Project --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          {/* Project Location auto-populated */}
          <div>
            <label className="block text-sm font-medium">Project Location</label>
            <input
              type="text"
              className="border p-2 w-full text-black rounded"
              value={projectLocation}
              onChange={(e) => setProjectLocation(e.target.value)}
              placeholder="Project location"
            />
          </div>
          {/* Contractor Dropdown */}
          <div>
            <label className="block text-sm font-medium">
              Select Contractor / Company Name
            </label>
            <select
              value={isNewContractor ? "other" : selectedContractor}
              onChange={handleContractorChange}
              className="border p-2 w-full text-black rounded"
            >
              <option value="">-- Select a Contractor --</option>
              {contractors.map((contractor) => (
                <option key={contractor.id} value={contractor.name}>
                  {contractor.name}
                </option>
              ))}
              <option value="other">Other (Add New)</option>
            </select>
          </div>
          {/* New contractor details if "Other" is selected */}
          {isNewContractor && (
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium">New Contractor Name</label>
                <input
                  type="text"
                  className="border p-2 w-full text-black rounded"
                  value={newContractor}
                  onChange={(e) => setNewContractor(e.target.value)}
                  placeholder="Enter new contractor name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">New Contractor Email</label>
                <input
                  type="email"
                  className="border p-2 w-full text-black rounded"
                  value={newContractorEmail}
                  onChange={(e) => setNewContractorEmail(e.target.value)}
                  placeholder="Enter contractor email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">New Contractor Phone</label>
                <input
                  type="text"
                  className="border p-2 w-full text-black rounded"
                  value={newContractorPhone}
                  onChange={(e) => setNewContractorPhone(e.target.value)}
                  placeholder="Enter contractor phone number"
                />
              </div>
            </div>
          )}
          {/* Bid Due Date */}
          <div>
            <label className="block text-sm font-medium">Bid Due Date</label>
            <input
              type="datetime-local"
              className="border p-2 w-full text-black rounded"
              value={bidDueDate}
              onChange={(e) => setBidDueDate(e.target.value)}
            />
          </div>
          {/* Submission Method */}
          <div>
            <label className="block text-sm font-medium">Submission Method</label>
            <input
              type="text"
              className="border p-2 w-full text-black rounded"
              value={submissionMethod}
              onChange={(e) => setSubmissionMethod(e.target.value)}
              placeholder="e.g., Email: bids@example.com or Online: http://..."
            />
          </div>
          {/* Questions Contact */}
          <div>
            <label className="block text-sm font-medium">
              Contact Phone (for questions)
            </label>
            <input
              type="text"
              className="border p-2 w-full text-black rounded"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Enter contact phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Contact Email (for questions)
            </label>
            <input
              type="email"
              className="border p-2 w-full text-black rounded"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Enter contact email address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Question Deadline</label>
            <input
              type="date"
              className="border p-2 w-full text-black rounded"
              value={questionDeadline}
              onChange={(e) => setQuestionDeadline(e.target.value)}
            />
          </div>
          {/* Issuer Details – auto-populated from user profile */}
          <div>
            <label className="block text-sm font-medium">Your Name</label>
            <input
              type="text"
              className="border p-2 w-full text-black rounded"
              value={issuerName}
              onChange={(e) => setIssuerName(e.target.value)}
              placeholder="Your Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Your Title</label>
            <input
              type="text"
              className="border p-2 w-full text-black rounded"
              value={issuerTitle}
              onChange={(e) => setIssuerTitle(e.target.value)}
              placeholder="Your Title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Your Company</label>
            <input
              type="text"
              className="border p-2 w-full text-black rounded"
              value={issuerCompany}
              onChange={(e) => setIssuerCompany(e.target.value)}
              placeholder="Your Company"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Your Phone Number</label>
            <input
              type="text"
              className="border p-2 w-full text-black rounded"
              value={issuerPhone}
              onChange={(e) => setIssuerPhone(e.target.value)}
              placeholder="Your Phone Number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Your Email Address</label>
            <input
              type="email"
              className="border p-2 w-full text-black rounded"
              value={issuerEmail}
              onChange={(e) => setIssuerEmail(e.target.value)}
              placeholder="Your Email Address"
            />
          </div>
          {/* Additional Instructions */}
          <div>
            <label className="block text-sm font-medium">
              Additional Instructions (optional)
            </label>
            <textarea
              rows={3}
              className="border p-2 w-full text-black rounded"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="Enter any additional bid instructions"
            />
          </div>
          <div className="flex justify-end gap-4">
            <GrayButton type="submit">Save Bid Submission</GrayButton>
            <GrayButton type="button" onClick={() => router.back()}>
              Cancel
            </GrayButton>
          </div>
        </form>
      </Card>
    </PageContainer>
  );
}
