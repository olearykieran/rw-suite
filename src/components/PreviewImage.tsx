// PreviewImage component remains mostly the same, just update the error handling
// src/components/PreviewImage.tsx
import { useState, useEffect } from "react";

interface PreviewImageProps {
  url: string;
}

export function PreviewImage({ url }: PreviewImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getPreviewImage() {
      try {
        const res = await fetch(`/api/preview-image?url=${encodeURIComponent(url)}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
        }
      } catch (err) {
        console.error("Error fetching preview image:", err);
      } finally {
        setLoading(false);
      }
    }
    getPreviewImage();
  }, [url]);

  if (loading) {
    return (
      <div className="w-16 h-16 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
    );
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Preview"
        className="w-16 h-16 object-cover rounded"
        onError={() => setImageUrl(null)}
      />
    );
  }

  return <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded" />;
}
