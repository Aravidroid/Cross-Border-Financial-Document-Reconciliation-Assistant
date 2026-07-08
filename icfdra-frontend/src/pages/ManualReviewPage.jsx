import React, { useState, useEffect, useCallback } from 'react'
import { invoiceService } from '../services/api'
import { useForm } from 'react-hook-form'
import { CheckCircle, XCircle, Eye, FileText, Bot, Edit3, AlertTriangle } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Breadcrumb from '../components/ui/Breadcrumb'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input, { Textarea } from '../components/ui/Input'
import { MOCK_REVIEW_QUEUE } from '../utils/mockData'
import { formatCurrency, getRiskColor, getConfidenceColor } from '../utils/helpers'
import toast from 'react-hot-toast'

function ConfidenceMeter({ score }) {
  const color = getConfidenceColor(score)
  const barColor = color === 'green' ? '#059669' : color === 'blue' ? '#2563eb' : color === 'yellow' ? '#d97706' : '#dc2626'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">AI Confidence</span>
        <Badge color={color}>{score}%</Badge>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${score}%`, background: barColor }} />
      </div>
    </div>
  )
}

export default function ManualReviewPage() {
  const [queue, setQueue] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState(false)
  const [approveModal, setApproveModal] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const loadQueue = useCallback(async () => {
    try {
      const res = await invoiceService.list()
      const pending = res.filter(inv => inv.status === 'PENDING_REVIEW')
      const mapped = pending.map(inv => ({
        id: inv.id,
        isBackend: true,
        vendor: inv.vendor_name,
        amount: Number(inv.total),
        currency: inv.currency,
        confidence: inv.confidence_score ? Math.round(inv.confidence_score) : 90,
        riskLevel: inv.risk_level || 'low',
        issues: inv.validation_issues || [],
        dueIn: '3 days',
        assignedTo: 'AI System',
        ocrData: {
          invoiceNumber: inv.invoice_number,
          date: inv.invoice_date,
          vendorName: inv.vendor_name,
          total: String(inv.total),
          text: inv.ocr_text
        },
        extractedData: {
          vendorName: inv.vendor_name,
          invoiceNumber: inv.invoice_number,
          totalAmount: String(inv.total),
          currency: inv.currency,
          taxRate: inv.tax ? String(inv.tax) : '0',
          paymentTerms: inv.payment_terms || 'Net 30'
        }
      }))
      const merged = [...mapped, ...MOCK_REVIEW_QUEUE]
      setQueue(merged)
      
      // Keep selection synced or default to first queue item
      if (merged.length > 0) {
        setSelected(prevSelected => {
          if (prevSelected) {
            const found = merged.find(q => q.id === prevSelected.id && q.isBackend === prevSelected.isBackend)
            if (found) return found
          }
          return merged[0]
        })
      } else {
        setSelected(null)
      }
    } catch (err) {
      console.error('Failed to load review queue:', err)
      setQueue(MOCK_REVIEW_QUEUE)
      setSelected(MOCK_REVIEW_QUEUE[0])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    values: {
      vendorName: selected?.extractedData?.vendorName || '',
      invoiceNumber: selected?.extractedData?.invoiceNumber || '',
      totalAmount: selected?.extractedData?.totalAmount || '',
      currency: selected?.extractedData?.currency || '',
      taxRate: selected?.extractedData?.taxRate || '',
      paymentTerms: selected?.extractedData?.paymentTerms || '',
    }
  })

  const onApprove = async () => {
    if (selected?.isBackend) {
      try {
        await invoiceService.approve(selected.id, approvalNotes)
        toast.success(`Invoice ${selected.id} approved successfully.`)
        setApproveModal(false)
        setApprovalNotes('')
        loadQueue()
      } catch (err) {
        toast.error(`Failed to approve: ${err.message || 'Server error'}`)
      }
    } else {
      toast.success(`Invoice ${selected.id} approved and sent to payment processing.`)
      setApproveModal(false)
    }
  }

  const onReject = async () => {
    if (!rejectReason) {
      toast.error('Rejection reason is required.')
      return
    }
    if (selected?.isBackend) {
      try {
        await invoiceService.reject(selected.id, rejectReason)
        toast.error(`Invoice ${selected.id} has been rejected.`)
        setRejectModal(false)
        setRejectReason('')
        loadQueue()
      } catch (err) {
        toast.error(`Failed to reject: ${err.message || 'Server error'}`)
      }
    } else {
      toast.error(`Invoice ${selected.id} rejected. Notification sent to vendor.`)
      setRejectModal(false)
    }
  }

  const handleSave = async (formData) => {
    if (selected?.isBackend) {
      try {
        const payload = {
          vendor_name: formData.vendorName,
          invoice_number: formData.invoiceNumber,
          total: Number(formData.totalAmount),
          currency: formData.currency,
          tax: formData.taxRate ? Number(formData.taxRate) : null,
          payment_terms: formData.paymentTerms || null
        }
        await invoiceService.update(selected.id, payload)
        toast.success('Changes saved successfully.')
        loadQueue()
      } catch (err) {
        toast.error(`Failed to save changes: ${err.message || 'Server error'}`)
      }
    } else {
      toast.success('Changes saved (mock).')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: 'Manual Review Center' }]} />
        <div className="mt-3">
          <h1 className="page-title">Manual Review Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            {queue.length} invoices awaiting review
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Review Queue */}
        <div className="xl:col-span-1">
          <Card title="Review Queue" subtitle="Select to review" noPadding>
            <div className="divide-y divide-gray-50">
              {queue.map(item => (
                <button
                  key={`${item.isBackend ? 'b' : 'm'}-${item.id}`}
                  onClick={() => setSelected(item)}
                  className={`w-full text-left p-4 hover:bg-blue-50 transition-colors ${selected?.id === item.id && selected?.isBackend === item.isBackend ? 'bg-blue-50 border-r-2 border-r-blue-600' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 font-mono">{item.id}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{item.vendor}</p>
                      <p className="text-xs font-semibold text-gray-800 mt-1">{formatCurrency(item.amount, item.currency)}</p>
                    </div>
                    <Badge color={getRiskColor(item.riskLevel)}>{item.riskLevel}</Badge>
                  </div>
                  <div className="mt-2">
                    <ConfidenceMeter score={item.confidence} />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.issues.map((issue, i) => (
                      <span key={i} className="badge badge-yellow text-[10px] py-0.5">{issue}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Due in {item.dueIn} · Assigned to {item.assignedTo?.split(' ')[0]}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Main Review Area */}
        {selected && (
          <div className="xl:col-span-3 space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Reviewing</p>
                <p className="text-lg font-bold font-mono text-gray-900">{selected.id}</p>
                <p className="text-sm text-gray-500">{selected.vendor}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="danger" icon={<XCircle className="w-4 h-4" />} onClick={() => setRejectModal(true)}>
                  Reject
                </Button>
                <Button variant="success" icon={<CheckCircle className="w-4 h-4" />} onClick={() => setApproveModal(true)}>
                  Approve
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Original Invoice Preview */}
              <Card title="Original Invoice" action={<Eye className="w-4 h-4 text-gray-400" />}>
                <div className="bg-gray-100 rounded-xl h-64 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200">
                  <FileText className="w-10 h-10 text-gray-300" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Invoice Preview</p>
                    <p className="text-xs text-gray-400 mt-1">{selected.ocrData?.invoiceNumber || selected.id}.pdf</p>
                  </div>
                  <button className="btn-secondary text-xs">
                    <Eye className="w-3 h-3" /> Open Full Document
                  </button>
                </div>
                {/* OCR Data */}
                <div className="mt-4 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">OCR Extracted Data</p>
                  {Object.entries(selected.ocrData || {}).map(([k, v]) => (
                    k !== 'text' && (
                      <div key={k} className="flex justify-between text-xs py-1 border-b border-gray-50">
                        <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-medium text-gray-900 font-mono">{v}</span>
                      </div>
                    )
                  ))}
                  {selected.ocrData?.text && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">OCR Raw Text Output</p>
                      <pre className="bg-gray-50 p-2 rounded text-[10px] font-mono text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-gray-150">
                        {selected.ocrData.text}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>

              {/* AI Extracted Data */}
              <Card title="AI Extracted Data" action={<Bot className="w-4 h-4 text-blue-500" />}>
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <ConfidenceMeter score={selected.confidence} />
                  <p className="text-xs text-blue-600 mt-2">AI extraction confidence score for this document</p>
                </div>

                <div className="space-y-1.5">
                  {Object.entries(selected.extractedData || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs py-1 border-b border-gray-50">
                      <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="font-semibold text-gray-900">{String(v)}</span>
                    </div>
                  ))}
                </div>

                {selected.issues?.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <p className="text-xs font-semibold text-amber-800">Flagged Issues</p>
                    </div>
                    {selected.issues.map((issue, i) => (
                      <p key={i} className="text-xs text-amber-700">• {issue}</p>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Editable Form */}
            <Card title="Editable Invoice Data" subtitle="Correct any extraction errors before approving" action={<Edit3 className="w-4 h-4 text-gray-400" />}>
              <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" onSubmit={handleSubmit(handleSave)}>
                <Input
                  label="Vendor Name"
                  {...register('vendorName', { required: 'Required' })}
                  error={errors.vendorName?.message}
                />
                <Input
                  label="Invoice Number"
                  {...register('invoiceNumber', { required: 'Required' })}
                  error={errors.invoiceNumber?.message}
                />
                <Input
                  label="Total Amount"
                  type="number"
                  {...register('totalAmount', { required: 'Required' })}
                  error={errors.totalAmount?.message}
                />
                <Input
                  label="Currency"
                  {...register('currency', { required: 'Required' })}
                  error={errors.currency?.message}
                />
                <Input
                  label="Tax Rate"
                  {...register('taxRate')}
                />
                <Input
                  label="Payment Terms"
                  {...register('paymentTerms')}
                />
                <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3">
                  <Button variant="secondary" type="button" onClick={() => reset()}>
                    Reset
                  </Button>
                  <Button type="submit">
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Modal
        open={approveModal}
        onClose={() => setApproveModal(false)}
        title="Approve Invoice"
        subtitle={`Confirm approval for ${selected?.id}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveModal(false)}>Cancel</Button>
            <Button variant="success" onClick={onApprove} icon={<CheckCircle className="w-4 h-4" />}>Confirm Approval</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          You are about to approve invoice <strong>{selected?.id}</strong> from{' '}
          <strong>{selected?.vendor}</strong> for{' '}
          <strong>{formatCurrency(selected?.amount || 0, selected?.currency)}</strong>.
        </p>
        <Textarea 
          label="Approval Notes (optional)" 
          placeholder="Add any notes for the audit trail…" 
          className="mt-4" 
          value={approvalNotes}
          onChange={(e) => setApprovalNotes(e.target.value)}
        />
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title="Reject Invoice"
        subtitle={`Provide reason for rejection of ${selected?.id}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={onReject} icon={<XCircle className="w-4 h-4" />}>Confirm Rejection</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 mb-4">
          Please provide a reason for rejecting <strong>{selected?.id}</strong>. The vendor will be notified.
        </p>
        <Textarea 
          label="Rejection Reason" 
          placeholder="Describe the issue with this invoice…" 
          required 
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  )
}
