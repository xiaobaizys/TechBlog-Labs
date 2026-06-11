"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageViewer } from "@/components/ui/ImageViewer";

type ImageGridProps = {
  images: string[];
  /** 是否可点击放大，默认 true */
  zoomable?: boolean;
};

export function ImageGrid({ images, zoomable = true }: ImageGridProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  if (!images.length) return null;

  function openViewer(index: number) {
    if (!zoomable) return;
    setViewerIndex(index);
    setViewerOpen(true);
  }

  const count = images.length;

  // 布局策略
  let gridClass = "grid gap-1.5 rounded-xl overflow-hidden";
  if (count === 1) {
    gridClass += " grid-cols-1";
  } else if (count === 2) {
    gridClass += " grid-cols-2";
  } else if (count <= 4) {
    gridClass += " grid-cols-2";
  } else {
    gridClass += " grid-cols-3";
  }

  return (
    <>
      <div className={gridClass}>
        {images.map((url, i) => {
          const isSingle = count === 1;
          const minH = isSingle ? 200 : 140;
          return (
            <div
              key={i}
              onClick={() => openViewer(i)}
              className={`group relative cursor-pointer overflow-hidden bg-[rgb(var(--muted))] ${
                count === 3 && i === 0 ? "row-span-2" : ""
              } ${count >= 5 && i === 0 ? "row-span-2 col-span-2" : ""}`}
              style={{ minHeight: minH }}
            >
              <Image
                src={url}
                alt={`图片 ${i + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              {/* 最后一张的 +N 遮罩 */}
              {count > 6 && i === 5 && (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-xl font-bold text-white"
                  onClick={() => openViewer(5)}
                >
                  +{count - 5}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 图片查看器 */}
      {viewerOpen && (
        <ImageViewer
          images={images}
          currentIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onPrev={() => setViewerIndex((i) => Math.max(0, i - 1))}
          onNext={() => setViewerIndex((i) => Math.min(images.length - 1, i + 1))}
        />
      )}
    </>
  );
}
