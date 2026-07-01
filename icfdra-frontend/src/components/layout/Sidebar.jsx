import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Upload, FileText, ClipboardList,
  BarChart3, ScrollText, Search, Settings, ChevronLeft,
  ChevronRight, Zap, X,
} from 'lucide-react'
import { useSidebar } from '../../context/SidebarContext'
import { clsx } from '../../utils/helpers'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Upload Invoice', icon: Upload, href: '/upload' },
  { label: 'Invoice Details', icon: FileText, href: '/invoices' },
  { label: 'Manual Review', icon: ClipboardList, href: '/review' },
  { label: 'Analytics', icon: BarChart3, href: '/analytics' },
  { label: 'Audit Logs', icon: ScrollText, href: '/audit' },
  { label: 'Semantic Search', icon: Search, href: '/search' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]

function NavItem({ item, collapsed }) {
  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        clsx('sidebar-nav-item group relative', isActive && 'active')
      }
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && (
        <span className="truncate">{item.label}</span>
      )}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
          {item.label}
        </div>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { collapsed, toggle, mobileOpen, closeMobile } = useSidebar()

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 h-screen bg-white border-r border-gray-200 z-40 flex flex-col sidebar-transition overflow-hidden',
          collapsed ? 'w-16' : 'w-64',
          // Mobile: slide in
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'transition-transform lg:transition-none'
        )}
        style={{ width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 h-16 flex-shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 leading-none">ICFDRA</p>
                <p className="text-[10px] text-gray-400 leading-tight mt-0.5 truncate">Financial Reconciliation</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mx-auto">
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
          {/* Mobile close */}
          <button
            onClick={closeMobile}
            className="lg:hidden p-1 rounded text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mb-2">
              Navigation
            </p>
          )}
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={toggle}
            className={clsx(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors',
              collapsed && 'justify-center'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
