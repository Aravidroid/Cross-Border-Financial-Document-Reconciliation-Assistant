import React from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, ClipboardList, CheckCircle, XCircle,
  TrendingUp, AlertTriangle, ArrowRight, Clock,
  Upload, Activity
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import Card, { StatCard } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Breadcrumb from '../components/ui/Breadcrumb'
import {
  MOCK_STATS, MOCK_MONTHLY_TREND, MOCK_CURRENCY_DATA,
  MOCK_RECENT_ACTIVITY, MOCK_HIGH_RISK, MOCK_AUDIT_LOGS
} from '../utils/mockData'
import { formatCurrency, formatCompact, formatDateTime, getRiskColor } from '../utils/helpers'

function ActivityItem({ item }) {
  const colorMap = { approved: 'green', flagged: 'yellow', uploaded: 'blue', rejected: 'red' }
  const color = colorMap[item.type] || 'gray'
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
        color === 'green' ? 'bg-emerald-500' :
        color === 'yellow' ? 'bg-amber-500' :
        color === 'red' ? 'bg-red-500' : 'bg-blue-500'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700">{item.message}</p>
        <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumb items={[{ label: 'Dashboard' }]} />
        <div className="flex items-center justify-between mt-3">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Cross-border financial reconciliation overview · Last updated just now
            </p>
          </div>
          <Link to="/upload" className="btn-primary hidden sm:flex">
            <Upload className="w-4 h-4" />
            Upload Invoice
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoices"
          value={formatCompact(MOCK_STATS.totalInvoices)}
          subtitle="All time"
          color="blue"
          change="+8.2% this month"
          changeDir="up"
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          title="Pending Reviews"
          value={MOCK_STATS.pendingReviews}
          subtitle="Requires attention"
          color="yellow"
          change="+3 since yesterday"
          changeDir="up"
          icon={<ClipboardList className="w-5 h-5" />}
        />
        <StatCard
          title="Approved"
          value={formatCompact(MOCK_STATS.approvedInvoices)}
          subtitle={`${MOCK_STATS.autoApprovalRate}% auto-approved`}
          color="green"
          change="+12.4% this month"
          changeDir="up"
          icon={<CheckCircle className="w-5 h-5" />}
        />
        <StatCard
          title="Rejected"
          value={MOCK_STATS.rejectedInvoices}
          subtitle="This period"
          color="red"
          change="-2.1% vs last month"
          changeDir="up"
          icon={<XCircle className="w-5 h-5" />}
        />
      </div>

      {/* Second stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total FX Exposure"
          value={formatCurrency(MOCK_STATS.totalFXExposure)}
          subtitle="Open positions"
          color="purple"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Avg Processing"
          value={MOCK_STATS.avgProcessingTime}
          subtitle="Per document"
          color="blue"
          change="↓ 18% faster"
          changeDir="up"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Auto-Approval Rate"
          value={`${MOCK_STATS.autoApprovalRate}%`}
          subtitle="AI confidence"
          color="green"
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          title="Flagged This Week"
          value={MOCK_STATS.flaggedThisWeek}
          subtitle="For manual review"
          color="yellow"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend */}
        <Card
          className="lg:col-span-2"
          title="Monthly Invoice Trend"
          subtitle="Last 6 months"
          action={
            <Link to="/analytics" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View details <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MOCK_MONTHLY_TREND} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInvoices" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                cursor={{ stroke: '#e5e7eb' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="invoices" name="Total" stroke="#7c3aed" fill="url(#colorInvoices)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="approved" name="Approved" stroke="#2563eb" fill="url(#colorApproved)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Currency Distribution */}
        <Card title="Currency Distribution" subtitle="By USD value">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={MOCK_CURRENCY_DATA}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                nameKey="currency"
              >
                {MOCK_CURRENCY_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => formatCurrency(v)}
                contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
            {MOCK_CURRENCY_DATA.map((c) => (
              <div key={c.currency} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                <span className="text-xs text-gray-600">{c.currency}</span>
                <span className="text-xs text-gray-400 ml-auto">{c.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <Card
          title="Recent Processing Activity"
          action={
            <Link to="/audit" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="divide-y divide-gray-50">
            {MOCK_RECENT_ACTIVITY.map(a => <ActivityItem key={a.id} item={a} />)}
          </div>
        </Card>

        {/* High Risk Invoices */}
        <Card
          title="High Risk Invoices"
          subtitle="Requiring immediate attention"
          action={
            <Link to="/review" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Review <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="space-y-3">
            {MOCK_HIGH_RISK.map(inv => (
              <Link
                key={inv.id}
                to={`/invoices/${inv.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{inv.id}</p>
                  <p className="text-xs text-gray-500 truncate">{inv.vendor}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{inv.issue}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{inv.amount}</p>
                  <Badge color={getRiskColor(inv.risk)} className="mt-1">
                    {inv.risk}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Audit Logs */}
        <Card
          title="Recent Audit Logs"
          action={
            <Link to="/audit" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="space-y-2">
            {MOCK_AUDIT_LOGS.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-start gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                  log.severity === 'success' ? 'bg-emerald-500' :
                  log.severity === 'error' ? 'bg-red-500' :
                  log.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-400'
                }`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800">{log.action}</p>
                  <p className="text-xs text-gray-500">{log.actor} · {log.target}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(log.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
