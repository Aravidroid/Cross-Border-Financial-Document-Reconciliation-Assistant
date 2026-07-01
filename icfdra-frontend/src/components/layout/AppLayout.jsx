import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useSidebar } from '../../context/SidebarContext'
import { clsx } from '../../utils/helpers'

export default function AppLayout() {
  const { collapsed } = useSidebar()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Sidebar />

      {/* Main content */}
      <main
        className={clsx(
          'min-h-screen pt-16 transition-all duration-300 ease-in-out',
          'lg:ml-[var(--sidebar-width)]',
          collapsed && 'lg:ml-[var(--sidebar-collapsed-width)]'
        )}
        style={{
          marginLeft: undefined,
        }}
      >
        <div className="p-6 max-w-screen-2xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
