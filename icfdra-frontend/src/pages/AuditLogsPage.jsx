import React, { useState } from 'react'
import { Download, Filter, Calendar } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Breadcrumb from '../components/ui/Breadcrumb'
import Table, { Pagination } from '../components/ui/Table'
import SearchBar from '../components/ui/SearchBar'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import { MOCK_AUDIT_LOGS } from '../utils/mockData'
import { formatDateTime, getSeverityColor } from '../utils/helpers'
import { useTable } from '../hooks/useTable'
import toast from 'react-hot-toast'

const COLUMNS = [
  {
    key: 'id',
    label: 'Log ID',
    render: (v) => <span className="font-mono text-xs text-gray-500">{v}</span>
  },
  {
    key: 'action',
    label: 'Action',
    sortable: true,
    render: (v, row) => (
      <div className="flex items-center gap-2">
        <Badge color={getSeverityColor(row.severity)} dot>{v}</Badge>
      </div>
    )
  },
  { key: 'actor', label: 'Actor', sortable: true },
  {
    key: 'target',
    label: 'Target',
    render: (v) => <span className="font-mono text-xs text-gray-700">{v}</span>
  },
  { key: 'details', label: 'Details', render: (v) => <span className="text-xs text-gray-500 truncate max-w-xs block">{v}</span> },
  {
    key: 'timestamp',
    label: 'Timestamp',
    sortable: true,
    render: (v) => <span className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(v)}</span>
  },
]

function TimelineView({ logs }) {
  return (
    <div className="space-y-0">
      {logs.slice(0, 8).map((log, i) => (
        <div key={log.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
              log.severity === 'success' ? 'bg-emerald-500' :
              log.severity === 'error' ? 'bg-red-500' :
              log.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-400'
            }`} />
            {i < 7 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
          </div>
          <div className="pb-4 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-gray-800">{log.action}</p>
              <Badge color={getSeverityColor(log.severity)}>{log.severity}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="font-medium">{log.actor}</span> · {log.target}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{log.details}</p>
            <p className="text-[10px] text-gray-300 mt-0.5">{formatDateTime(log.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AuditLogsPage() {
  const [view, setView] = useState('table')
  const { data, totalCount, search, setSearch, sort, pagination, setFilter } = useTable(MOCK_AUDIT_LOGS, { pageSize: 8 })

  const handleExport = () => {
    toast.success('Audit log CSV exported successfully.')
  }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: 'Audit Logs' }]} />
        <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
          <div>
            <h1 className="page-title">Audit Logs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Complete activity trail · {MOCK_AUDIT_LOGS.length} records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(v => v === 'table' ? 'timeline' : 'table')}
              className="btn-secondary"
            >
              {view === 'table' ? <Calendar className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
              {view === 'table' ? 'Timeline' : 'Table'} View
            </button>
            <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Total Events', count: MOCK_AUDIT_LOGS.length, color: 'blue' },
          { label: 'Approvals', count: MOCK_AUDIT_LOGS.filter(l => l.severity === 'success').length, color: 'green' },
          { label: 'Rejections', count: MOCK_AUDIT_LOGS.filter(l => l.severity === 'error').length, color: 'red' },
          { label: 'Warnings', count: MOCK_AUDIT_LOGS.filter(l => l.severity === 'warning').length, color: 'yellow' },
        ].map(item => (
          <div key={item.label} className="card px-4 py-2.5 flex items-center gap-3">
            <Badge color={item.color}>{item.count}</Badge>
            <span className="text-sm text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>

      <Card noPadding>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search logs…"
            className="flex-1 min-w-48"
          />
          <Select
            className="w-40"
            onChange={(e) => setFilter('severity', e.target.value)}
            defaultValue=""
          >
            <option value="">All Severity</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </Select>
          <span className="text-xs text-gray-400 ml-auto">{totalCount} results</span>
        </div>

        {view === 'table' ? (
          <>
            <Table columns={COLUMNS} data={data} sort={sort} emptyTitle="No audit logs found" />
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPage={pagination.setPage} />
          </>
        ) : (
          <div className="p-6">
            <TimelineView logs={data} />
          </div>
        )}
      </Card>
    </div>
  )
}
