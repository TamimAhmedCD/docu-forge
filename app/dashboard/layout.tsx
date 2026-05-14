'use client'

import { Menu, Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sidebar, SidebarProvider, useSidebar } from '@/components/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed, setIsMobileOpen } = useSidebar()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - fixed, doesn't scroll */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-sm lg:px-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(true)}
            className="shrink-0 lg:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search templates, documents..."
              className="h-9 w-full bg-muted/50 pl-9 pr-4 text-sm border-transparent focus:border-border focus:bg-background"
              tabIndex={-1}
            />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative h-9 w-9" tabIndex={-1}>
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
              <span className="sr-only">Notifications</span>
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" tabIndex={-1}>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary">
                <User className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="sr-only">User menu</span>
            </Button>
          </div>
        </header>

        {/* Page content - scrollable */}
        <main className={cn(
          'flex-1 overflow-y-auto custom-scrollbar',
          'transition-[margin] duration-200'
        )}>
          <div className="animate-in-fast">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  )
}
