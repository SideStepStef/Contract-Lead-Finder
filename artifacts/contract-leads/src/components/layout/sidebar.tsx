import { Link, useLocation } from "wouter";
import { LayoutDashboard, Briefcase, Plus, Settings, BarChart2, Download, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "All Leads", href: "/leads", icon: Briefcase },
    { name: "Analytics", href: "/analytics", icon: TrendingUp },
    { name: "New Lead", href: "/leads/new", icon: Plus },
    { name: "Import from SAM.gov", href: "/import", icon: Download },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2 font-mono font-bold tracking-tight text-primary">
          <BarChart2 className="h-5 w-5" />
          <span>TERMINAL // CLF</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer",
                  isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Settings className="h-4 w-4" />
          <span>System Config</span>
        </div>
      </div>
    </div>
  );
}
