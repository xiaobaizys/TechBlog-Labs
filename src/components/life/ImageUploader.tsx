"use client";

import { useState, useRef } from "react";

type ImageUploaderProps = {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
};

export function ImageUploader({
  images,
  onChange,
  maxImages = 9,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > maxImages) {
      setError(`最多上传 ${maxImages} 张图片`);
      return;
    }

    setError("");
    setUploading(true);

    const urls: string[] = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          urls.push(data.data.url);
        } else {
          setError(data.message || "上传失败");
        }
      } catch {
        setError("网络错误");
      }
    }

    if (urls.length) {
      onChange([...images, ...urls]);
    }

    setUploading(false);
    // 清空 input
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {/* 已上传的图片 */}
        {images.map((url, i) => (
          <div key={i} className="group relative h-20 w-20 shrink-0">
            <img
              src={url}
              alt=""
              className="h-full w-full rounded-lg object-cover border border-[rgb(var(--border))]"
            />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}

        {/* 添加上传按钮 */}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] transition-colors hover:border-primary-400 hover:text-primary-500"
          >
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[rgb(var(--border))] border-t-primary-500" />
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  );
}
