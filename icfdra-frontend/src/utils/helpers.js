import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

export const formatNumber = (n) =>
  new Intl.NumberFormat('en-US').format(n)

export const formatCompact = (n) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export const formatDate = (dateStr, fmt = 'MMM D, YYYY') => {
  if (!dateStr || dateStr === '—') return '—'
  const d = dayjs(dateStr)
  return d.isValid() ? d.format(fmt) : '—'
}

export const formatDateTime = (dateStr) => {
  if (!dateStr || dateStr === '—') return '—'
  const d = dayjs(dateStr)
  return d.isValid() ? d.format('MMM D, YYYY HH:mm') : '—'
}

export const timeAgo = (dateStr) =>
  dayjs(dateStr).fromNow()

export const getRiskColor = (level) => {
  const map = {
    low: 'green',
    medium: 'yellow',
    high: 'red',
    critical: 'red',
  }
  return map[level] ?? 'gray'
}

export const getStatusColor = (status) => {
  const map = {
    approved: 'green',
    rejected: 'red',
    pending_review: 'yellow',
    processing: 'blue',
    draft: 'gray',
  }
  return map[status] ?? 'gray'
}

export const getStatusLabel = (status) => {
  const map = {
    approved: 'Approved',
    rejected: 'Rejected',
    pending_review: 'Pending Review',
    processing: 'Processing',
    draft: 'Draft',
  }
  return map[status] ?? status
}

export const getSeverityColor = (severity) => {
  const map = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
  }
  return map[severity] ?? 'gray'
}

export const truncate = (str, max = 40) =>
  str.length > max ? str.slice(0, max) + '…' : str

export const clsx = (...classes) =>
  classes.filter(Boolean).join(' ')

export const getConfidenceColor = (score) => {
  if (score >= 90) return 'green'
  if (score >= 70) return 'blue'
  if (score >= 50) return 'yellow'
  return 'red'
}

export const COUNTRY_FLAGS = {
  DE: '🇩🇪', JP: '🇯🇵', GB: '🇬🇧', CH: '🇨🇭', IN: '🇮🇳',
  NO: '🇳🇴', SG: '🇸🇬', EG: '🇪🇬', US: '🇺🇸', FR: '🇫🇷',
}
