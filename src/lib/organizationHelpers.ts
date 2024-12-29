// src/lib/organizationHelpers.ts

import { firestore } from "./firebaseConfig";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

export type Role = "owner" | "pm" | "sub" | "vendor" | "readonly";

/**
 * createOrganizationAndMembership
 * Creates a new org doc and membership doc in one Firestore transaction.
 */
export async function createOrganizationAndMembership(
  uid: string,
  orgId: string,
  role: Role,
  orgName: string
): Promise<void> {
  const orgRef = doc(firestore, "organizations", orgId);
  const memRef = doc(firestore, "organizations", orgId, "members", uid);

  await runTransaction(firestore, async (transaction) => {
    const orgSnap = await transaction.get(orgRef);
    if (orgSnap.exists()) {
      throw new Error(`Organization ID "${orgId}" is already taken.`);
    }

    // 1) Create org doc
    transaction.set(orgRef, {
      name: orgName,
      ownerUid: uid,
      createdAt: serverTimestamp(),
    });

    // 2) Create membership doc
    transaction.set(memRef, {
      role,
      joinedAt: serverTimestamp(),
    });
  });
}
