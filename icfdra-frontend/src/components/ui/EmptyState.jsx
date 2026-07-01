import React from 'react'
import { FileX, Search, Inbox } from 'lucide-react'

const iconMap = {
  empty: Inbox,
  search: Search,
  error: FileX,
}

export default function EmptyState({
  icon = 'empty',
  title = 'No data found',
  description,
  action,
}) {
  const Icon = iconMap[icon] || Inbox
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-sm mb-5">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
