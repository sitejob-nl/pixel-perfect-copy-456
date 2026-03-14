import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Icons } from "./ErpIcons";

interface Option {
  value: string;
  label: string;
}

interface InlineEditFieldProps {
  value: any;
  field: string;
  type?: "text" | "number" | "select" | "date" | "textarea" | "url";
  options?: Option[];
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  onSave: (field: string, value: any) => Promise<void> | void;
  displayValue?: string;
}

export default function InlineEditField({
  value,
  field,
  type = "text",
  options,
  prefix,
  suffix,
  placeholder = "—",
  onSave,
  displayValue,
}: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => { setVal(value ?? ""); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const save = async () => {
    if (val === value) { setEditing(false); return; }
    setSaving(true);
    try {
      const saveVal = type === "number" ? (val === "" ? null : Number(val)) : (val || null);
      await onSave(field, saveVal);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const display = displayValue ?? (
    value != null && value !== ""
      ? `${prefix ?? ""}${type === "date" ? format(new Date(value), "d MMM yyyy", { locale: nl }) : value}${suffix ?? ""}`
      : placeholder
  );

  // Select type
  if (type === "select") {
    return (
      <Select
        value={value ?? ""}
        onValueChange={async (v) => {
          setSaving(true);
          try { await onSave(field, v || null); } finally { setSaving(false); }
        }}
      >
        <SelectTrigger className="h-auto px-2 py-1 -mx-2 -my-1 bg-transparent border-none hover:bg-erp-bg3 transition-colors text-[13px] text-erp-text0 w-auto min-w-0 focus:ring-0 focus:ring-offset-0">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-erp-bg3 border-erp-border0">
          {options?.map(o => (
            <SelectItem key={o.value} value={o.value} className="text-erp-text0 text-[13px] focus:bg-erp-hover">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Date type
  if (type === "date") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="cursor-pointer hover:bg-erp-bg3 rounded px-2 py-1 -mx-2 -my-1 transition-colors text-[13px] text-erp-text0 flex items-center gap-1">
            {display}
            <Icons.Edit className="w-3 h-3 text-erp-text3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-erp-bg3 border-erp-border0" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value) : undefined}
            onSelect={async (date) => {
              if (date) {
                const iso = format(date, "yyyy-MM-dd");
                await onSave(field, iso);
              }
            }}
            locale={nl}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Textarea type
  if (type === "textarea") {
    if (!editing) {
      return (
        <div
          onClick={() => setEditing(true)}
          className="cursor-pointer hover:bg-erp-bg3 rounded px-2 py-1 -mx-2 -my-1 transition-colors text-[13px] text-erp-text0 whitespace-pre-wrap min-h-[60px] group"
        >
          {display}
          <Icons.Edit className="w-3 h-3 text-erp-text3 opacity-0 group-hover:opacity-100 transition-opacity inline ml-1" />
        </div>
      );
    }
    return (
      <Textarea
        ref={inputRef as any}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-[13px] min-h-[80px] -mx-2 -my-1"
        disabled={saving}
      />
    );
  }

  // Text / Number / URL
  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className="cursor-pointer hover:bg-erp-bg3 rounded px-2 py-1 -mx-2 -my-1 transition-colors text-[13px] text-erp-text0 flex items-center gap-1 group"
      >
        {type === "url" && value ? (
          <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener" className="text-erp-blue hover:underline" onClick={e => e.stopPropagation()}>
            {(value as string).replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <span className={!value ? "text-erp-text3" : ""}>{display}</span>
        )}
        <Icons.Edit className="w-3 h-3 text-erp-text3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 -mx-2 -my-1">
      {prefix && <span className="text-erp-text3 text-[13px] pl-2">{prefix}</span>}
      <Input
        ref={inputRef as any}
        type={type === "number" ? "number" : "text"}
        step={type === "number" ? "0.01" : undefined}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setVal(value ?? ""); setEditing(false); } }}
        className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-[13px] h-7 px-2"
        disabled={saving}
      />
    </div>
  );
}
