import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle,
  Building, Calendar, DollarSign, FileText, Globe, Hash,
  Shield, Activity, ExternalLink, TrendingUp
} from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Breadcrumb from '../components/ui/Breadcrumb'
import { MOCK_INVOICES } from '../utils/mockData'
import {
  formatCurrency, formatDate, formatDateTime,
  getStatusColor, getStatusLabel, getRiskColor, COUNTRY_FLAGS
} from '../utils/helpers'
import toast from 'react-hot-toast'

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 flex-shrink-0 w-40">{label}</span>
      <span className={`text-sm text-gray-900 font-medium text-right ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}

function TimelineItem({ event, timestamp, actor, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1 mb-1" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium text-gray-800">{event}</p>
        <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(timestamp)} · {actor}</p>
      </div>
    </div>
  )
}

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const invoice = MOCK_INVOICES.find(inv => inv.id === id) || MOCK_INVOICES[0]

  const handleApprove = () => {
    toast.success(`Invoice ${invoice.id} approved successfully.`)
  }
  const handleReject = () => {
    toast.error(`Invoice ${invoice.id} has been rejected.`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumb items={[
          { label: 'Invoice Details', href: '/invoices' },
          { label: invoice.id }
        ]} />
        <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/invoices')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="page-title">{invoice.id}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge color={getStatusColor(invoice.status)} dot>
                  {getStatusLabel(invoice.status)}
                </Badge>
                <Badge color={getRiskColor(invoice.riskLevel)}>
                  {invoice.riskLevel} risk
                </Badge>
              </div>
            </div>
          </div>
          {invoice.status === 'pending_review' && (
            <div className="flex gap-2">
              <button onClick={handleReject} className="btn-danger">
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button onClick={handleApprove} className="btn-success">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: 'Invoice Amount', value: formatCurrency(invoice.amount, invoice.currency), sub: `${invoice.currency}` },
          { icon: TrendingUp, label: 'USD Equivalent', value: formatCurrency(invoice.amountUSD), sub: `FX Rate: ${invoice.fxRate}` },
          { icon: Calendar, label: 'Due Date', value: formatDate(invoice.dueDate), sub: invoice.paymentTerms },
          { icon: Activity, label: 'AI Confidence', value: `${invoice.confidence}%`, sub: `${invoice.category}` },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-base font-bold text-gray-900 mt-0.5">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Validation Issues */}
          {invoice.validationIssues?.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">Validation Issues ({invoice.validationIssues.length})</p>
              </div>
              <ul className="space-y-1">
                {invoice.validationIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vendor Info */}
          <Card title="Vendor Information" icon={<Building className="w-4 h-4" />}>
            <InfoRow label="Vendor Name" value={invoice.vendor} />
            <InfoRow label="Country" value={`${COUNTRY_FLAGS[invoice.vendorCountry] || ''} ${invoice.vendorCountry}`} />
            <InfoRow label="Tax ID" value={invoice.taxId} mono />
            <InfoRow label="Invoice Number" value={invoice.invoiceNumber} mono />
            <InfoRow label="PO Reference" value={invoice.poNumber} mono />
            <InfoRow label="Payment Terms" value={invoice.paymentTerms} />
          </Card>

          {/* Line Items */}
          <Card title="Invoice Line Items" noPadding>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header text-left">Description</th>
                    <th className="table-header text-right w-20">Qty</th>
                    <th className="table-header text-right w-32">Unit Price</th>
                    <th className="table-header text-right w-32">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="table-cell">{item.description}</td>
                      <td className="table-cell text-right">{item.quantity}</td>
                      <td className="table-cell text-right">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                      <td className="table-cell text-right font-semibold">{formatCurrency(item.total, invoice.currency)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="table-cell font-semibold text-right">Total</td>
                    <td className="table-cell text-right font-bold text-blue-700">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* FX Section */}
          <Card title="FX Conversion Details">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Source Amount</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(invoice.amount, invoice.currency)}</p>
                <p className="text-xs text-gray-400">{invoice.currency}</p>
              </div>
              <div className="flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-2xl">→</div>
                  <p className="text-xs mt-1">Rate: <span className="font-semibold text-gray-700">{invoice.fxRate}</span></p>
                  <p className="text-[10px] text-gray-400">ECB Reference</p>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">USD Equivalent</p>
                <p className="text-lg font-bold text-blue-700 mt-1">{formatCurrency(invoice.amountUSD)}</p>
                <p className="text-xs text-gray-400">USD</p>
              </div>
            </div>
            <div className="mt-3 p-2.5 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Rate Source: European Central Bank · Deviation from interbank: <span className={invoice.riskLevel === 'high' || invoice.riskLevel === 'critical' ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                {invoice.riskLevel === 'high' ? '+2.3%' : invoice.riskLevel === 'critical' ? '+4.1%' : '<0.5%'}
              </span></p>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* AI Risk Summary */}
          <Card title="AI Risk Summary" action={<Shield className="w-4 h-4 text-blue-500" />}>
            <div className="flex items-center gap-3 mb-3">
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={invoice.confidence >= 85 ? '#059669' : invoice.confidence >= 65 ? '#d97706' : '#dc2626'}
                    strokeWidth="3"
                    strokeDasharray={`${invoice.confidence} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
                  {invoice.confidence}%
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Confidence Score</p>
                <Badge color={getRiskColor(invoice.riskLevel)}>{invoice.riskLevel} risk</Badge>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{invoice.aiRiskSummary}</p>
          </Card>

          {/* Invoice Metadata */}
          <Card title="Invoice Metadata">
            <InfoRow label="Uploaded" value={formatDate(invoice.uploadedAt)} />
            <InfoRow label="Category" value={invoice.category} />
            <InfoRow label="Currency" value={invoice.currency} />
          </Card>

          {/* Timeline */}
          <Card title="Processing Timeline">
            <div className="pt-1">
              {invoice.timeline?.map((t, i) => (
                <TimelineItem
                  key={i}
                  event={t.event}
                  timestamp={t.timestamp}
                  actor={t.actor}
                  isLast={i === invoice.timeline.length - 1}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
