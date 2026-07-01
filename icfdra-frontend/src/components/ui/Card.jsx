import React from 'react'
import { clsx } from '../../utils/helpers'

export default function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  noPadding = false,
  hover = false,
}) {
  return (
    <div className={clsx(
      'card',
      hover && 'hover:shadow-md transition-shadow duration-200',
      className
    )}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            {title && <h3 className="section-title">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  )
}

export function StatCard({ title, value, subtitle, icon, color = 'blue', change, changeDir }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-500' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-500' },
    yellow: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
    red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'text-purple-500' },
  }
  const c = colorMap[color] || colorMap.blue

  return (
    <div className="card p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {change && (
            <div className={clsx(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              changeDir === 'up' ? 'text-emerald-600' : 'text-red-500'
            )}>
              <span>{changeDir === 'up' ? '↑' : '↓'}</span>
              <span>{change}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={clsx('p-3 rounded-xl', c.bg)}>
            <div className={clsx('w-5 h-5', c.icon)}>{icon}</div>
          </div>
        )}
      </div>
    </div>
  )
}
