"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  ClipboardList,
  Briefcase,
  CalendarDays,
  Receipt,
  ScrollText,
  LogOut,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useUser } from "@/lib/user-context"

interface NavItem {
  label: string
  href: string
  icon: React.FC<{ className?: string }>
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Requests", href: "/requests", icon: ClipboardList },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Schedule", href: "/schedule", icon: CalendarDays },
  {
    label: "Invoices",
    href: "/invoices",
    icon: Receipt,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    label: "Activity",
    href: "/activity",
    icon: ScrollText,
    roles: ["ADMIN", "MANAGER"],
  },
]

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useUser()

  const visibleItems = navItems.filter(
    ({ roles }) => !roles || !user || roles.includes(user.role)
  )

  async function handleLogout() {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    })
    router.push("/login")
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <span className="text-lg font-semibold tracking-tight">RelayOps</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map(({ label, href, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    render={<Link href={href} />}
                    isActive={pathname === href || pathname.startsWith(href + "/")}
                    className="flex items-center gap-2"
                  >
                    <Icon className="size-4" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-2 py-2">
        {user && (
          <div className="flex flex-col gap-1 px-2 pb-1">
            <span className="text-sm font-medium truncate">{user.email}</span>
            <span className="text-muted-foreground text-xs">{user.role}</span>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
