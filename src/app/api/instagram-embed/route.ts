// src/app/api/instagram-embed/route.ts
import { NextRequest, NextResponse } from "next/server";

// Configure Edge runtime
export const runtime = "edge";

// Simple in-memory cache with 24-hour expiration
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  console.log("Instagram-embed API called");
  const url = new URL(req.url);
  const params = url.searchParams;
  const instagramUrl = params.get("url");
  const proxyImage = params.get("proxyImage");

  // Handle image proxy request
  if (proxyImage) {
    console.log("Instagram-embed API: Proxying image", proxyImage);
    try {
      const response = await fetch(proxyImage, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Referer: "https://www.instagram.com/",
          Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        return NextResponse.json({ error: "Failed to fetch image" }, { status: 404 });
      }

      // Get the image data as array buffer
      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/jpeg";

      console.log("Instagram-embed API: Successfully proxied image", {
        contentType,
        size: imageBuffer.byteLength,
      });

      // Return the image with appropriate headers
      return new NextResponse(Buffer.from(imageBuffer), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error(
        `Error proxying image: ${error instanceof Error ? error.message : String(error)}`
      );
      return NextResponse.json({ error: "Failed to proxy image" }, { status: 500 });
    }
  }

  // Handle Instagram URL info request
  if (!instagramUrl) {
    console.log("Instagram-embed API: No URL provided");
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  console.log("Instagram-embed API: Processing URL", instagramUrl);
  try {
    // Check cache first
    const cached = cache[instagramUrl];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("Instagram-embed API: Returning cached result");
      return NextResponse.json(cached.data);
    }

    // Extract Instagram post ID
    const postId = extractInstagramPostId(instagramUrl);
    if (!postId) {
      console.log("Instagram-embed API: Invalid Instagram URL");
      return NextResponse.json({ error: "Invalid Instagram URL" }, { status: 400 });
    }

    // Generate a thumbnail URL based on the post ID
    const thumbnailUrl = `https://instagram.com/p/${postId}/media/?size=l`;
    console.log("Instagram-embed API: Generated thumbnail URL", thumbnailUrl);

    // Create a proxied URL that will go through our server
    const proxyUrl = `/api/instagram-embed?proxyImage=${encodeURIComponent(
      thumbnailUrl
    )}`;

    // Create a response with the thumbnail URL
    const responseData = {
      thumbnail_url: proxyUrl,
      provider_name: "Instagram",
      post_id: postId,
    };

    // Update cache
    cache[instagramUrl] = {
      data: responseData,
      timestamp: Date.now(),
    };

    console.log("Instagram-embed API: Returning response with proxy URL");
    return NextResponse.json(responseData);
  } catch (error) {
    console.error(
      `Error fetching Instagram embed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    // Even if there's an error, try to return a direct URL as fallback
    const postId = extractInstagramPostId(instagramUrl);
    if (postId) {
      console.log("Instagram-embed API: Using fallback approach with post ID", postId);
      const thumbnailUrl = `https://instagram.com/p/${postId}/media/?size=l`;
      const proxyUrl = `/api/instagram-embed?proxyImage=${encodeURIComponent(
        thumbnailUrl
      )}`;

      return NextResponse.json({
        thumbnail_url: proxyUrl,
        provider_name: "Instagram",
        post_id: postId,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch Instagram embed" },
      { status: 500 }
    );
  }
}

// Helper function to extract Instagram post ID
function extractInstagramPostId(url: string): string | null {
  try {
    const regex = /instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/;
    const match = url.match(regex);

    if (match && match[2]) {
      return match[2];
    }
    return null;
  } catch {
    return null;
  }
}
