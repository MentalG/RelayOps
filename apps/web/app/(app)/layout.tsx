import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { UserProvider } from "@/lib/user-context"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <SidebarProvider>
        <AppSidebar />
        <main className="flex flex-1 flex-col min-h-svh">
          <header className="flex h-12 items-center border-b px-4">
            <SidebarTrigger />
          </header>
          <div className="flex-1 p-6">{children}</div>
        </main>
      </SidebarProvider>
    </UserProvider>
  )
}
