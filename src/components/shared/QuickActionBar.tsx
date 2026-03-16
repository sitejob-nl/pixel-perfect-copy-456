import { Phone, Mail, Globe, Linkedin, MessageCircle, MessageSquare } from "lucide-react";

interface Action {
  icon: React.ReactNode;
  label: string;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
}

interface Props {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  mobile?: string | null;
}

export default function QuickActionBar({ phone, email, website, linkedinUrl, mobile }: Props) {
  const phoneNumber = phone || mobile;
  const waNumber = (mobile || phone)?.replace(/\D/g, "") ?? "";

  const actions: Action[] = [
    { icon: <Phone className="w-4 h-4" />, label: "Bel", href: phoneNumber ? `tel:${phoneNumber}` : undefined, disabled: !phoneNumber },
    { icon: <MessageCircle className="w-4 h-4" />, label: "WhatsApp", href: waNumber ? `https://wa.me/${waNumber}` : undefined, disabled: !waNumber },
    { icon: <Mail className="w-4 h-4" />, label: "Email", href: email ? `mailto:${email}` : undefined, disabled: !email },
    { icon: <Globe className="w-4 h-4" />, label: "Website", href: website ? (website.startsWith("http") ? website : `https://${website}`) : undefined, disabled: !website },
    { icon: <Linkedin className="w-4 h-4" />, label: "LinkedIn", href: linkedinUrl || undefined, disabled: !linkedinUrl },
  ];

  return (
    <div className="flex gap-1.5 flex-wrap">
      {actions.map((a, i) => {
        const baseClass = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border";
        if (a.disabled) {
          return (
            <span key={i} className={`${baseClass} bg-erp-bg3 border-erp-border0 text-erp-text3 opacity-40 cursor-not-allowed`}>
              {a.icon} <span className="hidden sm:inline">{a.label}</span>
            </span>
          );
        }
        return (
          <a
            key={i}
            href={a.href}
            target={a.label === "Bel" || a.label === "Email" ? undefined : "_blank"}
            rel="noopener"
            className={`${baseClass} bg-erp-bg3 border-erp-border0 text-erp-text1 hover:bg-erp-hover hover:text-erp-text0`}
          >
            {a.icon} <span className="hidden sm:inline">{a.label}</span>
          </a>
        );
      })}
    </div>
  );
}
