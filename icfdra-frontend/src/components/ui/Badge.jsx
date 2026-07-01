import React from 'react'
import { clsx } from '../../utils/helpers'

const colorMap = {
  blue: 'badge-blue',
  green: 'badge-green',
  yellow: 'badge-yellow',
  red: 'badge-red',
  gray: 'badge-gray',
  purple: 'badge-purple',
}

export default function Badge({ children, color = 'gray', dot = false, className = '' }) {
  return (
    <span className={clsx(colorMap[color] || colorMap.gray, className)}>
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full mr-1.5 inline-block',
          color === 'green' ? 'bg-emerald-500' :
          color === 'yellow' ? 'bg-amber-500' :
          color === 'red' ? 'bg-red-500' :
          color === 'blue' ? 'bg-blue-500' :
          color === 'purple' ? 'bg-purple-500' :
          'bg-gray-400'
        )} />
      )}
      {children}
    </span>
  )
}
