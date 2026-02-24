import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { useDataSources, useStartScrapeRun } from "@/hooks/useDataIntel";
import { toast } from "sonner";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
}

export default function RunScraperDialog({ open, onOpenChange, organizationId }: Props) {
    const [selectedSourceId, setSelectedSourceId] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [location, setLocation] = useState("");
    const [maxResults, setMaxResults] = useState("20");

    const { data: dataSources, isLoading: loadingSources } = useDataSources();
    const startRun = useStartScrapeRun();

    const selectedSource = dataSources?.find((s: any) => s.id === selectedSourceId);
    const actorId = selectedSource?.provider_config?.actorId || "";

    // Build actor input based on the selected actor type
    const buildActorInput = () => {
        const max = parseInt(maxResults) || 20;

        if (actorId.includes("google-places")) {
            return {
                searchStringsArray: [searchQuery],
                locationQuery: location || undefined,
                maxCrawledPlacesPerSearch: max,
                language: "nl",
                deeperCityScrape: false,
            };
        }

        if (actorId.includes("leads-finder")) {
            return {
                search: searchQuery,
                location: location || undefined,
                maxItems: max,
            };
        }

        if (actorId.includes("website-content-crawler")) {
            return {
                startUrls: [{ url: searchQuery }],
                maxCrawlPages: max,
            };
        }

        if (actorId.includes("Linkedin")) {
            return {
                searchTerms: [searchQuery],
                maxResults: max,
            };
        }

        // Generic fallback
        return {
            query: searchQuery,
            maxItems: max,
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedSourceId) {
            toast.error("Selecteer een databron");
            return;
        }
        if (!searchQuery.trim()) {
            toast.error("Voer een zoekopdracht in");
            return;
        }

        startRun.mutate(
            {
                data_source_id: selectedSourceId,
                organization_id: organizationId,
                actor_input: buildActorInput(),
            },
            {
                onSuccess: (data) => {
                    toast.success("Scrape run gestart! Resultaten verschijnen automatisch.");
                    onOpenChange(false);
                    resetForm();
                },
                onError: (err) => {
                    toast.error(`Fout: ${err.message}`);
                },
            }
        );
    };

    const resetForm = () => {
        setSelectedSourceId("");
        setSearchQuery("");
        setLocation("");
        setMaxResults("20");
    };

    // Determine placeholder text based on selected actor
    const getSearchPlaceholder = () => {
        if (actorId.includes("google-places")) return "bijv. webdesign bureau";
        if (actorId.includes("leads-finder")) return "bijv. marketing agency Netherlands";
        if (actorId.includes("website-content-crawler")) return "bijv. https://example.com";
        if (actorId.includes("Linkedin")) return "bijv. CEO digital marketing";
        return "Zoekopdracht...";
    };

    const getSearchLabel = () => {
        if (actorId.includes("website-content-crawler")) return "Start URL";
        return "Zoekopdracht *";
    };

    const showLocationField = actorId.includes("google-places") || actorId.includes("leads-finder");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-erp-text0">Nieuwe scrape run</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-erp-text2 text-xs">Databron *</Label>
                        <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
                            <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm">
                                <SelectValue placeholder={loadingSources ? "Laden..." : "Selecteer databron"} />
                            </SelectTrigger>
                            <SelectContent className="bg-erp-bg2 border-erp-border0">
                                {dataSources?.map((source: any) => (
                                    <SelectItem key={source.id} value={source.id}>
                                        {source.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedSource && (
                            <p className="text-erp-text3 text-[11px] mt-0.5">{selectedSource.description}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-erp-text2 text-xs">{getSearchLabel()}</Label>
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"
                            placeholder={getSearchPlaceholder()}
                        />
                    </div>

                    {showLocationField && (
                        <div className="space-y-1.5">
                            <Label className="text-erp-text2 text-xs">Locatie</Label>
                            <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"
                                placeholder="bijv. Amsterdam, Nederland"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-erp-text2 text-xs">Max resultaten</Label>
                        <Input
                            type="number"
                            min="1"
                            max="200"
                            value={maxResults}
                            onChange={(e) => setMaxResults(e.target.value)}
                            className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm w-24"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <ErpButton onClick={() => onOpenChange(false)}>Annuleren</ErpButton>
                        <ErpButton primary>
                            {startRun.isPending ? "Starten..." : "Run starten"}
                        </ErpButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
