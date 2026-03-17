import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bold, Italic, List, ListOrdered, Heading3, Heading4, Link2, Table as TableIcon, ChevronDown, ChevronRight, Library, BookmarkPlus, Sparkles, Loader2 } from "lucide-react";
import { useUpdateSection, useSectionLibrary, useSaveToLibrary } from "@/hooks/useProjectPlans";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type SectionRow = Database["public"]["Tables"]["project_plan_sections"]["Row"];

const VARIABLES = [
  { key: "{{client_company}}", label: "Bedrijfsnaam" },
  { key: "{{client_name}}", label: "Contactnaam" },
  { key: "{{client_email}}", label: "Email" },
  { key: "{{client_address}}", label: "Adres" },
  { key: "{{client_kvk}}", label: "KvK nummer" },
  { key: "{{total_amount}}", label: "Totaalbedrag" },
  { key: "{{estimated_weeks}}", label: "Doorlooptijd" },
  { key: "{{estimated_start}}", label: "Startdatum" },
];

interface Props {
  section: SectionRow;
  plan: any;
  allSections: SectionRow[];
  onTitleChange: (title: string) => void;
  onContentChange: (html: string) => void;
  onRewrite: (section: SectionRow, extraInstructions?: string) => void;
  isRewriting: boolean;
}

export default function SectionEditor({ section, plan, allSections, onTitleChange, onContentChange, onRewrite, isRewriting }: Props) {
  const updateMut = useUpdateSection();
  const { data: libraryItems = [] } = useSectionLibrary(section.section_type);
  const saveMut = useSaveToLibrary();
  const { data: org } = useOrganization();
  const { user } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(section.ai_prompt || "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [3, 4] } }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
    ],
    content: section.content_html || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange(html);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateMut.mutate({ id: section.id, content_html: html });
      }, 1000);
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none min-h-[200px] focus:outline-none px-3 py-2 text-erp-text0",
      },
    },
  });

  useEffect(() => {
    if (editor && section.content_html !== editor.getHTML()) {
      editor.commands.setContent(section.content_html || "");
    }
  }, [section.id, section.content_html]);

  const insertVariable = (key: string) => {
    editor?.commands.insertContent(key);
  };

  const loadFromLibrary = async (item: any) => {
    editor?.commands.setContent(item.content_html || "");
    onContentChange(item.content_html || "");
    updateMut.mutate({ id: section.id, content_html: item.content_html });
    await supabase.from("project_plan_section_library").update({ use_count: (item.use_count || 0) + 1 }).eq("id", item.id);
    toast({ title: "Inhoud geladen uit bibliotheek" });
  };

  const saveToLibrary = async () => {
    if (!org?.organization_id) return;
    try {
      await saveMut.mutateAsync({
        organization_id: org.organization_id,
        section_type: section.section_type,
        title: section.title,
        content_html: editor?.getHTML() || null,
        created_by: user?.id || null,
      });
      toast({ title: "Opgeslagen in bibliotheek" });
    } catch (e: any) {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    }
  };

  const handleTitleBlur = (val: string) => {
    onTitleChange(val);
    updateMut.mutate({ id: section.id, title: val });
  };

  const handleRewrite = () => {
    onRewrite(section, aiPrompt || undefined);
  };

  if (!editor) return null;

  return (
    <div className="space-y-3">
      <Input
        defaultValue={section.title}
        onBlur={e => handleTitleBlur(e.target.value)}
        className="bg-erp-bg3 border-erp-border0 text-erp-text0 font-semibold"
        placeholder="Sectie titel..."
      />

      {/* AI + Library action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 border-[hsl(var(--erp-blue))]/30 text-[hsl(var(--erp-blue))] hover:bg-[hsl(var(--erp-blue))]/10"
          onClick={handleRewrite}
          disabled={isRewriting}
        >
          {isRewriting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Herschrijf met AI
        </Button>
        {libraryItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 bg-erp-bg3 border-erp-border0 text-erp-text1">
                <Library className="w-3.5 h-3.5" /> Uit bibliotheek
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-erp-bg3 border-erp-border0 max-h-60 overflow-auto">
              {libraryItems.map(item => (
                <DropdownMenuItem key={item.id} onClick={() => loadFromLibrary(item)} className="text-erp-text1 focus:bg-erp-hover text-xs">
                  {item.title}
                  {item.category && <span className="ml-2 text-erp-text3">({item.category})</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 bg-erp-bg3 border-erp-border0 text-erp-text1" onClick={saveToLibrary}>
          <BookmarkPlus className="w-3.5 h-3.5" /> Opslaan
        </Button>
      </div>

      {/* AI prompt (collapsible) */}
      <Collapsible open={aiPromptOpen} onOpenChange={setAiPromptOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1 text-xs text-erp-text3 hover:text-erp-text1 transition-colors">
            {aiPromptOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Sparkles className="w-3 h-3" />
            Specifieke instructies voor AI
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Textarea
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onBlur={() => updateMut.mutate({ id: section.id, ai_prompt: aiPrompt })}
            placeholder="Bijv. 'Focus op hun huidige Excel-werkprocessen' of 'Voeg een CRM module toe met WhatsApp integratie'"
            className="mt-2 bg-erp-bg3 border-erp-border0 text-erp-text0 text-xs min-h-[60px]"
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Rewriting shimmer */}
      {isRewriting && (
        <div className="border border-erp-border0 rounded-md bg-erp-bg3 p-4 space-y-2 animate-pulse">
          <div className="h-3 bg-erp-bg4 rounded w-3/4" />
          <div className="h-3 bg-erp-bg4 rounded w-full" />
          <div className="h-3 bg-erp-bg4 rounded w-5/6" />
          <div className="h-3 bg-erp-bg4 rounded w-2/3" />
        </div>
      )}

      {/* Toolbar */}
      {!isRewriting && (
        <>
          <div className="flex items-center gap-1 flex-wrap border border-erp-border0 rounded-md p-1 bg-erp-bg3">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive("bold")}>
              <Bold className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>
              <Heading4 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              <TableIcon className="w-3.5 h-3.5" />
            </Button>

            <div className="h-4 w-px bg-erp-border1 mx-1" />

            {/* Variables */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  {"{{x}}"} <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-erp-bg3 border-erp-border0">
                {VARIABLES.map(v => (
                  <DropdownMenuItem key={v.key} onClick={() => insertVariable(v.key)} className="text-erp-text1 focus:bg-erp-hover text-xs">
                    {v.label} <span className="ml-auto text-erp-text3">{v.key}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Editor */}
          <div className="border border-erp-border0 rounded-md bg-erp-bg3 overflow-hidden">
            <EditorContent editor={editor} />
          </div>
        </>
      )}

      {/* AI badge */}
      {section.ai_generated && section.ai_generated_at && (
        <p className="text-[10px] text-erp-text3 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Gegenereerd door AI ({section.ai_model}) op {new Date(section.ai_generated_at).toLocaleDateString("nl-NL")}
        </p>
      )}
    </div>
  );
}
