import { Icons } from "@/components/erp/ErpIcons";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileNav from "./MobileNav";
import NotificationBell from "./NotificationBell";

interface Props {
  onSearchClick?: () => void;
}

export default function ErpHeader({ onSearchClick }: Props) {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();

  const initials = (() => {
    const name = user?.user_metadata?.full_name || user?.email || "";
    if (name.includes("@")) return name.slice(0, 2).toUpperCase();
    return name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "??";
  })();

  return (
    <header className="h-[52px] min-h-[52px] border-b border-erp-border0 flex items-center justify-between px-3 md:px-5 bg-erp-bg1">
      <div className="flex items-center gap-2">
        {isMobile && <MobileNav />}
        <div
          onClick={onSearchClick}
          className={cn("flex items-center gap-[7px] bg-erp-bg3 rounded-lg px-3 py-[6px] border border-erp-border0 cursor-pointer hover:border-erp-text3 transition-colors", isMobile ? "flex-1" : "w-[300px]")}
        >
          <span className="text-erp-text3"><Icons.Search className="w-[15px] h-[15px]" /></span>
          <span className="text-erp-text3 text-[13px]">{isMobile ? "Zoeken..." : "Vraag iets aan AI... (⌘K)"}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-erp-blue to-erp-purple flex items-center justify-center text-xs font-semibold text-white ml-[6px] cursor-pointer">
              {initials}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-erp-bg2 border-erp-border0 text-erp-text0">
            <DropdownMenuItem className="text-xs text-erp-text3 focus:bg-erp-hover" disabled>
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs cursor-pointer focus:bg-erp-hover" onClick={() => signOut()}>
              <Icons.LogOut className="w-3.5 h-3.5 mr-2" /> Uitloggen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
