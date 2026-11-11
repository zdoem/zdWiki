"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Search, 
  HelpCircle, 
  BookOpen, 
  Cpu, 
  Layers, 
  Box, 
  CheckCircle2, 
  Bug, 
  PlaySquare, 
  GitPullRequest, 
  FileText, 
  RefreshCw, 
  Network, 
  FolderGit2
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navSections = [
    {
      title: "Core Workflows",
      items: [
        { label: "Dashboard", href: "/", icon: Layers },
        { label: "Universal Search", href: "/search", icon: Search },
        { label: "Ask zdWiki", href: "/ask", icon: HelpCircle },
        { label: "Context Graph", href: "/graph", icon: Network },
        { label: "Engineering Loops", href: "/loops", icon: RefreshCw },
      ],
    },
    {
      title: "Knowledge Objects",
      items: [
        { label: "Concepts", href: "/knowledge?type=concept", icon: BookOpen },
        { label: "Technologies", href: "/knowledge?type=technology", icon: Cpu },
        { label: "Patterns", href: "/knowledge?type=pattern", icon: Layers },
        { label: "Architectures", href: "/knowledge?type=architecture", icon: Box },
        { label: "Tests", href: "/knowledge?type=test", icon: CheckCircle2 },
        { label: "Bugs", href: "/knowledge?type=bug", icon: Bug },
        { label: "Debug Playbooks", href: "/knowledge?type=debug_playbook", icon: PlaySquare },
        { label: "Decisions", href: "/knowledge?type=decision", icon: GitPullRequest },
        { label: "Analyses", href: "/knowledge?type=analysis", icon: FileText },
      ],
    },
    {
      title: "Provenance",
      items: [
        { label: "Sources & Archive", href: "/sources", icon: FolderGit2 },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-surfaceBorder bg-surface flex flex-col h-screen sticky top-0 transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-surfaceBorder flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-md">
            zd
          </div>
          <div>
            <span className="font-heading font-bold tracking-tight text-textMain block leading-none text-base">zdWiki</span>
            <span className="text-[10px] text-textMuted font-mono tracking-wide">v1.0 • Knowledge OS</span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-textMuted px-3 mb-2 font-heading">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/" 
                  ? pathname === "/" 
                  : pathname === item.href || (item.href.length > 1 && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                        : "text-textMuted hover:text-textMain hover:bg-surfaceSubtle border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4 opacity-80" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-surfaceBorder text-xs text-textMuted flex items-center justify-between">
        <span>Local-first • Markdown</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-sm"></span>
      </div>
    </aside>
  );
}
