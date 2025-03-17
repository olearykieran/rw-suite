/**
 * Utility functions for generating public links
 */

/**
 * Generate a public research link for sharing
 * 
 * @param orgId - Organization ID
 * @param projectId - Project ID
 * @param subProjectId - Sub-Project ID
 * @returns Full URL to the public research page
 */
export function generatePublicResearchLink(
  orgId: string,
  projectId: string,
  subProjectId: string
): string {
  // Get the base URL from the window location in client-side code
  // or use a default for server-side rendering
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
  return `${baseUrl}/public/research/${orgId}/${projectId}/${subProjectId}`;
}
