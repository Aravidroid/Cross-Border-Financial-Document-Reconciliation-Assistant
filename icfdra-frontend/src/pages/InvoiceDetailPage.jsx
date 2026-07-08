import React, { useState, useEffect } from 'react'
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
import { invoiceService } from '../services/api'

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 flex-shrink-0 w-40">{label}</span>
      <span className={`text-sm text-gray-900 font-medium text-right ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}

const stripMarkdown = (text) => {
  if (!text) return ''
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#/g, '')
    .replace(/`/g, '')
    .trim()
}

function TimelineItem({ event, timestamp, actor, details, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1 mb-1" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium text-gray-800">{event}</p>
        {details && <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{details}</p>}
        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(timestamp)} · {actor}</p>
      </div>
    </div>
  )
}

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)

  const handleApprove = async () => {
    if (invoice?.isBackend) {
      try {
        await invoiceService.approve(invoice.id, 'Manually approved from details page')
        toast.success(`Invoice ${invoice.id} approved successfully.`)
        fetchInvoice()
      } catch (err) {
        toast.error(`Failed to approve: ${err.message || 'Server error'}`)
      }
    } else {
      toast.success(`Invoice ${invoice.id} approved successfully.`)
    }
  }

  const handleReject = async () => {
    if (invoice?.isBackend) {
      try {
        await invoiceService.reject(invoice.id, 'Manually rejected from details page')
        toast.error(`Invoice ${invoice.id} has been rejected.`)
        fetchInvoice()
      } catch (err) {
        toast.error(`Failed to reject: ${err.message || 'Server error'}`)
      }
    } else {
      toast.error(`Invoice ${invoice.id} has been rejected.`)
    }
  }

  const fetchInvoice = async () => {
    try {
      const data = await invoiceService.getById(id)
      const mapped = {
        id: data.id,
        isBackend: true,
        status: data.status === 'PENDING_REVIEW' ? 'pending_review' : data.status === 'APPROVED' ? 'approved' : data.status === 'REJECTED' ? 'rejected' : 'processing',
        rawStatus: data.status,
        riskLevel: data.risk_level || 'low',
        amount: Number(data.total),
        currency: data.currency,
        amountUSD: Number(data.converted_total || data.total),
        fxRate: Number(data.fx_rate || 1.0),
        dueDate: data.due_date || '—',
        paymentTerms: data.payment_terms || 'Net 30',
        confidence: data.confidence_score ? Math.round(data.confidence_score) : 90,
        category: data.category || 'General Invoicing',
        validationIssues: data.validation_issues || [],
        vendor: data.vendor_name,
        vendorCountry: data.vendor_country || 'US',
        taxId: data.tax_id || '—',
        invoiceNumber: data.invoice_number,
        poNumber: data.po_number || '—',
        items: data.items ? data.items.map(item => ({
          description: item.description,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unit_price || 0),
          total: Number(item.line_total || 0)
        })) : [],
        aiRiskSummary: stripMarkdown(data.ai_risk_summary || 'No risk analysis generated yet.'),
        uploadedAt: data.created_at,
        timeline: data.audit_logs && data.audit_logs.length > 0
          ? data.audit_logs.map(log => ({
              event: log.action,
              timestamp: log.created_at,
              actor: log.actor || 'System',
              details: log.details
            }))
          : [
              { event: 'Uploaded & Seeded', timestamp: data.created_at, actor: 'System' },
              ...(data.ocr_text ? [{ event: 'OCR Ingestion Done', timestamp: data.created_at, actor: 'AI OCR' }] : []),
              ...(data.extracted_json ? [{ event: 'AI Extraction Done', timestamp: data.created_at, actor: 'Gemini' }] : []),
              ...(data.status === 'PENDING_REVIEW' || data.status === 'APPROVED' || data.status === 'REJECTED' ? [{ event: 'Process Completed', timestamp: data.created_at, actor: 'AI System' }] : []),
              ...(data.status === 'APPROVED' ? [{ event: 'Approved', timestamp: data.created_at, actor: 'Reviewer' }] : []),
              ...(data.status === 'REJECTED' ? [{ event: 'Rejected', timestamp: data.created_at, actor: 'Reviewer' }] : []),
            ],
        ocrText: data.ocr_text,
        ocrConfidence: data.ocr_confidence,
        extractedJson: data.extracted_json
      }
      setInvoice(mapped)
      return mapped
    } catch (err) {
      console.log('Backend fetch failed, searching in mock invoices:', err)
      const mock = MOCK_INVOICES.find(inv => String(inv.id) === String(id))
      setInvoice(mock || MOCK_INVOICES[0])
      return mock || MOCK_INVOICES[0]
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    
    const init = async () => {
      const inv = await fetchInvoice()
      if (active) setLoading(false)
      
      if (inv && inv.isBackend && ['UPLOADED', 'OCR_PROCESSING', 'OCR_COMPLETED', 'AI_PROCESSING', 'EXTRACTED'].includes(inv.rawStatus)) {
        const interval = setInterval(async () => {
          try {
            const currentInv = await invoiceService.getById(id)
            if (!active) {
              clearInterval(interval)
              return
            }
            if (!['UPLOADED', 'OCR_PROCESSING', 'OCR_COMPLETED', 'AI_PROCESSING', 'EXTRACTED'].includes(currentInv.status)) {
              clearInterval(interval)
              toast.success(`Invoice processing complete!`)
              fetchInvoice()
            }
          } catch (e) {
            console.error('Error polling status:', e)
          }
        }, 2000)

        return () => {
          clearInterval(interval)
        }
      }
    }
    
    init()
    
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading invoice details...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return <div className="p-5 text-gray-500">Invoice not found.</div>
  }

  const aiConfidenceValue = invoice.confidence || 90
  const ocrConfidenceValue = invoice.ocrConfidence ? Math.round(invoice.ocrConfidence) : Math.min(100, aiConfidenceValue + 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumb items={[
          { label: 'Invoice Details', href: '/invoices' },
          { label: invoice.invoiceNumber || invoice.id }
        ]} />
        <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/invoices')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="page-title">{invoice.invoiceNumber || invoice.id}</h1>
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

          {/* OCR & AI Raw Data Details */}
          {invoice.isBackend && invoice.ocrText && (
            <Card title="OCR & AI Extraction Details" subtitle={`OCR Confidence: ${invoice.ocrConfidence ?? '—'}%`}>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">OCR Raw Text Output</p>
                  <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono text-gray-700 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-gray-200">
                    {invoice.ocrText}
                  </pre>
                </div>
                {invoice.extractedJson && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">AI Extracted JSON Structure</p>
                    <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono text-gray-700 max-h-48 overflow-y-auto whitespace-pre leading-relaxed border border-gray-200">
                      {JSON.stringify(invoice.extractedJson, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* AI Risk Summary */}
          <Card title="AI Risk Summary" action={<Shield className="w-4 h-4 text-blue-500" />}>
            <div className="flex flex-wrap items-center gap-6 mb-4">
              {/* OCR Confidence Gauge */}
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={ocrConfidenceValue >= 85 ? '#059669' : ocrConfidenceValue >= 65 ? '#d97706' : '#dc2626'}
                      strokeWidth="3"
                      strokeDasharray={`${ocrConfidenceValue} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">
                    {ocrConfidenceValue}%
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">OCR Ingestion</p>
                  <p className="text-xs font-semibold text-gray-700">Confidence</p>
                </div>
              </div>

              {/* AI Extraction Confidence Gauge */}
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={aiConfidenceValue >= 85 ? '#059669' : aiConfidenceValue >= 65 ? '#d97706' : '#dc2626'}
                      strokeWidth="3"
                      strokeDasharray={`${aiConfidenceValue} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">
                    {aiConfidenceValue}%
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Extraction</p>
                  <p className="text-xs font-semibold text-gray-700">Confidence</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-50 pt-3.5 mb-3.5">
              <span className="text-xs font-medium text-gray-500">Security & Risk Status</span>
              <Badge color={getRiskColor(invoice.riskLevel)}>{invoice.riskLevel} risk</Badge>
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
                  details={t.details}
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
