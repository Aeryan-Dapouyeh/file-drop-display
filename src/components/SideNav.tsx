import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Table2 } from "lucide-react";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tables", label: "Data tables", icon: Table2 },
] as const;

export function SideNav() {
  return (
    <nav
      aria-label="Main navigation"
      className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-2 border-r border-border bg-background py-4"
    >
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: true }}
          title={item.label}
          aria-label={item.label}
          className="group flex h-11 w-11 flex-col items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
        >
          <item.icon className="h-5 w-5" />
        </Link>
      ))}
    </nav>
  );
}
