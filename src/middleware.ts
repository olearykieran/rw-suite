import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Define the pattern for the research page path
  const researchPathPattern =
    /\/dashboard\/organizations\/[^/]+\/projects\/[^/]+\/subprojects\/[^/]+\/research/;

  // Also allow access to the preview-image API endpoint
  const isPreviewImageApi = request.nextUrl.pathname === "/api/preview-image";

  // Check if the current path is the research page or preview-image API
  const isPublicPath =
    researchPathPattern.test(request.nextUrl.pathname) || isPreviewImageApi;

  // Allow access to public paths without authentication
  if (isPublicPath) {
    return NextResponse.next();
  }

  // For all other dashboard routes, check authentication
  // Get the token from cookies
  const token = request.cookies.get("auth-token")?.value;

  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Continue to the protected route
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: ["/dashboard/:path*", "/api/preview-image"],
};
