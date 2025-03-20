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
    // Authentication pages
    "/public/auth/sign-in",
    "/public/auth/sign-up",
    "/public",
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

  // For dashboard routes, let the client-side authentication handle it
  // Firebase auth state is managed client-side, so we'll let the components handle auth checks
  console.log("Middleware: Allowing access to protected route, client will handle auth");
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/public/research/:path*",
    "/public/ticket-sales-report/:path*",
    "/public/auth/:path*",
  ],
};
