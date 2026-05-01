import { useEffect, useMemo, useState } from "react";

function isVideoFile(file) {
  return String(file?.type || "").startsWith("video/");
}

export default function MediaUploadField({
  files,
  setFiles,
  maxFiles = 12,
  title = "Photos & Videos",
}) {
  const [isDragging, setIsDragging] = useState(false);

  const previews = useMemo(
    () =>
      (files || []).map((file) => ({
        file,
        url: URL.createObjectURL(file),
        isVideo: isVideoFile(file),
      })),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previews]);

  const appendFiles = (incoming) => {
    const valid = Array.from(incoming || []).filter(Boolean);
    if (!valid.length) return;
    setFiles((prev) => [...(prev || []), ...valid].slice(0, maxFiles));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    appendFiles(e.dataTransfer?.files || []);
  };

  const removeAt = (idx) => {
    setFiles((prev) => (prev || []).filter((_, i) => i !== idx));
  };

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
        {title} ({files.length}/{maxFiles})
      </div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        style={{
          display: "block",
          border: `2px dashed ${isDragging ? "#2563eb" : "#cbd5e1"}`,
          background: isDragging ? "#eff6ff" : "#f8fafc",
          borderRadius: "10px",
          padding: "12px",
          cursor: "pointer",
        }}
      >
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => appendFiles(e.target.files || [])}
          style={{ display: "none" }}
        />
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
          Drag & drop media here, or click to upload
        </div>
        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
          Supports mixed photos/videos. Recommended 7-8 media files per listing.
        </div>
      </label>

      {previews.length > 0 && (
        <div
          style={{
            marginTop: "10px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
            gap: "8px",
          }}
        >
          {previews.map((item, idx) => (
            <div key={`${item.file.name}-${idx}`} style={{ position: "relative" }}>
              {item.isVideo ? (
                <video src={item.url} style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e2e8f0" }} muted />
              ) : (
                <img src={item.url} alt={item.file.name} style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              )}
              <button
                type="button"
                onClick={() => removeAt(idx)}
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "4px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "999px",
                  border: "none",
                  background: "rgba(15,23,42,0.8)",
                  color: "white",
                  fontSize: "11px",
                }}
                aria-label="Remove media"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
