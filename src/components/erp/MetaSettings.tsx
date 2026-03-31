import { useEffect, useMemo, useState } from "react";
import { ErpCard } from "@/components/erp/ErpPrimitives";
import { Button } from "@/components/ui/button";
import { useMetaAssets, useMetaHealth, useMetaConfig, useMetaRegister, useMetaDisconnect, useMetaSaveSelection } from "@/hooks/useMetaMarketing";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle2, AlertCircle, Facebook, Instagram, Megaphone, Unlink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MetaSettings() {
  const { data: health, isLoading: connLoading } = useMetaHealth();
  const connection: any = health ? { status: health.connected ? "active" : "disconnected", connect_url: (health as any).connect_url } : null;
  const { data: config, isLoading: configLoading } = useMetaConfig();
  const { data: assets, isLoading: assetsLoading, refetch: refetchAssets } = useMetaAssets(!!health?.connected);
  const register = useMetaRegister();
  const disconnect = useMetaDisconnect();
  const saveSelection = useMetaSaveSelection();
  const [connecting, setConnecting] = useState(false);
  const [pageId, setPageId] = useState<string>("");
  const [instagramId, setInstagramId] = useState<string>("");
  const [adAccountId, setAdAccountId] = useState<string>("");

  const isLoading = connLoading || configLoading;
  const isConnected = connection?.status === "active";
  const isPending = connection?.status === "pending";

  useEffect(() => {
    setPageId(config?.page_id || "");
    setInstagramId(config?.instagram_account_id || "");
    setAdAccountId(config?.ad_account_id || "");
  }, [config?.page_id, config?.instagram_account_id, config?.ad_account_id]);

  const filteredInstagramAccounts = useMemo(() => {
    if (!assets?.instagramAccounts) return [];
    if (!pageId) return assets.instagramAccounts;
    return assets.instagramAccounts.filter((account: any) => account.page_id === pageId);
  }, [assets?.instagramAccounts, pageId]);

  async function handleSaveSelection() {
    try {
      await saveSelection.mutateAsync({
        page_id: pageId || null,
        instagram_account_id: instagramId || null,
        ad_account_id: adAccountId || null,
      });
    } catch (err: any) {
      toast.error(err.message || "Opslaan mislukt");
    }
  }

  async function handleConnect() {
    try {
      setConnecting(true);
      if (connection?.connect_url) {
        openConnectPopup(connection.connect_url);
        return;
      }
      const result = await register.mutateAsync();
      if (result.connect_url) openConnectPopup(result.connect_url);
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
        window.location.reload();
      }
    }, 1000);
  }

  if (isLoading) {
    return (
      <ErpCard className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
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
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Facebook className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Meta Marketing</h3>
              <p className="text-xs text-muted-foreground">Facebook Ads, Instagram & Lead Ads</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Actief
              </Badge>
            )}
            {isPending && (
              <Badge variant="outline" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Wacht op koppeling
              </Badge>
            )}
          </div>
        </div>

        {!connection && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Koppel je Meta Business account om advertentiecampagnes te beheren, leads automatisch te importeren en Instagram inzichten te bekijken.
            </p>
            <Button onClick={handleConnect} disabled={connecting || register.isPending} size="sm">
              {(connecting || register.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Meta koppelen
            </Button>
          </div>
        )}

        {isPending && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              De registratie is aangemaakt. Klik op de knop om de Facebook OAuth-koppeling te voltooien.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleConnect} disabled={connecting} size="sm">
                {connecting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Koppeling voltooien
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Unlink className="h-3.5 w-3.5 mr-1" />
                    Annuleren
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Registratie annuleren?</AlertDialogTitle>
                    <AlertDialogDescription>De tenant registratie bij SiteJob Connect wordt verwijderd.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Terug</AlertDialogCancel>
                    <AlertDialogAction onClick={() => disconnect.mutate()} className="bg-destructive text-destructive-foreground">Verwijderen</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {isConnected && config && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Facebook pagina</label>
                <Select value={pageId || "__none"} onValueChange={(value) => {
                  const nextPageId = value === "__none" ? "" : value;
                  setPageId(nextPageId);
                  if (nextPageId) {
                    const linkedInstagram = assets?.instagramAccounts?.find((account: any) => account.page_id === nextPageId);
                    setInstagramId(linkedInstagram?.id || "");
                  } else {
                    setInstagramId("");
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer pagina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Geen pagina</SelectItem>
                    {assets?.pages?.map((page: any) => (
                      <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Instagram account</label>
                <Select value={instagramId || "__none"} onValueChange={(value) => setInstagramId(value === "__none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer Instagram" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Geen Instagram account</SelectItem>
                    {filteredInstagramAccounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>@{account.username || account.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Ad account</label>
                <Select value={adAccountId || "__none"} onValueChange={(value) => setAdAccountId(value === "__none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer ad account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Geen ad account</SelectItem>
                    {assets?.adAccounts?.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>{account.name || account.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleSaveSelection} disabled={saveSelection.isPending || assetsLoading}>
                {(saveSelection.isPending || assetsLoading) && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Selectie opslaan
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetchAssets()} disabled={assetsLoading}>
                {assetsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Opnieuw laden
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {config.page_name && (
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Facebook className="h-3.5 w-3.5 text-primary" />
                    Facebook Pagina
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{config.page_name}</p>
                </div>
              )}
              {config.instagram_username && (
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Instagram className="h-3.5 w-3.5 text-accent-foreground" />
                    Instagram
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">@{config.instagram_username}</p>
                </div>
              )}
              {config.ad_account_name && (
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Megaphone className="h-3.5 w-3.5 text-primary" />
                    Ad Account
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{config.ad_account_name}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Token verloopt{" "}
                {config.token_expires_at
                  ? formatDistanceToNow(new Date(config.token_expires_at), { addSuffix: true, locale: nl })
                  : "onbekend"}
              </span>
              <span>
                {(assets?.pages?.length || 0)} pagina's · {(assets?.instagramAccounts?.length || 0)} Instagram · {(assets?.adAccounts?.length || 0)} ad accounts
              </span>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Unlink className="h-3.5 w-3.5 mr-1" />
                  Ontkoppelen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Meta ontkoppelen?</AlertDialogTitle>
                  <AlertDialogDescription>Alle opgeslagen tokens en configuratie worden verwijderd.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Terug</AlertDialogCancel>
                  <AlertDialogAction onClick={() => disconnect.mutate()} className="bg-destructive text-destructive-foreground">Ontkoppelen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </ErpCard>
    </div>
  );
}
