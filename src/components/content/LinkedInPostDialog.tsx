import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLinkedInPost, useLinkedInConnection, type LinkedInPostPayload } from "@/hooks/useLinkedIn";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LinkedInPostDialog({ open, onOpenChange }: Props) {
  const [text, setText] = useState("");
  const [postType, setPostType] = useState<"text" | "url" | "image">("text");
  const [url, setUrl] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [urlDescription, setUrlDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "CONNECTIONS">("PUBLIC");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageContentType, setImageContentType] = useState<string>("image/png");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const post = useLinkedInPost();
  const { data: connection } = useLinkedInConnection();

  const charCount = text.length;
  const maxChars = 3000;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageContentType(file.type || "image/png");
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      // Strip the data:...;base64, prefix
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!text.trim()) return;
    const payload: LinkedInPostPayload = { text, visibility };
    if (postType === "url" && url.trim()) {
      payload.url = url.trim();
      if (urlTitle.trim()) payload.url_title = urlTitle.trim();
      if (urlDescription.trim()) payload.url_description = urlDescription.trim();
    }
    if (postType === "image" && imageBase64) {
      payload.image_base64 = imageBase64;
      payload.image_content_type = imageContentType;
    }
    await post.mutateAsync(payload);
    setText("");
    setUrl("");
    setUrlTitle("");
    setUrlDescription("");
    setImagePreview(null);
    setImageBase64(null);
    setPostType("text");
    onOpenChange(false);
  };

  const isDisabled = !text.trim() || !connection || post.isPending ||
    (postType === "url" && !url.trim()) ||
    (postType === "image" && !imageBase64);

  const inputClass = "w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-[hsl(225,93%,64%)]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg3 border-erp-border0 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-erp-text0 flex items-center gap-2">
            <svg className="w-5 h-5 text-[hsl(225,93%,64%)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
            LinkedIn Post
          </DialogTitle>
        </DialogHeader>

        {connection && (
          <div className="flex items-center gap-2 text-[12px] text-erp-text3">
            {connection.linkedin_avatar_url ? (
              <img src={connection.linkedin_avatar_url} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[hsl(225,93%,64%)] flex items-center justify-center text-white text-[10px] font-bold">in</div>
            )}
            Posten als {connection.linkedin_name}
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, maxChars))}
          placeholder="Wat wil je delen op LinkedIn?"
          rows={5}
          className={`${inputClass} resize-none`}
        />

        <Tabs value={postType} onValueChange={(v) => setPostType(v as any)} className="w-full">
          <TabsList className="w-full bg-erp-bg2 border border-erp-border0">
            <TabsTrigger value="text" className="flex-1 text-[12px] data-[state=active]:bg-erp-bg3 data-[state=active]:text-erp-text0 text-erp-text3">
              Tekst
            </TabsTrigger>
            <TabsTrigger value="url" className="flex-1 text-[12px] data-[state=active]:bg-erp-bg3 data-[state=active]:text-erp-text0 text-erp-text3">
              URL / Artikel
            </TabsTrigger>
            <TabsTrigger value="image" className="flex-1 text-[12px] data-[state=active]:bg-erp-bg3 data-[state=active]:text-erp-text0 text-erp-text3">
              Afbeelding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text">
            <p className="text-[11px] text-erp-text3">Alleen tekst, geen bijlage.</p>
          </TabsContent>

          <TabsContent value="url" className="space-y-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/artikel"
              className={inputClass}
            />
            <input
              type="text"
              value={urlTitle}
              onChange={(e) => setUrlTitle(e.target.value)}
              placeholder="Titel (optioneel)"
              className={inputClass}
            />
            <input
              type="text"
              value={urlDescription}
              onChange={(e) => setUrlDescription(e.target.value)}
              placeholder="Beschrijving (optioneel)"
              className={inputClass}
            />
          </TabsContent>

          <TabsContent value="image" className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain rounded-lg border border-erp-border0" />
                <button
                  onClick={() => { setImagePreview(null); setImageBase64(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="absolute top-1 right-1 w-6 h-6 bg-erp-bg1 border border-erp-border0 rounded-full flex items-center justify-center text-erp-text3 hover:text-erp-text0 text-[12px]"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-erp-border0 rounded-lg text-erp-text3 hover:border-[hsl(225,93%,64%)] hover:text-erp-text0 transition-colors text-[13px]"
              >
                Klik om een afbeelding te selecteren
              </button>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "CONNECTIONS")}
              className="bg-erp-bg2 border border-erp-border0 rounded-lg px-2 py-1.5 text-[12px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-[hsl(225,93%,64%)]"
            >
              <option value="PUBLIC">🌐 Publiek</option>
              <option value="CONNECTIONS">👥 Alleen connecties</option>
            </select>
          </div>
          <span className="text-[11px] text-erp-text3">{charCount}/{maxChars} tekens</span>
        </div>

        {!connection && (
          <div className="text-[11px] text-destructive">
            ⚠ LinkedIn niet gekoppeld — ga naar Instellingen
          </div>
        )}

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-[13px] text-erp-text2 hover:text-erp-text0 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handlePost}
            disabled={isDisabled}
            className="px-4 py-2 bg-[hsl(225,93%,64%)] text-white rounded-lg text-[13px] font-medium hover:bg-[hsl(225,93%,54%)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {post.isPending ? "Publiceren..." : "Publiceer op LinkedIn"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
