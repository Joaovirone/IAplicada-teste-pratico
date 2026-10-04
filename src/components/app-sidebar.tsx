import { Link, useRouterState } from "@tanstack/react-router";
import {
  Boxes,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const navigation = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Novo Pedido", url: "/novo-pedido", icon: ShoppingCart },
  { title: "Gestão de Pedidos", url: "/pedidos", icon: ClipboardList },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
] as const;

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const currentPath = useRouterState({ select: (router) => router.location.pathname });
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <Link to="/" className="flex h-10 items-center gap-3 overflow-hidden" onClick={() => setOpenMobile(false)}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Boxes className="size-4" aria-hidden="true" />
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block text-sm font-extrabold">SmartLar Hub</span>
              <span className="block truncate text-xs text-sidebar-foreground/60">Gestão comercial</span>
            </span>
          ) : null}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const active = item.url === "/" ? currentPath === "/" : currentPath.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title} size="lg">
                      <Link to={item.url} onClick={() => setOpenMobile(false)}>
                        <item.icon aria-hidden="true" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
