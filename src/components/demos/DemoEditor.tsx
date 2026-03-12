import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, RotateCcw } from "lucide-react";
import { useEditDemo, useDemoVersions } from "@/hooks/useDemos";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Props {
  demoId: string;
  model?: string;
}

const QUICK_ACTIONS = [
  "Maak het kleurenschema professioneler",
  "Voeg meer witruimte toe",
  "Vertaal naar het Engels",
  "Voeg een testimonial sectie toe",
  "Maak de CTA opvallender",
];

export default function DemoEditor({ demoId, model }: Props) {
  const [instruction, setInstruction] = useState("");
  const editDemo = useEditDemo();
  const { data: versions } = useDemoVersions(demoId);

  const handleEdit = (text: string) => {
    editDemo.mutate({ demo_id: demoId, instruction: text, model });
    setInstruction("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Beschrijf de aanpassing die je wilt maken..."
          rows={3}
          className="bg-secondary border-border"
        />
        <Button
          onClick={() => handleEdit(instruction)}
          disabled={!instruction.trim() || editDemo.isPending}
          className="w-full"
        >
          <Wand2 className="h-4 w-4 mr-2" />
          {editDemo.isPending ? "Bewerken..." : "Bewerken met AI"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa}
            onClick={() => handleEdit(qa)}
            disabled={editDemo.isPending}
            className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors disabled:opacity-40"
          >
            {qa}
          </button>
        ))}
      </div>

      {versions && versions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <RotateCcw className="h-3 w-3" /> Versie historie
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {versions.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-secondary">
                <span className="text-foreground">v{v.version_number}</span>
                <span className="text-muted-foreground truncate mx-2 flex-1">{v.change_description || "—"}</span>
                <span className="text-muted-foreground shrink-0">
                  {format(new Date(v.created_at), "d MMM HH:mm", { locale: nl })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
