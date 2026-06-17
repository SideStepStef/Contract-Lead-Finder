import { Link, useLocation } from "wouter";
import { LayoutDashboard, Briefcase, Plus, Settings, BarChart2, Download, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useListLeads } from "@workspace/api-client-react";
import { parseISO, differenceInDays } from "date-fns";

function useUpcomingDeadlineCount() {
  const { data: leads } = useListLeads();
  if (!leads) return { total: 0, urgent: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysOut = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  let total = 0;
  let urgent = 0;

  for (const lead of leads) {
    if (!lead.deadline) continue;
    if (["won", "lost", "archived"].includes(lead.status)) continue;
    const d = parseISO(lead.deadline);
    if (d >= today && d <= sevenDaysOut) {
      total++;
      if (differenceInDays(d, today) <= 2) urgent++;
    }
  }

  return { total, urgent };
}

export function Sidebar() {
  const [location] = useLocation();
  const { total: deadlineCount, urgent: urgentCount } = useUpcomingDeadlineCount();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, badge: deadlineCount },
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
          const hasBadge = (item.badge ?? 0) > 0;
          const isUrgentBadge = urgentCount > 0 && item.href === "/";

          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer",
                  isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.name}</span>
                {hasBadge && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold font-mono leading-none",
                      isUrgentBadge
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-amber-500 text-white"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
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
