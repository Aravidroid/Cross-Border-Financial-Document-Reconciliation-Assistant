import dayjs from 'dayjs'

// ─── Invoices ───────────────────────────────────────────────────────────────
export const MOCK_INVOICES = [
  {
    id: 'INV-2024-0081',
    vendor: 'Apex Technologies GmbH',
    vendorCountry: 'DE',
    amount: 142500,
    currency: 'EUR',
    amountUSD: 154025,
    fxRate: 1.0808,
    status: 'pending_review',
    riskLevel: 'high',
    confidence: 67,
    uploadedAt: '2024-05-28T09:14:00Z',
    dueDate: '2024-06-15',
    category: 'Software Services',
    taxId: 'DE329481927',
    invoiceNumber: 'APX-2024-0081',
    poNumber: 'PO-GF-20240528',
    paymentTerms: 'Net 30',
    items: [
      { description: 'Enterprise SaaS License Q2', quantity: 1, unitPrice: 98000, total: 98000 },
      { description: 'Professional Services', quantity: 40, unitPrice: 875, total: 35000 },
      { description: 'Support & Maintenance', quantity: 1, unitPrice: 9500, total: 9500 },
    ],
    validationIssues: ['FX rate deviation >2%', 'Tax ID format mismatch'],
    aiRiskSummary: 'Invoice shows FX rate discrepancy of 2.3% vs interbank rate. Tax ID format does not match German standard. High-value transaction warrants manual review.',
    timeline: [
      { event: 'Uploaded', timestamp: '2024-05-28T09:14:00Z', actor: 'System' },
      { event: 'OCR Processed', timestamp: '2024-05-28T09:14:45Z', actor: 'AI Engine' },
      { event: 'Risk Flagged', timestamp: '2024-05-28T09:15:02Z', actor: 'Risk Engine' },
      { event: 'Assigned to Review', timestamp: '2024-05-28T09:15:05Z', actor: 'System' },
    ],
  },
  {
    id: 'INV-2024-0082',
    vendor: 'Sakura Imports Co.',
    vendorCountry: 'JP',
    amount: 8750000,
    currency: 'JPY',
    amountUSD: 58120,
    fxRate: 0.00664,
    status: 'approved',
    riskLevel: 'low',
    confidence: 96,
    uploadedAt: '2024-05-27T14:22:00Z',
    dueDate: '2024-06-20',
    category: 'Raw Materials',
    taxId: 'JP-123456789',
    invoiceNumber: 'SKR-2024-0082',
    poNumber: 'PO-GF-20240527',
    paymentTerms: 'Net 45',
    items: [
      { description: 'Precision Components Batch A', quantity: 500, unitPrice: 14500, total: 7250000 },
      { description: 'Packaging & Handling', quantity: 1, unitPrice: 1500000, total: 1500000 },
    ],
    validationIssues: [],
    aiRiskSummary: 'Invoice is consistent with historical patterns from this vendor. FX rate within acceptable range. No anomalies detected.',
    timeline: [
      { event: 'Uploaded', timestamp: '2024-05-27T14:22:00Z', actor: 'System' },
      { event: 'OCR Processed', timestamp: '2024-05-27T14:22:38Z', actor: 'AI Engine' },
      { event: 'Auto-Approved', timestamp: '2024-05-27T14:23:00Z', actor: 'AI Engine' },
    ],
  },
  {
    id: 'INV-2024-0083',
    vendor: 'BritLogistics Ltd',
    vendorCountry: 'GB',
    amount: 32400,
    currency: 'GBP',
    amountUSD: 41220,
    fxRate: 1.272,
    status: 'rejected',
    riskLevel: 'critical',
    confidence: 34,
    uploadedAt: '2024-05-27T10:05:00Z',
    dueDate: '2024-06-10',
    category: 'Logistics',
    taxId: 'GB-987654321',
    invoiceNumber: 'BL-2024-0083',
    poNumber: 'PO-GF-20240527B',
    paymentTerms: 'Net 15',
    items: [
      { description: 'Freight Forwarding EU-US', quantity: 1, unitPrice: 24000, total: 24000 },
      { description: 'Customs Clearance', quantity: 1, unitPrice: 5400, total: 5400 },
      { description: 'Last Mile Delivery', quantity: 1, unitPrice: 3000, total: 3000 },
    ],
    validationIssues: ['Duplicate invoice detected', 'Amount exceeds approved PO by 18%', 'Vendor bank details changed'],
    aiRiskSummary: 'Multiple critical issues detected. Possible duplicate of INV-2024-0071. Amount exceeds PO authorization. Vendor bank account change warrants fraud screening.',
    timeline: [
      { event: 'Uploaded', timestamp: '2024-05-27T10:05:00Z', actor: 'System' },
      { event: 'Duplicate Detected', timestamp: '2024-05-27T10:05:30Z', actor: 'AI Engine' },
      { event: 'Escalated to Manual Review', timestamp: '2024-05-27T10:06:00Z', actor: 'Risk Engine' },
      { event: 'Rejected', timestamp: '2024-05-27T16:30:00Z', actor: 'James Wilson' },
    ],
  },
  {
    id: 'INV-2024-0084',
    vendor: 'Meridian Software AG',
    vendorCountry: 'CH',
    amount: 45000,
    currency: 'CHF',
    amountUSD: 50850,
    fxRate: 1.130,
    status: 'pending_review',
    riskLevel: 'medium',
    confidence: 78,
    uploadedAt: '2024-05-26T16:40:00Z',
    dueDate: '2024-06-25',
    category: 'Software Services',
    taxId: 'CHE-123.456.789',
    invoiceNumber: 'MRD-2024-0084',
    poNumber: 'PO-GF-20240526',
    paymentTerms: 'Net 30',
    items: [
      { description: 'Annual Platform License', quantity: 1, unitPrice: 38000, total: 38000 },
      { description: 'Implementation Services', quantity: 14, unitPrice: 500, total: 7000 },
    ],
    validationIssues: ['Missing VAT registration number'],
    aiRiskSummary: 'Low-risk invoice with minor data quality issue. VAT number absent but vendor is known and KYC-verified.',
    timeline: [
      { event: 'Uploaded', timestamp: '2024-05-26T16:40:00Z', actor: 'System' },
      { event: 'OCR Processed', timestamp: '2024-05-26T16:40:50Z', actor: 'AI Engine' },
      { event: 'Assigned to Review', timestamp: '2024-05-26T16:41:00Z', actor: 'System' },
    ],
  },
  {
    id: 'INV-2024-0085',
    vendor: 'IndoTech Solutions Pvt.',
    vendorCountry: 'IN',
    amount: 3200000,
    currency: 'INR',
    amountUSD: 38440,
    fxRate: 0.01201,
    status: 'approved',
    riskLevel: 'low',
    confidence: 94,
    uploadedAt: '2024-05-25T11:20:00Z',
    dueDate: '2024-06-22',
    category: 'IT Services',
    taxId: 'GSTIN-29AABCU9603R1ZT',
    invoiceNumber: 'ITS-2024-0085',
    poNumber: 'PO-GF-20240525',
    paymentTerms: 'Net 30',
    items: [
      { description: 'Backend Development - Sprint 8-12', quantity: 5, unitPrice: 480000, total: 2400000 },
      { description: 'QA & Testing', quantity: 1, unitPrice: 800000, total: 800000 },
    ],
    validationIssues: [],
    aiRiskSummary: 'Clean invoice with all data fields validated. GSTIN verified. FX rate within 0.1% of reference rate.',
    timeline: [
      { event: 'Uploaded', timestamp: '2024-05-25T11:20:00Z', actor: 'System' },
      { event: 'Auto-Approved', timestamp: '2024-05-25T11:21:00Z', actor: 'AI Engine' },
    ],
  },
  {
    id: 'INV-2024-0086',
    vendor: 'Nordic Consulting AS',
    vendorCountry: 'NO',
    amount: 185000,
    currency: 'NOK',
    amountUSD: 17300,
    fxRate: 0.09351,
    status: 'processing',
    riskLevel: 'low',
    confidence: 88,
    uploadedAt: '2024-05-29T08:00:00Z',
    dueDate: '2024-06-28',
    category: 'Consulting',
    taxId: 'NO-912345678',
    invoiceNumber: 'NCA-2024-0086',
    poNumber: 'PO-GF-20240529',
    paymentTerms: 'Net 30',
    items: [
      { description: 'Strategy Consulting Q2', quantity: 20, unitPrice: 9250, total: 185000 },
    ],
    validationIssues: [],
    aiRiskSummary: 'Processing — OCR extraction in progress.',
    timeline: [
      { event: 'Uploaded', timestamp: '2024-05-29T08:00:00Z', actor: 'System' },
      { event: 'OCR Processing', timestamp: '2024-05-29T08:00:30Z', actor: 'AI Engine' },
    ],
  },
]

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
export const MOCK_STATS = {
  totalInvoices: 1284,
  pendingReviews: 47,
  approvedInvoices: 1102,
  rejectedInvoices: 135,
  totalFXExposure: 4280000,
  avgProcessingTime: '2.4 min',
  autoApprovalRate: 85.8,
  flaggedThisWeek: 12,
}

// ─── Currency Distribution ────────────────────────────────────────────────────
export const MOCK_CURRENCY_DATA = [
  { currency: 'USD', value: 1820000, count: 312, color: '#2563eb' },
  { currency: 'EUR', value: 980000, count: 224, color: '#7c3aed' },
  { currency: 'GBP', value: 620000, count: 145, color: '#059669' },
  { currency: 'JPY', value: 410000, count: 198, color: '#d97706' },
  { currency: 'CHF', value: 280000, count: 87, color: '#dc2626' },
  { currency: 'INR', value: 170000, count: 318, color: '#0891b2' },
]

// ─── Monthly Trend ────────────────────────────────────────────────────────────
export const MOCK_MONTHLY_TREND = [
  { month: 'Dec', invoices: 98, approved: 84, rejected: 9, flagged: 5 },
  { month: 'Jan', invoices: 112, approved: 96, rejected: 11, flagged: 5 },
  { month: 'Feb', invoices: 89, approved: 74, rejected: 10, flagged: 5 },
  { month: 'Mar', invoices: 134, approved: 118, rejected: 12, flagged: 4 },
  { month: 'Apr', invoices: 156, approved: 138, rejected: 13, flagged: 5 },
  { month: 'May', invoices: 142, approved: 124, rejected: 11, flagged: 7 },
]

// ─── FX Exposure ─────────────────────────────────────────────────────────────
export const MOCK_FX_EXPOSURE = [
  { currency: 'EUR', exposure: 980000, hedged: 720000, open: 260000 },
  { currency: 'GBP', exposure: 620000, hedged: 480000, open: 140000 },
  { currency: 'JPY', exposure: 410000, hedged: 340000, open: 70000 },
  { currency: 'CHF', exposure: 280000, hedged: 200000, open: 80000 },
  { currency: 'INR', exposure: 170000, hedged: 120000, open: 50000 },
  { currency: 'NOK', exposure: 90000, hedged: 60000, open: 30000 },
]

// ─── Risk Distribution ────────────────────────────────────────────────────────
export const MOCK_RISK_DATA = [
  { name: 'Low Risk', value: 892, color: '#059669' },
  { name: 'Medium Risk', value: 245, color: '#d97706' },
  { name: 'High Risk', value: 112, color: '#dc2626' },
  { name: 'Critical', value: 35, color: '#7f1d1d' },
]

// ─── Vendor Spending ──────────────────────────────────────────────────────────
export const MOCK_VENDOR_SPENDING = [
  { vendor: 'Apex Technologies', amount: 842000, invoices: 24, country: 'DE' },
  { vendor: 'Sakura Imports', amount: 691000, invoices: 18, country: 'JP' },
  { vendor: 'IndoTech Solutions', amount: 584000, invoices: 31, country: 'IN' },
  { vendor: 'Meridian Software', amount: 412000, invoices: 12, country: 'CH' },
  { vendor: 'Nordic Consulting', amount: 298000, invoices: 9, country: 'NO' },
  { vendor: 'BritLogistics Ltd', amount: 267000, invoices: 7, country: 'GB' },
]

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const MOCK_AUDIT_LOGS = [
  { id: 'LOG-5821', action: 'Invoice Approved', actor: 'Alexandra Chen', target: 'INV-2024-0082', timestamp: '2024-05-27T16:20:00Z', severity: 'success', details: 'Manual approval after review. Confidence: 96%' },
  { id: 'LOG-5822', action: 'Invoice Rejected', actor: 'James Wilson', target: 'INV-2024-0083', timestamp: '2024-05-27T16:30:00Z', severity: 'error', details: 'Duplicate invoice and unauthorized PO deviation' },
  { id: 'LOG-5823', action: 'Login', actor: 'Alexandra Chen', target: 'Auth System', timestamp: '2024-05-27T09:00:00Z', severity: 'info', details: 'Successful login from 203.0.113.42' },
  { id: 'LOG-5824', action: 'Settings Changed', actor: 'Admin User', target: 'Notification Config', timestamp: '2024-05-26T14:15:00Z', severity: 'warning', details: 'Email notification threshold updated to $50,000' },
  { id: 'LOG-5825', action: 'Invoice Uploaded', actor: 'System', target: 'INV-2024-0081', timestamp: '2024-05-28T09:14:00Z', severity: 'info', details: 'PDF uploaded via API. OCR processing triggered.' },
  { id: 'LOG-5826', action: 'Risk Flag Raised', actor: 'AI Engine', target: 'INV-2024-0081', timestamp: '2024-05-28T09:15:02Z', severity: 'warning', details: 'FX deviation and tax ID mismatch detected' },
  { id: 'LOG-5827', action: 'Invoice Approved', actor: 'AI Engine', target: 'INV-2024-0085', timestamp: '2024-05-25T11:21:00Z', severity: 'success', details: 'Auto-approved. All validations passed.' },
  { id: 'LOG-5828', action: 'API Key Generated', actor: 'Admin User', target: 'API Config', timestamp: '2024-05-24T10:00:00Z', severity: 'info', details: 'New API key generated for integration service' },
  { id: 'LOG-5829', action: 'User Role Updated', actor: 'Admin User', target: 'James Wilson', timestamp: '2024-05-23T11:30:00Z', severity: 'warning', details: 'Role updated from Reviewer to Approver' },
  { id: 'LOG-5830', action: 'Export Performed', actor: 'Alexandra Chen', target: 'Invoice Report May', timestamp: '2024-05-22T17:00:00Z', severity: 'info', details: 'CSV export of 142 records for May 2024' },
  { id: 'LOG-5831', action: 'Bulk Import', actor: 'System', target: 'Batch-2024-05-21', timestamp: '2024-05-21T08:00:00Z', severity: 'info', details: '38 invoices imported via SFTP integration' },
  { id: 'LOG-5832', action: 'FX Rate Updated', actor: 'FX Service', target: 'Rate Table', timestamp: '2024-05-29T00:00:00Z', severity: 'info', details: 'Daily FX rates updated from ECB feed' },
]

// ─── Recent Activity ──────────────────────────────────────────────────────────
export const MOCK_RECENT_ACTIVITY = [
  { id: 1, type: 'approved', message: 'INV-2024-0085 auto-approved', time: '2 min ago', icon: 'check' },
  { id: 2, type: 'flagged', message: 'INV-2024-0081 flagged for FX deviation', time: '8 min ago', icon: 'alert' },
  { id: 3, type: 'uploaded', message: 'INV-2024-0086 uploaded and processing', time: '14 min ago', icon: 'upload' },
  { id: 4, type: 'rejected', message: 'INV-2024-0083 rejected — duplicate detected', time: '31 min ago', icon: 'x' },
  { id: 5, type: 'approved', message: 'INV-2024-0082 approved by Alexandra Chen', time: '1 hr ago', icon: 'check' },
]

// ─── High Risk Invoices ───────────────────────────────────────────────────────
export const MOCK_HIGH_RISK = [
  { id: 'INV-2024-0083', vendor: 'BritLogistics Ltd', amount: '$41,220', risk: 'critical', issue: 'Duplicate + PO deviation', currency: 'GBP' },
  { id: 'INV-2024-0081', vendor: 'Apex Technologies GmbH', amount: '$154,025', risk: 'high', issue: 'FX deviation + Tax ID', currency: 'EUR' },
  { id: 'INV-2024-0079', vendor: 'SingLink Pte Ltd', amount: '$98,400', risk: 'high', issue: 'First-time vendor', currency: 'SGD' },
  { id: 'INV-2024-0075', vendor: 'CairoTech SAE', amount: '$67,500', risk: 'high', issue: 'Country risk (EG)', currency: 'EGP' },
]

// ─── Upload History ───────────────────────────────────────────────────────────
export const MOCK_UPLOAD_HISTORY = [
  { id: 'UPL-001', filename: 'APX-2024-0081.pdf', vendor: 'Apex Technologies GmbH', size: '2.4 MB', status: 'processed', uploadedAt: '2024-05-28T09:14:00Z', invoiceId: 'INV-2024-0081' },
  { id: 'UPL-002', filename: 'SKR-2024-0082.pdf', vendor: 'Sakura Imports Co.', size: '1.8 MB', status: 'processed', uploadedAt: '2024-05-27T14:22:00Z', invoiceId: 'INV-2024-0082' },
  { id: 'UPL-003', filename: 'BL-2024-0083.jpg', vendor: 'BritLogistics Ltd', size: '3.1 MB', status: 'rejected', uploadedAt: '2024-05-27T10:05:00Z', invoiceId: 'INV-2024-0083' },
  { id: 'UPL-004', filename: 'MRD-2024-0084.pdf', vendor: 'Meridian Software AG', size: '1.2 MB', status: 'processing', uploadedAt: '2024-05-26T16:40:00Z', invoiceId: 'INV-2024-0084' },
  { id: 'UPL-005', filename: 'ITS-2024-0085.pdf', vendor: 'IndoTech Solutions', size: '0.9 MB', status: 'processed', uploadedAt: '2024-05-25T11:20:00Z', invoiceId: 'INV-2024-0085' },
]

// ─── Semantic Search Results ──────────────────────────────────────────────────
export const MOCK_SEARCH_RESULTS = [
  { id: 'INV-2024-0081', vendor: 'Apex Technologies GmbH', similarity: 0.94, snippet: 'Enterprise SaaS license for Q2 including professional services and support maintenance...', amount: '$154,025', currency: 'EUR', date: '2024-05-28' },
  { id: 'INV-2024-0073', vendor: 'Apex Technologies GmbH', similarity: 0.87, snippet: 'Enterprise SaaS license renewal Q1 with additional user seats and premium support tier...', amount: '$138,500', currency: 'EUR', date: '2024-02-28' },
  { id: 'INV-2024-0058', vendor: 'CloudBase GmbH', similarity: 0.72, snippet: 'Cloud infrastructure services including compute, storage, and enterprise support package...', amount: '$89,200', currency: 'EUR', date: '2024-01-15' },
  { id: 'INV-2024-0084', vendor: 'Meridian Software AG', similarity: 0.68, snippet: 'Annual platform license and implementation services for financial data management system...', amount: '$50,850', currency: 'CHF', date: '2024-05-26' },
]

export const MOCK_RECENT_SEARCHES = [
  'SaaS license renewal EUR',
  'logistics freight forwarding GBP high risk',
  'IT services India INR approved',
  'duplicate invoices May 2024',
]

// ─── Notifications ────────────────────────────────────────────────────────────
export const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'alert', title: 'High Risk Invoice Detected', message: 'INV-2024-0083 has been flagged for potential duplicate and PO deviation.', time: '5 min ago', read: false },
  { id: 2, type: 'info', title: 'Batch Processing Complete', message: '38 invoices from morning batch successfully processed.', time: '1 hr ago', read: false },
  { id: 3, type: 'success', title: 'Monthly Report Ready', message: 'May 2024 invoice reconciliation report is ready for download.', time: '2 hr ago', read: true },
  { id: 4, type: 'warning', title: 'FX Rate Alert', message: 'EUR/USD rate moved >1.5% since last pricing. Review open EUR exposures.', time: '3 hr ago', read: true },
]

// ─── Review Queue ─────────────────────────────────────────────────────────────
export const MOCK_REVIEW_QUEUE = [
  {
    id: 'INV-2024-0081',
    vendor: 'Apex Technologies GmbH',
    amount: 142500,
    currency: 'EUR',
    confidence: 67,
    riskLevel: 'high',
    issues: ['FX rate deviation', 'Tax ID mismatch'],
    assignedTo: 'Alexandra Chen',
    priority: 'high',
    dueIn: '2 days',
    ocrData: {
      invoiceNumber: 'APX-2024-0081',
      date: '2024-05-25',
      dueDate: '2024-06-15',
      vendorName: 'Apex Technologies GmbH',
      vendorAddress: 'Unter den Linden 12, 10117 Berlin, Germany',
      total: '€142,500.00',
      tax: '€22,742.13',
      subtotal: '€119,757.87',
    },
    extractedData: {
      vendorName: 'Apex Technologies GmbH',
      invoiceNumber: 'APX-2024-0081',
      totalAmount: 142500,
      currency: 'EUR',
      taxRate: '19%',
      paymentTerms: 'Net 30',
      lineItems: 3,
    },
  },
  {
    id: 'INV-2024-0084',
    vendor: 'Meridian Software AG',
    amount: 45000,
    currency: 'CHF',
    confidence: 78,
    riskLevel: 'medium',
    issues: ['Missing VAT number'],
    assignedTo: 'James Wilson',
    priority: 'medium',
    dueIn: '4 days',
    ocrData: {
      invoiceNumber: 'MRD-2024-0084',
      date: '2024-05-24',
      dueDate: '2024-06-25',
      vendorName: 'Meridian Software AG',
      vendorAddress: 'Bahnhofstrasse 45, 8001 Zürich, Switzerland',
      total: 'CHF 45,000.00',
      tax: 'CHF 3,465.00',
      subtotal: 'CHF 41,535.00',
    },
    extractedData: {
      vendorName: 'Meridian Software AG',
      invoiceNumber: 'MRD-2024-0084',
      totalAmount: 45000,
      currency: 'CHF',
      taxRate: '7.7%',
      paymentTerms: 'Net 30',
      lineItems: 2,
    },
  },
]

// ─── Approval Ratio ───────────────────────────────────────────────────────────
export const MOCK_APPROVAL_RATIO = [
  { month: 'Dec', autoApproved: 72, manualApproved: 12, rejected: 9, flagged: 5 },
  { month: 'Jan', autoApproved: 84, manualApproved: 12, rejected: 11, flagged: 5 },
  { month: 'Feb', autoApproved: 66, manualApproved: 8, rejected: 10, flagged: 5 },
  { month: 'Mar', autoApproved: 106, manualApproved: 12, rejected: 12, flagged: 4 },
  { month: 'Apr', autoApproved: 122, manualApproved: 16, rejected: 13, flagged: 5 },
  { month: 'May', autoApproved: 108, manualApproved: 16, rejected: 11, flagged: 7 },
]
