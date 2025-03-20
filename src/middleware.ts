import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  console.log("Middleware called for path:", request.nextUrl.pathname);

  // Define public paths that don't require authentication
  const publicPaths = [
    // Public API endpoints
    "/api/preview-image",
    "/api/instagram-embed",
    "/api/public/research",
    "/api/public/analytics",
    "/api/public/ticket-sales-report",
    // Public pages
    "/public/research",
    "/public/ticket-sales-report",
  ];

  // Check if the current path is a public API path
  const isApiPath = request.nextUrl.pathname.startsWith("/api/");

  // If this is an API request, let it through without any additional checking
  if (isApiPath) {
    console.log("Middleware: API request, allowing access");
    return NextResponse.next();
  }

  // Check if the current path is a public path
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Check if this is a research page within the dashboard
  const isResearchPage =
    request.nextUrl.pathname.includes("/research") &&
    request.nextUrl.pathname.includes("/subprojects/");

  // Check if this is an analytics page within the dashboard
  const isAnalyticsPage =
    request.nextUrl.pathname.includes("/analytics") &&
    request.nextUrl.pathname.includes("/subprojects/");

  // Check if this is a ticket sales report page within the dashboard
  const isTicketSalesReportPage =
    request.nextUrl.pathname.includes("/ticket-sales-report") &&
    request.nextUrl.pathname.includes("/subprojects/");

  console.log("Middleware check:", {
    path: request.nextUrl.pathname,
    isPublicPath,
    isResearchPage,
    isAnalyticsPage,
    isTicketSalesReportPage,
    isApiPath,
  });

  // Allow access to public paths, research pages, analytics pages, or ticket sales report pages without authentication
  if (isPublicPath || isResearchPage || isAnalyticsPage || isTicketSalesReportPage) {
    console.log("Middleware: Allowing access without authentication");
    return NextResponse.next();
  }

  // For all other dashboard routes, check authentication
  const token = request.cookies.get("auth-token")?.value;

  // If no token is found and we're trying to access a protected route, redirect to sign-in
  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    console.log("Middleware: No token found, redirecting to sign-in");
    const signInUrl = new URL("/public/auth/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Continue to the protected route
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/public/research/:path*",
    "/public/ticket-sales-report/:path*",
  ],
};
