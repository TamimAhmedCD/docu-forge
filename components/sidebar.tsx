'use client'

import { useState, createContext, useContext, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  LayoutDashboard,
  Upload,
  FileOutput,
  ChevronLeft,
  ChevronRight,
  Settings,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Sidebar context for managing collapsed state
interface SidebarContextType {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  isMobileOpen: boolean
  setIsMobileOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }
  }, [])

  // Save collapsed state to localStorage
  const handleSetCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed))
  }, [])

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed: handleSetCollapsed,
        isMobileOpen,
        setIsMobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Templates', href: '/dashboard/templates', icon: FileText },
  { name: 'Upload', href: '/dashboard/upload', icon: Upload },
  { name: 'Generate', href: '/dashboard/generate', icon: FileOutput },
]

const secondaryNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Help', href: '/dashboard/help', icon: HelpCircle },
]

interface NavItemProps {
  item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }
  isActive: boolean
  isCollapsed: boolean
  onClick?: () => void
}

function NavItem({ item, isActive, isCollapsed, onClick }: NavItemProps) {
  const content = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        isCollapsed && 'justify-center px-2',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      )}
    >
      <item.icon 
        className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors',
          isActive ? 'text-sidebar-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground'
        )} 
      />
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="truncate"
          >
            {item.name}
          </motion.span>
        )}
      </AnimatePresence>
      {isActive && !isCollapsed && (
        <motion.div
          layoutId="activeIndicator"
          className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="font-medium">
          {item.name}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

export function Sidebar() {
  const pathname = usePathname()
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar()

  return (
    <TooltipProvider>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar sidebar-transition',
          'lg:relative lg:translate-x-0',
          isCollapsed ? 'w-[68px]' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo Header */}
        <div
          className={cn(
            'flex h-14 shrink-0 items-center border-b border-sidebar-border px-4',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="text-base font-semibold tracking-tight text-sidebar-foreground"
                >
                  DocuForge
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Navigation - fixed height, no scroll */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {/* Main nav */}
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavItem
                key={item.name}
                item={item}
                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                isCollapsed={isCollapsed}
                onClick={() => setIsMobileOpen(false)}
              />
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Secondary nav */}
          <div className="space-y-1 border-t border-sidebar-border pt-3">
            {secondaryNavigation.map((item) => (
              <NavItem
                key={item.name}
                item={item}
                isActive={pathname === item.href}
                isCollapsed={isCollapsed}
                onClick={() => setIsMobileOpen(false)}
              />
            ))}
          </div>
        </nav>

        {/* Collapse toggle - desktop only */}
        <div className="hidden shrink-0 border-t border-sidebar-border p-3 lg:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'w-full justify-start gap-2 text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              isCollapsed && 'justify-center px-2'
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </Button>
        </div>

        {/* Info card - only when expanded */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden px-3 pb-3"
            >
              <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
                <p className="text-[11px] leading-relaxed text-sidebar-muted">
                  All processing happens locally in your browser. Your data never leaves your device.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </TooltipProvider>
  )
}
