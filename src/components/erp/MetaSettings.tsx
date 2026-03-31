import { useState } from "react";
import { ErpCard, ErpButton } from "@/components/erp/ErpPrimitives";
import { useMetaConnection, useMetaConfig, useMetaRegister, useMetaDisconnect } from "@/hooks/useMetaMarketing";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle2, AlertCircle, Facebook, Instagram, Megaphone, Unlink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MetaSettings() {
  const { data: connection, isLoading: connLoading } = useMetaConnection();
  const { data: config, isLoading: configLoading } = useMetaConfig();
  const register = useMetaRegister();
  const disconnect = useMetaDisconnect();
  const [connecting, setConnecting] = useState(false);

  const isLoading = connLoading || configLoading;
  const isConnected = connection?.status === "active";
  const isPending = connection?.status === "pending";

  async function handleConnect() {
    try {
      setConnecting(true);

      if (connection?.connect_url) {
        // Already registered, just open the popup
        openConnectPopup(connection.connect_url);
        return;
      }

      const result = await register.mutateAsync();
      if (result.connect_url) {
        openConnectPopup(result.connect_url);
      }
    } catch (err: any) {
      toast.error(err.message || "Koppeling mislukt");
    } finally {
      setConnecting(false);
    }
  }

  function openConnectPopup(url: string) {
    const popup = window.open(url, "meta-marketing-setup", "width=600,height=700");
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        setConnecting(false);
        // Refresh data
        window.location.reload();
      }
    }, 1000);
  }

  if (isLoading) {
    return (
      <ErpCard className="p-6">
        <div className="flex items-center gap-2 text-erp-text3">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Meta Marketing laden...</span>
        </div>
      </ErpCard>
    );
  }

  return (
    <div className="space-y-4">
      <ErpCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Facebook className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-erp-text0">Meta Marketing</h3>
              <p className="text-xs text-erp-text3">Facebook Ads, Instagram & Lead Ads</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Actief
              </Badge>
            )}
            {isPending && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Wacht op koppeling
              </Badge>
            )}
          </div>
        </div>

        {!connection && (
          <div className="space-y-3">
            <p className="text-xs text-erp-text3">
              Koppel je Meta Business account om advertentiecampagnes te beheren, leads automatisch te importeren en Instagram inzichten te bekijken.
            </p>
            <ErpButton
              onClick={handleConnect}
              disabled={connecting || register.isPending}
              className="gap-2"
            >
              {(connecting || register.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <ExternalLink className="h-3.5 w-3.5" />
              Meta koppelen
            </ErpButton>
          </div>
        )}

        {isPending && (
          <div className="space-y-3">
            <p className="text-xs text-erp-text3">
              De registratie is aangemaakt. Klik op de knop om de Facebook OAuth-koppeling te voltooien.
            </p>
            <div className="flex gap-2">
              <ErpButton
                onClick={handleConnect}
                disabled={connecting}
                className="gap-2"
              >
                {connecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <ExternalLink className="h-3.5 w-3.5" />
                Koppeling voltooien
              </ErpButton>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <ErpButton variant="ghost" className="text-destructive gap-2">
                    <Unlink className="h-3.5 w-3.5" />
                    Annuleren
                  </ErpButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Registratie annuleren?</AlertDialogTitle>
                    <AlertDialogDescription>
                      De tenant registratie bij SiteJob Connect wordt verwijderd.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Terug</AlertDialogCancel>
                    <AlertDialogAction onClick={() => disconnect.mutate()} className="bg-destructive text-destructive-foreground">
                      Verwijderen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {isConnected && config && (
          <div className="space-y-4">
            {/* Connected assets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {config.page_name && (
                <div className="rounded-lg border border-erp-border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-erp-text2">
                    <Facebook className="h-3.5 w-3.5 text-blue-500" />
                    Facebook Pagina
                  </div>
                  <p className="text-sm font-semibold text-erp-text0 truncate">{config.page_name}</p>
                </div>
              )}
              {config.instagram_username && (
                <div className="rounded-lg border border-erp-border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-erp-text2">
                    <Instagram className="h-3.5 w-3.5 text-pink-500" />
                    Instagram
                  </div>
                  <p className="text-sm font-semibold text-erp-text0 truncate">@{config.instagram_username}</p>
                </div>
              )}
              {config.ad_account_name && (
                <div className="rounded-lg border border-erp-border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-erp-text2">
                    <Megaphone className="h-3.5 w-3.5 text-green-500" />
                    Ad Account
                  </div>
                  <p className="text-sm font-semibold text-erp-text0 truncate">{config.ad_account_name}</p>
                </div>
              )}
            </div>

            {/* Token info */}
            <div className="flex items-center justify-between text-xs text-erp-text3">
              <span>
                Token verloopt{" "}
                {config.token_expires_at
                  ? formatDistanceToNow(new Date(config.token_expires_at), { addSuffix: true, locale: nl })
                  : "onbekend"}
              </span>
              {config.updated_at && (
                <span>
                  Laatst bijgewerkt{" "}
                  {formatDistanceToNow(new Date(config.updated_at), { addSuffix: true, locale: nl })}
                </span>
              )}
            </div>

            {/* Disconnect */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <ErpButton variant="ghost" size="sm" className="text-destructive gap-2">
                  <Unlink className="h-3.5 w-3.5" />
                  Ontkoppelen
                </ErpButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Meta ontkoppelen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Alle opgeslagen tokens en configuratie worden verwijderd. Je kunt later opnieuw koppelen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Terug</AlertDialogCancel>
                  <AlertDialogAction onClick={() => disconnect.mutate()} className="bg-destructive text-destructive-foreground">
                    Ontkoppelen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </ErpCard>
    </div>
  );
}
