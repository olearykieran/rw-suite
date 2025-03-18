// src/app/api/instagram-embed/route.ts
import { NextRequest, NextResponse } from "next/server";
import fetch from "node-fetch";

// Simple in-memory cache
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const instagramUrl = params.get("url");
  const proxyImage = params.get("proxyImage");

  // If proxyImage parameter is present, proxy the image
  if (proxyImage) {
    try {
      const response = await fetch(proxyImage, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Referer: "https://www.instagram.com/",
        },
      });

      if (!response.ok) {
        return NextResponse.json({ error: "Failed to fetch image" }, { status: 404 });
      }

      // Get the image data
      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/jpeg";

      // Return the image with appropriate headers
      return new NextResponse(Buffer.from(imageBuffer), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error(`Error proxying image ${proxyImage}:`, error);
      return NextResponse.json({ error: "Failed to proxy image" }, { status: 500 });
    }
  }

  // Handle Instagram URL info
  if (!instagramUrl) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // Check cache first
    const cached = cache[instagramUrl];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Extract Instagram post ID
    const postId = extractInstagramPostId(instagramUrl);
    if (!postId) {
      return NextResponse.json({ error: "Invalid Instagram URL" }, { status: 400 });
    }

    // Generate a thumbnail URL based on the post ID
    const thumbnailUrl = `https://instagram.com/p/${postId}/media/?size=l`;

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

    return NextResponse.json(responseData);
  } catch (error) {
    console.error(`Error fetching Instagram embed for ${instagramUrl}:`, error);

    // Even if there's an error, try to return a direct URL as fallback
    const postId = extractInstagramPostId(instagramUrl);
    if (postId) {
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
