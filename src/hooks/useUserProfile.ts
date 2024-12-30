import { useEffect, useState } from "react";
import { auth, firestore } from "@/lib/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

interface UserProfile {
  displayName: string;
  role?: string;
  // Additional fields you store in user doc
}

export function useUserProfile() {
  const [firebaseUser] = useAuthState(auth); // from react-firebase-hooks
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firebaseUser) {
      // not signed in
      setProfile(null);
      setLoading(false);
      return;
    }

    const docRef = doc(firestore, "users", firebaseUser.uid);
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("useUserProfile snapshot error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [firebaseUser]);

  return { profile, loading, error };
}
