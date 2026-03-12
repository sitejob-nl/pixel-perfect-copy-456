import React from "react";
import { cn } from "@/lib/utils";

export function Dot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: color }}
    />
  );
}

export function Avatar({ name, id = 0, size = 32 }: { name: string; id?: number; size?: number }) {
  const hue = ((id * 67 + 30) % 360);
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `hsl(${hue}, 35%, 20%)`,
        fontSize: size * 0.38,
        color: `hsl(${hue}, 55%, 65%)`,
      }}
    >
      {initials}
    </div>
  );
}

export function Badge({ children, color = "hsl(var(--erp-text-2))" }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-[5px] text-[11px] font-semibold rounded-full whitespace-nowrap"
      style={{
        color,
        background: `${color}14`,
        padding: "3px 10px",
      }}
    >
      {children}
    </span>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-erp-text2 bg-erp-bg3 px-[9px] py-[3px] rounded-md whitespace-nowrap">
      {children}
    </span>
  );
}

export function StatCard({ label, value, prefix = "", change, up }: {
  label: string; value: string; prefix?: string; change: string; up: boolean;
}) {
  return (
    <div className="bg-erp-bg2 border border-erp-border0 rounded-xl p-[18px_20px] hover:bg-erp-hover hover:border-erp-border1 transition-all duration-100">
      <div className="text-xs text-erp-text2 font-medium mb-2">{label}</div>
      <div className="text-[26px] font-bold tracking-tight text-erp-text0 leading-none">
        {prefix}{value}
      </div>
      <div className={cn(
        "flex items-center gap-1 mt-[10px] text-xs font-medium",
        up ? "text-erp-green" : "text-erp-red"
      )}>
        {up ? (
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        ) : (
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
        )}
        {change}
      </div>
    </div>
  );
}

export function ErpCard({ children, className, hover, onClick }: { children: React.ReactNode; className?: string; hover?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-erp-bg2 border border-erp-border0 rounded-xl transition-all duration-100",
        hover && "hover:bg-erp-hover hover:border-erp-border1 cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-erp-text0">{title}</h1>
        {desc && <p className="text-[13px] text-erp-text2 mt-1">{desc}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}



export const ErpButton = React.forwardRef<HTMLButtonElement, {
  children: React.ReactNode; primary?: boolean; onClick?: () => void; disabled?: boolean;
}>(({ children, primary, onClick, disabled }, ref) => {
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-[6px] px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-100",
        primary
          ? "bg-erp-blue text-white border-none hover:brightness-110"
          : "bg-erp-bg3 text-erp-text0 border border-erp-border1 hover:bg-erp-hover",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
});
ErpButton.displayName = "ErpButton";

export function FilterButton({ children, active, onClick }: {
  children: React.ReactNode; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-[5px] px-3 py-[6px] rounded-[7px] text-xs font-medium cursor-pointer transition-all duration-100 border",
        active
          ? "bg-erp-blue/10 text-erp-blue border-erp-blue/20"
          : "bg-erp-bg3 text-erp-text2 border-erp-border0 hover:text-erp-text1"
      )}
    >
      {children}
    </button>
  );
}

export function ErpTabs({ items, active, onChange }: {
  items: [string, string][]; active: string; onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-0 border-b border-erp-border0 mb-5">
      {items.map(([k, l]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            "px-[18px] py-[10px] text-[13px] cursor-pointer bg-transparent border-none -mb-px border-b-2 transition-all",
            active === k
              ? "font-semibold text-erp-text0 border-erp-blue"
              : "font-normal text-erp-text2 border-transparent hover:text-erp-text1"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function TH({ children }: { children?: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-[11px] text-[10.5px] font-semibold uppercase tracking-wider text-erp-text3 border-b border-erp-border0 bg-erp-bg3">
      {children}
    </th>
  );
}

export function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-[13px] border-b border-erp-border0 text-[13px]", className)}>
      {children}
    </td>
  );
}

export function TR({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} className="cursor-pointer hover:bg-erp-hover transition-colors duration-75">
      {children}
    </tr>
  );
}

export const fmt = (v: number) => new Intl.NumberFormat("nl-NL").format(v);
