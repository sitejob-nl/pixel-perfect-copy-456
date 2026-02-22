import { Icons, type IconName } from "@/components/erp/ErpIcons";

export default function PlaceholderPage({ title, icon }: { title: string; icon: IconName }) {
  const Icon = Icons[icon];
  return (
    <div className="flex flex-col items-center justify-center h-[55vh] gap-[14px] animate-fade-up">
      <div className="w-[52px] h-[52px] rounded-[14px] bg-erp-blue/10 flex items-center justify-center text-erp-blue">
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-[13px] text-erp-text3 text-center max-w-[300px]">
        Module wordt gebouwd in SiteJob ERP v2
      </div>
    </div>
  );
}
