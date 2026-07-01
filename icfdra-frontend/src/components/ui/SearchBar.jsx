import React from 'react'
import { Search } from 'lucide-react'
import { clsx } from '../../utils/helpers'

export default function SearchBar({ value, onChange, placeholder = 'Search…', className = '', onSubmit }) {
  return (
    <div className={clsx('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
        placeholder={placeholder}
        className="input-field pl-9 pr-4"
      />
    </div>
  )
}
