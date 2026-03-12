// Converts design_json blocks to email-safe HTML

export interface DesignSettings {
  backgroundColor: string;
  contentWidth: number;
  fontFamily: string;
  accentColor: string;
}

export interface Block {
  id: string;
  type: string;
  data: Record<string, any>;
}

export interface DesignJson {
  settings: DesignSettings;
  blocks: Block[];
}

const defaultSettings: DesignSettings = {
  backgroundColor: "#f4f4f5",
  contentWidth: 600,
  fontFamily: "Arial, sans-serif",
  accentColor: "#32C5FF",
};

function esc(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function nl2br(s: string): string {
  return (s || "").replace(/\n/g, "<br>");
}

function renderBlock(block: Block, settings: DesignSettings): string {
  const d = block.data || {};
  switch (block.type) {
    case "header": {
      const level = d.level || 1;
      const tag = `h${level}`;
      const sizes: Record<number, string> = { 1: "28px", 2: "22px", 3: "18px" };
      return `<${tag} style="margin:0;padding:16px 0;font-family:${settings.fontFamily};font-size:${sizes[level] || "28px"};font-weight:bold;text-align:${d.align || "center"};color:${d.color || "#1a1a1a"}">${nl2br(d.text || "")}</${tag}>`;
    }
    case "text": {
      const sizes: Record<string, string> = { small: "13px", normal: "15px", large: "18px" };
      return `<div style="padding:8px 0;font-family:${settings.fontFamily};font-size:${sizes[d.fontSize] || "15px"};line-height:1.6;text-align:${d.align || "left"};color:${d.color || "#374151"}">${nl2br(d.text || "")}</div>`;
    }
    case "image": {
      const img = `<img src="${esc(d.src || "")}" alt="${esc(d.alt || "")}" style="display:block;max-width:${d.width || "100%"};height:auto;margin:0 auto;" />`;
      const wrapped = d.url ? `<a href="${esc(d.url)}" target="_blank">${img}</a>` : img;
      return `<div style="padding:8px 0;text-align:${d.align || "center"}">${wrapped}</div>`;
    }
    case "button": {
      const w = d.fullWidth ? "display:block;width:100%;text-align:center;" : "display:inline-block;";
      return `<div style="padding:16px 0;text-align:${d.align || "center"}"><a href="${esc(d.url || "#")}" target="_blank" style="${w}background-color:${d.color || settings.accentColor};color:${d.textColor || "#ffffff"};padding:14px 28px;border-radius:${d.borderRadius || 6}px;text-decoration:none;font-family:${settings.fontFamily};font-size:15px;font-weight:600;">${esc(d.text || "Klik hier")}</a></div>`;
    }
    case "divider":
      return `<div style="padding:${d.padding || 20}px 0"><hr style="border:none;border-top:1px solid ${d.color || "#e5e7eb"};margin:0;" /></div>`;
    case "spacer":
      return `<div style="height:${d.height || 30}px"></div>`;
    case "columns": {
      const cols = d.columns || 2;
      const content = d.content || [];
      const colWidth = Math.floor(100 / cols);
      const cells = Array.from({ length: cols }, (_, i) => {
        const blocks = (content[i] || []) as Block[];
        const inner = blocks.map((b: Block) => renderBlock({ ...b, id: b.id || `col-${i}` }, settings)).join("");
        return `<td style="width:${colWidth}%;vertical-align:top;padding:0 8px;">${inner}</td>`;
      }).join("");
      return `<table width="100%" cellpadding="0" cellspacing="0" style="padding:8px 0"><tr>${cells}</tr></table>`;
    }
    case "social": {
      const links = (d.links || []) as Array<{ platform: string; url: string }>;
      const icons: Record<string, string> = {
        instagram: "📸", linkedin: "💼", facebook: "📘", x: "𝕏", youtube: "▶️",
      };
      const items = links.map(l => `<a href="${esc(l.url)}" target="_blank" style="display:inline-block;margin:0 6px;font-size:${d.iconSize || 20}px;text-decoration:none;">${icons[l.platform] || "🔗"}</a>`).join("");
      return `<div style="padding:12px 0;text-align:${d.align || "center"}">${items}</div>`;
    }
    case "footer":
      return `<div style="padding:16px 0;text-align:center;font-family:${settings.fontFamily};font-size:12px;color:#9ca3af;line-height:1.5">${nl2br(d.text || "")}${d.unsubscribeUrl !== false ? `<br><a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline;">Uitschrijven</a>` : ""}</div>`;
    default:
      return "";
  }
}

export function generateHtml(design: DesignJson): string {
  const s = { ...defaultSettings, ...design.settings };
  const blocksHtml = design.blocks.map(b => renderBlock(b, s)).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:${s.backgroundColor};font-family:${s.fontFamily};">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:${s.backgroundColor}">
<tr><td align="center" style="padding:24px 16px;">
<table width="${s.contentWidth}" cellpadding="0" cellspacing="0" style="max-width:${s.contentWidth}px;width:100%;background-color:#ffffff;border-radius:8px;">
<tr><td style="padding:32px 24px;">
${blocksHtml}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function getDefaultDesign(): DesignJson {
  return {
    settings: { ...defaultSettings },
    blocks: [
      { id: crypto.randomUUID(), type: "header", data: { text: "Welkom!", level: 1, align: "center" } },
      { id: crypto.randomUUID(), type: "text", data: { text: "Hoi {{first_name}}, bedankt voor je interesse!", align: "left" } },
      { id: crypto.randomUUID(), type: "button", data: { text: "Klik hier", url: "{{website_url}}", color: "#32C5FF", textColor: "#ffffff", align: "center", borderRadius: 6 } },
      { id: crypto.randomUUID(), type: "footer", data: { text: "{{org_name}} · {{org_email}}", unsubscribeUrl: true } },
    ],
  };
}
