import { useLinkedInConnection, useLinkedInConnect, useLinkedInDisconnect } from "@/hooks/useLinkedIn";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export default function LinkedInSettings() {
  const { data: connection, isLoading } = useLinkedInConnection();
  const connect = useLinkedInConnect();
  const disconnect = useLinkedInDisconnect();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const linkedin = searchParams.get("linkedin");
    if (linkedin === "success") {
      toast.success("LinkedIn succesvol gekoppeld!");
      searchParams.delete("linkedin");
      setSearchParams(searchParams, { replace: true });
    } else if (linkedin === "error") {
      const reason = searchParams.get("reason") || "unknown";
      toast.error(`LinkedIn koppeling mislukt: ${reason}`);
      searchParams.delete("linkedin");
      searchParams.delete("reason");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (isLoading) {
    return (
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
        <div className="text-[13px] text-erp-text3">Laden...</div>
      </div>
    );
  }

  return (
    <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5 space-y-4">
      <div>
        <h3 className="text-[15px] font-semibold text-erp-text0">LinkedIn</h3>
        <p className="text-[12px] text-erp-text3 mt-1">
          Koppel je LinkedIn account om posts te publiceren vanuit het CRM.
        </p>
      </div>

      {connection ? (
        <div className="flex items-center justify-between bg-erp-bg2 rounded-lg border border-erp-border0 p-4">
          <div className="flex items-center gap-3">
            {connection.linkedin_avatar_url ? (
              <img
                src={connection.linkedin_avatar_url}
                alt=""
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[hsl(225,93%,64%)] flex items-center justify-center text-white text-sm font-bold">
                in
              </div>
            )}
            <div>
              <div className="text-[13px] font-medium text-erp-text0">
                {connection.linkedin_name || "LinkedIn account"}
              </div>
              <div className="text-[11px] text-erp-text3">Gekoppeld</div>
            </div>
          </div>
          <button
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="px-3 py-1.5 text-[12px] font-medium text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
          >
            {disconnect.isPending ? "Bezig..." : "Ontkoppelen"}
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(225,93%,64%)] text-white rounded-lg text-[13px] font-medium hover:bg-[hsl(225,93%,54%)] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
          </svg>
          Koppel LinkedIn
        </button>
      )}

      <div className="text-[11px] text-erp-text3 border-t border-erp-border0 pt-3">
        <strong>Let op:</strong> Je LinkedIn moet de scope{" "}
        <code className="bg-erp-bg2 px-1 rounded text-[10px]">w_member_social</code> hebben
        goedgekeurd om posts te kunnen plaatsen.
      </div>
    </div>
  );
}
