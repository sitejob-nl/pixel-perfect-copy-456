import {
  Home, Users, Building2, Kanban, Zap, FileText, Receipt, FolderOpen,
  Calendar, Globe, MessageCircle, PenLine, Search, Plus, Bell, Settings, ChevronDown, LogOut,
  Pencil, Trash2, Bot, Menu, ShieldCheck,
} from "lucide-react";

export const Icons = {
  Home, Users, Building: Building2, Kanban, Zap, File: FileText, Receipt,
  Folder: FolderOpen, Calendar, Globe, Msg: MessageCircle, Pen: PenLine,
  Search, Plus, Bell, Settings, ChevDown: ChevronDown, LogOut,
  Edit: Pencil, Trash: Trash2, Bot, Menu, Shield: ShieldCheck,
};

export type IconName = keyof typeof Icons;
