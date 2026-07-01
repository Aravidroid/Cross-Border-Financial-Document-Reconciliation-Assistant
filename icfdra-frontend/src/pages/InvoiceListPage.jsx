import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Filter, Search } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Breadcrumb from '../components/ui/Breadcrumb'
import Table, { Pagination } from '../components/ui/Table'
import SearchBar from '../components/ui/SearchBar'
import { Select } from '../components/ui/Input'
import { MOCK_INVOICES } from '../utils/mockData'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, getRiskColor } from '../utils/helpers'
import { useTable } from '../hooks/useTable'

const COLUMNS = [
  { key: 'id', label: 'Invoice ID', sortable: true, render: (v) => (
    <span className="font-mono text-xs font-semibold text-blue-700">{v}</span>
  )},
  { key: 'vendor', label: 'Vendor', sortable: true },
  {
    key: 'amount',
    label: 'Amount',
    sortable: true,
    render: (v, row) => (
      <div>
        <p className="font-semibold text-gray-900">{formatCurrency(v, row.currency)}</p>
        <p className="text-xs text-gray-400">{formatCurrency(row.amountUSD)} USD</p>
      </div>
    )
  },
  {
    key: 'status',
    label: 'Status',
    render: (v) => <Badge color={getStatusColor(v)} dot>{getStatusLabel(v)}</Badge>
  },
  {
    key: 'riskLevel',
    label: 'Risk',
    render: (v) => <Badge color={getRiskColor(v)}>{v}</Badge>
  },
  {
    key: 'confidence',
    label: 'Confidence',
    render: (v) => (
      <div className="flex items-center gap-2">
        <div className="w-16 progress-bar">
          <div className="progress-fill" style={{ width: `${v}%`, background: v >= 85 ? '#059669' : v >= 65 ? '#d97706' : '#dc2626' }} />
        </div>
        <span className="text-xs text-gray-600">{v}%</span>
      </div>
    )
  },
  {
    key: 'uploadedAt',
    label: 'Date',
    sortable: true,
    render: (v) => <span className="text-xs text-gray-500">{formatDate(v)}</span>
  },
  {
    key: 'id',
    label: '',
    render: (v) => (
      <Link
        to={`/invoices/${v}`}
        className="text-xs text-blue-600 hover:underline flex items-center gap-1 whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        View <ArrowRight className="w-3 h-3" />
      </Link>
    )
  },
]

export default function InvoiceListPage() {
  const navigate = useNavigate()
  const { data, totalCount, search, setSearch, sort, pagination, setFilter } = useTable(MOCK_INVOICES, { pageSize: 8 })

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: 'Invoice Details' }]} />
        <div className="flex items-center justify-between mt-3">
          <div>
            <h1 className="page-title">Invoice Details</h1>
            <p className="text-sm text-gray-500 mt-1">{MOCK_INVOICES.length} invoices · Click a row to view full details</p>
          </div>
        </div>
      </div>

      <Card noPadding>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search invoices…"
            className="flex-1 min-w-48"
          />
          <Select
            className="w-40"
            onChange={(e) => setFilter('status', e.target.value)}
            defaultValue=""
          >
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="pending_review">Pending Review</option>
            <option value="processing">Processing</option>
          </Select>
          <Select
            className="w-36"
            onChange={(e) => setFilter('riskLevel', e.target.value)}
            defaultValue=""
          >
            <option value="">All Risk</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
          <span className="text-xs text-gray-400 ml-auto">{totalCount} results</span>
        </div>

        <Table
          columns={COLUMNS}
          data={data}
          sort={sort}
          onRowClick={(row) => navigate(`/invoices/${row.id}`)}
        />
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPage={pagination.setPage}
        />
      </Card>
    </div>
  )
}
