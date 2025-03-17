import { ReactNode } from "react";

/**
 * Simple layout for the public research page
 * No authentication required
 */
export default function PublicResearchLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {children}
    </div>
  );
}
