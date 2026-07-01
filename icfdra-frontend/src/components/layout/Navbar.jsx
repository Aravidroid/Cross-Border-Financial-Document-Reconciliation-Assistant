import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Menu, Bell, ChevronDown, LogOut, User,
  Settings, HelpCircle, Shield,
} from 'lucide-react'
import { useSidebar } from '../../context/SidebarContext'
import { useAuth } from '../../context/AuthContext'
import { MOCK_NOTIFICATIONS } from '../../utils/mockData'
import Badge from '../ui/Badge'
import { clsx } from '../../utils/helpers'

function NotificationPanel({ onClose }) {
  const unread = MOCK_NOTIFICATIONS.filter(n => !n.read).length
  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 animate-fade-in overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
        {unread > 0 && <Badge color="blue">{unread} new</Badge>}
      </div>
      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
        {MOCK_NOTIFICATIONS.map(n => (
          <div key={n.id} className={clsx('px-4 py-3 hover:bg-gray-50 cursor-pointer', !n.read && 'bg-blue-50/50')}>
            <div className="flex items-start gap-2">
              <span className={clsx(
                'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                n.type === 'alert' ? 'bg-red-500' :
                n.type === 'success' ? 'bg-emerald-500' :
                n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
              )} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate-2">{n.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
        <button className="text-xs text-blue-600 hover:underline w-full text-center">
          View all notifications
        </button>
      </div>
    </div>
  )
}

function UserMenu({ user, onLogout, onClose }) {
  return (
    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-xl z-50 animate-fade-in overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
        <p className="text-xs text-gray-500">{user.email}</p>
        <Badge color="blue" className="mt-1">{user.role}</Badge>
      </div>
      <div className="py-1">
        <Link to="/settings" onClick={onClose} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <User className="w-4 h-4 text-gray-400" /> My Profile
        </Link>
        <Link to="/settings" onClick={onClose} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <Settings className="w-4 h-4 text-gray-400" /> Settings
        </Link>
        <Link to="/settings" onClick={onClose} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <Shield className="w-4 h-4 text-gray-400" /> Security
        </Link>
        <Link to="#" onClick={onClose} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <HelpCircle className="w-4 h-4 text-gray-400" /> Help & Support
        </Link>
      </div>
      <div className="py-1 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  )
}

export default function Navbar() {
  const { toggleMobile } = useSidebar()
  const { user, logout } = useAuth()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const notifRef = useRef()
  const userRef = useRef()

  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="fixed top-0 right-0 left-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center px-4 gap-3">
      {/* Mobile menu button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Spacer to account for sidebar */}
      <div className="hidden lg:block" style={{ width: 0 }} />

      {/* Title — center on mobile */}
      <div className="flex-1">
        <span className="text-sm font-semibold text-gray-500 lg:hidden">ICFDRA</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(p => !p); setUserOpen(false) }}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
            id="notifications-btn"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>

        {/* User Menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => { setUserOpen(p => !p); setNotifOpen(false) }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            id="user-menu-btn"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">{getInitials(user?.name)}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-none">{user?.name?.split(' ')[0]}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-none">{user?.role?.split(' ').slice(-1)[0]}</p>
            </div>
            <ChevronDown className={clsx('w-4 h-4 text-gray-400 transition-transform', userOpen && 'rotate-180')} />
          </button>
          {userOpen && (
            <UserMenu
              user={user}
              onLogout={() => { logout(); setUserOpen(false) }}
              onClose={() => setUserOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  )
}
