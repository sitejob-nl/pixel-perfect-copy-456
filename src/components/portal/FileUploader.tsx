import { useState, useRef } from "react";
import { getUploadUrl, confirmUpload } from "@/hooks/useClientPortal";

interface Props {
  token: string;
  fileRequestId: string;
  acceptedTypes?: string[];
  onUploaded: () => void;
}

export default function FileUploader({ token, fileRequestId, acceptedTypes, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      // 1. Get signed upload URL
      const { upload_url, path, token: uploadToken } = await getUploadUrl(token, file.name, file.type);

      // 2. Upload file to signed URL
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload mislukt");

      // 3. Confirm upload
      await confirmUpload(token, fileRequestId, path);
      onUploaded();
    } catch (e: any) {
      setError(e.message || "Upload mislukt");
    }
    setUploading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const accept = acceptedTypes?.length ? acceptedTypes.join(",") : undefined;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {uploading ? "Uploaden..." : "Bestand uploaden"}
      </button>
      {acceptedTypes && acceptedTypes.length > 0 && (
        <span className="text-xs text-gray-400 ml-2">{acceptedTypes.join(", ")}</span>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
