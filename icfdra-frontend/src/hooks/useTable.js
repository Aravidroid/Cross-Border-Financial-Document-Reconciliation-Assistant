import { useState, useCallback, useMemo } from 'react'

/**
 * Hook for table operations: search, sort, filter, pagination
 */
export function useTable(data = [], options = {}) {
  const { pageSize: defaultPageSize = 10 } = options
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [filters, setFilters] = useState({})

  const handleSort = useCallback((key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }, [sortKey])

  const handleSearch = useCallback((val) => {
    setSearch(val)
    setPage(1)
  }, [])

  const handleFilter = useCallback((key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }))
    setPage(1)
  }, [])

  const filtered = useMemo(() => {
    let result = [...data]

    // Text search
    if (search) {
      const lower = search.toLowerCase()
      result = result.filter(row =>
        Object.values(row).some(v =>
          String(v).toLowerCase().includes(lower)
        )
      )
    }

    // Filters
    Object.entries(filters).forEach(([key, val]) => {
      if (val && val !== 'all') {
        result = result.filter(row => String(row[key]) === String(val))
      }
    })

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        const cmp = typeof av === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [data, search, filters, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return {
    data: paginated,
    allFiltered: filtered,
    totalCount: filtered.length,
    search, setSearch: handleSearch,
    sort: { key: sortKey, dir: sortDir, toggle: handleSort },
    pagination: { page, pageSize, totalPages, setPage, setPageSize },
    filters, setFilter: handleFilter,
  }
}
