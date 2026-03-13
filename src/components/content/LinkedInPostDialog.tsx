import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLinkedInPost, useLinkedInConnection } from "@/hooks/useLinkedIn";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LinkedInPostDialog({ open, onOpenChange }: Props) {
  const [text, setText] = useState("");
  const post = useLinkedInPost();
  const { data: connection } = useLinkedInConnection();

  const charCount = text.length;
  const maxChars = 3000;

  const handlePost = async () => {
    if (!text.trim()) return;
    await post.mutateAsync(text);
    setText("");
    onOpenChange(false);
  };

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
          rows={6}
          className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2.5 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-[hsl(225,93%,64%)] resize-none"
        />

        <div className="flex items-center justify-between text-[11px] text-erp-text3">
          <span>{charCount}/{maxChars} tekens</span>
          {!connection && (
            <span className="text-destructive">
              ⚠ LinkedIn niet gekoppeld — ga naar Instellingen
            </span>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-[13px] text-erp-text2 hover:text-erp-text0 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handlePost}
            disabled={!text.trim() || !connection || post.isPending}
            className="px-4 py-2 bg-[hsl(225,93%,64%)] text-white rounded-lg text-[13px] font-medium hover:bg-[hsl(225,93%,54%)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {post.isPending ? "Publiceren..." : "Publiceer op LinkedIn"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
