import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, FileText, Eye, ArrowRight, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import FileUpload from '../components/ui/FileUpload'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Breadcrumb from '../components/ui/Breadcrumb'
import Table, { Pagination } from '../components/ui/Table'
import { MOCK_UPLOAD_HISTORY } from '../utils/mockData'
import { formatDateTime } from '../utils/helpers'
import toast from 'react-hot-toast'

const HISTORY_COLUMNS = [
  { key: 'filename', label: 'File Name', sortable: true },
  { key: 'vendor', label: 'Vendor', sortable: true },
  { key: 'size', label: 'Size' },
  {
    key: 'status',
    label: 'Status',
    render: (val) => {
      const map = { processed: 'green', rejected: 'red', processing: 'blue' }
      const label = { processed: 'Processed', rejected: 'Rejected', processing: 'Processing' }
      return <Badge color={map[val] || 'gray'} dot>{label[val] || val}</Badge>
    }
  },
  {
    key: 'uploadedAt',
    label: 'Uploaded',
    render: (val) => <span className="text-xs text-gray-500">{formatDateTime(val)}</span>
  },
  {
    key: 'invoiceId',
    label: 'Invoice',
    render: (val) => val ? (
      <Link to={`/invoices/${val}`} className="text-blue-600 hover:underline text-xs flex items-center gap-1">
        {val} <ArrowRight className="w-3 h-3" />
      </Link>
    ) : '—'
  },
]

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [submitted, setSubmitted] = useState(false)

  const handleFiles = (files) => {
    setUploadedFiles(files)
  }

  const handleSubmit = () => {
    if (!uploadedFiles.length) {
      toast.error('Please select at least one file to upload.')
      return
    }
    setSubmitted(true)
    toast.success(`${uploadedFiles.length} file(s) uploaded successfully! Processing initiated.`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumb items={[{ label: 'Upload Invoice' }]} />
        <div className="mt-3">
          <h1 className="page-title">Upload Invoice</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload PDF, JPG, or PNG invoice files for AI-powered processing and reconciliation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="Document Upload" subtitle="Drag and drop or click to browse">
            <FileUpload onFiles={handleFiles} />

            {/* Accepted formats info */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs font-semibold text-gray-600 mb-2">Accepted formats & requirements</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { fmt: 'PDF', desc: 'All versions', color: 'red' },
                  { fmt: 'JPG/JPEG', desc: 'Min. 300 DPI', color: 'blue' },
                  { fmt: 'PNG', desc: 'Min. 300 DPI', color: 'green' },
                ].map(f => (
                  <div key={f.fmt} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">.{f.fmt}</p>
                      <p className="text-[10px] text-gray-400">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">Max 25 MB per file · Up to 5 files at once</p>
              <button
                onClick={handleSubmit}
                className="btn-primary"
                disabled={submitted}
              >
                <Upload className="w-4 h-4" />
                {submitted ? 'Submitted' : 'Submit for Processing'}
              </button>
            </div>
          </Card>

          {/* Processing info */}
          {submitted && (
            <Card className="border-emerald-200 bg-emerald-50">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Upload Successful!</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    Your files are being processed by the AI engine. You'll be notified when reconciliation is complete.
                    Average processing time is 2–4 minutes per document.
                  </p>
                  <Link to="/invoices" className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium mt-2 hover:underline">
                    View Invoice List <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          <Card title="Processing Pipeline" noPadding>
            <div className="divide-y divide-gray-50">
              {[
                { step: '1', title: 'Document Ingestion', desc: 'File uploaded to secure cloud storage', status: 'done' },
                { step: '2', title: 'OCR Extraction', desc: 'AI extracts text, tables, and metadata', status: 'active' },
                { step: '3', title: 'Data Validation', desc: 'Field-level validation and cross-referencing', status: 'pending' },
                { step: '4', title: 'FX Reconciliation', desc: 'Real-time exchange rate verification', status: 'pending' },
                { step: '5', title: 'Risk Scoring', desc: 'AI anomaly and fraud detection', status: 'pending' },
                { step: '6', title: 'Review Routing', desc: 'Auto-approve or route to reviewer', status: 'pending' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                    s.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                    s.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {s.status === 'done' ? '✓' : s.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Tips for Best Results">
            <ul className="space-y-2">
              {[
                'Ensure scans are at minimum 300 DPI',
                'Avoid handwritten or faxed documents',
                'One invoice per file for best accuracy',
                'Include all pages of multi-page invoices',
                'Ensure vendor details are clearly visible',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="text-blue-500 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Upload History */}
      <Card
        title="Upload History"
        subtitle="Recent document uploads"
        action={
          <span className="text-xs text-gray-400">{MOCK_UPLOAD_HISTORY.length} records</span>
        }
        noPadding
      >
        <Table
          columns={HISTORY_COLUMNS}
          data={MOCK_UPLOAD_HISTORY}
        />
      </Card>
    </div>
  )
}
