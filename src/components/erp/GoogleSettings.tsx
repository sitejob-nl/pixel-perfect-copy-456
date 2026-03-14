import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import {
  useGoogleConnections,
  useStartGoogleOAuth,
  useDisconnectGoogle,
  useSyncGoogle,
  type GoogleConnection,
} from "@/hooks/useGoogle";
import { ErpCard, Badge } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

export default function GoogleSettings() {
  const { user } = useAuth();
  const { data: org } = useOrganization();
  const role = org?.role as string;
  const isAdmin = role === "owner" || role === "admin";

  const { data: connections = [], isLoading } = useGoogleConnections();
  const startOAuth = useStartGoogleOAuth();
  const disconnect = useDisconnectGoogle();
  const sync = useSyncGoogle();

  const [searchParams, setSearchParams] = useSearchParams();

  // Handle OAuth callback status
  useEffect(() => {
    const status = searchParams.get("google_status");
    const message = searchParams.get("google_message");
    if (status && message) {
      if (status === "success") toast.success(message);
      else toast.error(message);
      searchParams.delete("google_status");
      searchParams.delete("google_message");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const orgConnections = connections.filter((c) => c.connection_level === "organization");
  const userConnections = connections.filter((c) => c.connection_level === "user" && c.user_id === user?.id);

  const handleConnect = async (level: "organization" | "user") => {
    try {
      const authUrl = await startOAuth.mutateAsync(level);
      window.location.href = authUrl;
    } catch (err: any) {
      toast.error(err.message || "Fout bij starten OAuth");
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await disconnect.mutateAsync(id);
      toast.success("Google account ontkoppeld");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSync = async (id: string, type: "emails" | "calendar") => {
    try {
      const result = await sync.mutateAsync({ connectionId: id, type });
      toast.success(`${result.synced} items gesynchroniseerd`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Organisatie-brede koppeling (admin only) */}
      {isAdmin && (
        <ErpCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-semibold text-erp-text0">Organisatie Gmail & Agenda</h3>
              <p className="text-[12px] text-erp-text3 mt-0.5">
                Koppel een gedeeld e-mailaccount dat voor het hele team zichtbaar is
              </p>
            </div>
            <button
              onClick={() => handleConnect("organization")}
              disabled={startOAuth.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-erp-blue text-white text-[13px] font-medium rounded-lg hover:bg-erp-blue/90 transition disabled:opacity-50"
            >
              <GoogleIcon />
              {startOAuth.isPending ? "Even geduld..." : "Google koppelen"}
            </button>
          </div>
          {orgConnections.length > 0 ? (
            <div className="space-y-2">
              {orgConnections.map((c) => (
                <ConnectionRow
                  key={c.id}
                  conn={c}
                  onDisconnect={handleDisconnect}
                  onSync={handleSync}
                  syncing={sync.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="text-[13px] text-erp-text3 py-4 text-center border border-dashed border-erp-border0 rounded-lg">
              Nog geen organisatie-account gekoppeld
            </div>
          )}
        </ErpCard>
      )}

      {/* Persoonlijke koppeling */}
      <ErpCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-erp-text0">Jouw Gmail & Agenda</h3>
            <p className="text-[12px] text-erp-text3 mt-0.5">
              Koppel je persoonlijke Gmail voor eigen mails en agenda
            </p>
          </div>
          <button
            onClick={() => handleConnect("user")}
            disabled={startOAuth.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-erp-blue text-white text-[13px] font-medium rounded-lg hover:bg-erp-blue/90 transition disabled:opacity-50"
          >
            <GoogleIcon />
            {startOAuth.isPending ? "Even geduld..." : "Mijn Google koppelen"}
          </button>
        </div>
        {userConnections.length > 0 ? (
          <div className="space-y-2">
            {userConnections.map((c) => (
              <ConnectionRow
                key={c.id}
                conn={c}
                onDisconnect={handleDisconnect}
                onSync={handleSync}
                syncing={sync.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="text-[13px] text-erp-text3 py-4 text-center border border-dashed border-erp-border0 rounded-lg">
            Nog geen persoonlijk account gekoppeld
          </div>
        )}
      </ErpCard>
    </div>
  );
}

function ConnectionRow({
  conn,
  onDisconnect,
  onSync,
  syncing,
}: {
  conn: GoogleConnection;
  onDisconnect: (id: string) => void;
  onSync: (id: string, type: "emails" | "calendar") => void;
  syncing: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-erp-bg2 rounded-lg border border-erp-border0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-erp-bg3 rounded-lg flex items-center justify-center">
          <GoogleIcon />
        </div>
        <div>
          <div className="text-[13px] font-medium text-erp-text0">{conn.email}</div>
          <div className="text-[11px] text-erp-text3 flex items-center gap-2">
            {conn.display_name && <span>{conn.display_name}</span>}
            {conn.last_sync_at && (
              <span>
                Laatste sync: {formatDistanceToNow(new Date(conn.last_sync_at), { locale: nl, addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
          Actief
        </span>
        <button
          onClick={() => onSync(conn.id, "emails")}
          disabled={syncing}
          className="p-1.5 hover:bg-erp-hover rounded-md transition text-erp-text3 hover:text-erp-text0"
          title="E-mails synchroniseren"
        >
          <Icons.Mail className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onSync(conn.id, "calendar")}
          disabled={syncing}
          className="p-1.5 hover:bg-erp-hover rounded-md transition text-erp-text3 hover:text-erp-text0"
          title="Agenda synchroniseren"
        >
          <Icons.Calendar className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDisconnect(conn.id)}
          className="p-1.5 hover:bg-red-500/10 rounded-md transition text-erp-text3 hover:text-red-400"
          title="Ontkoppelen"
        >
          <Icons.Trash className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
