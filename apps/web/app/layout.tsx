import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "RelayOps",
  description: "Operations management platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex flex-1 flex-col min-h-svh">
            <header className="flex h-12 items-center border-b px-4">
              <SidebarTrigger />
            </header>
            <div className="flex-1 p-6">{children}</div>
          </main>
        </SidebarProvider>
      </body>
    </html>
  )
}
