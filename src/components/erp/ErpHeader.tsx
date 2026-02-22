import { Icons } from "@/components/erp/ErpIcons";

export default function ErpHeader() {
  return (
    <header className="h-[52px] min-h-[52px] border-b border-erp-border0 flex items-center justify-between px-5 bg-erp-bg1">
      <div className="flex items-center gap-[7px] bg-erp-bg3 rounded-lg px-3 py-[6px] border border-erp-border0 w-[300px]">
        <span className="text-erp-text3"><Icons.Search className="w-[15px] h-[15px]" /></span>
        <input
          placeholder="Zoeken... (⌘K)"
          className="bg-transparent border-none outline-none text-erp-text0 text-[13px] w-full"
        />
      </div>
      <div className="flex items-center gap-1">
        <button className="w-[34px] h-[34px] rounded-lg flex items-center justify-center cursor-pointer text-erp-text2 bg-transparent border-none relative">
          <Icons.Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-[5px] right-[5px] w-[7px] h-[7px] rounded-full bg-erp-red border-2 border-erp-bg1" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-erp-blue to-erp-purple flex items-center justify-center text-xs font-semibold text-white ml-[6px] cursor-pointer">
          KG
        </div>
      </div>
    </header>
  );
}
