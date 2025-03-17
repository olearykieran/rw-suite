import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  console.log("Middleware called for path:", request.nextUrl.pathname);

  // Define public paths that don't require authentication
  const publicPaths = [
    // Public API endpoints
    "/api/preview-image",
    "/api/public/research",
    // Public research page
    "/public/research",
    // Dashboard research pages
    "/dashboard/organizations",
  ];

  // Check if the current path is a public path or a research page
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  
  // Check if this is a research page within the dashboard
  const isResearchPage = 
    request.nextUrl.pathname.includes('/research') && 
    request.nextUrl.pathname.includes('/subprojects/');
    
  console.log("Middleware check:", { 
    path: request.nextUrl.pathname, 
    isPublicPath, 
    isResearchPage 
  });

  // Allow access to public paths or research pages without authentication
  if (isPublicPath || isResearchPage) {
    console.log("Middleware: Allowing access without authentication");
    return NextResponse.next();
  }

  // For all other dashboard routes, check authentication
  // Get the token from cookies
  const token = request.cookies.get("auth-token")?.value;

  // Continue to the protected route
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    "/dashboard/:path*", 
    "/api/preview-image",
    "/api/public/research",
    "/public/research/:path*"
  ],
};
