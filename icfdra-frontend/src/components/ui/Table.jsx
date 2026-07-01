import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { clsx } from '../../utils/helpers'
import EmptyState from './EmptyState'

export default function Table({
  columns = [],
  data = [],
  onRowClick,
  sort,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription,
  className = '',
}) {
  if (loading) {
    return (
      <div className="w-full overflow-x-auto">
        <table className={clsx('w-full border-collapse', className)}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="table-header">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                {columns.map((col) => (
                  <td key={col.key} className="table-cell">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!data.length) {
    return <EmptyState icon="search" title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className={clsx('w-full border-collapse', className)}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx('table-header', col.sortable && sort && 'cursor-pointer select-none hover:bg-gray-100')}
                style={{ width: col.width }}
                onClick={() => col.sortable && sort?.toggle(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sort && (
                    <span className="flex flex-col ml-1">
                      <ChevronUp className={clsx('w-3 h-3', sort.key === col.key && sort.dir === 'asc' ? 'text-blue-600' : 'text-gray-300')} />
                      <ChevronDown className={clsx('w-3 h-3 -mt-1', sort.key === col.key && sort.dir === 'desc' ? 'text-blue-600' : 'text-gray-300')} />
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              className={clsx(
                'hover:bg-gray-50 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className={clsx('table-cell', col.className)}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ page, totalPages, onPage }) {
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (i === 0) return 1
    if (i === 6) return totalPages
    if (page <= 4) return i + 1
    if (page >= totalPages - 3) return totalPages - 6 + i
    return page - 3 + i
  })

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Page <span className="font-medium">{page}</span> of{' '}
        <span className="font-medium">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-2 py-1 text-sm rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        {pages.map((p, i) => (
          <button
            key={i}
            onClick={() => typeof p === 'number' && onPage(p)}
            className={clsx(
              'w-8 h-8 text-sm rounded',
              p === page
                ? 'bg-blue-600 text-white font-medium'
                : 'hover:bg-gray-100 text-gray-600'
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="px-2 py-1 text-sm rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
