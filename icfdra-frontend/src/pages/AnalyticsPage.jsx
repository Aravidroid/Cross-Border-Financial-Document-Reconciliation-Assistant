import React from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, ComposedChart, Line,
} from 'recharts'
import Card from '../components/ui/Card'
import Breadcrumb from '../components/ui/Breadcrumb'
import {
  MOCK_MONTHLY_TREND, MOCK_CURRENCY_DATA, MOCK_VENDOR_SPENDING,
  MOCK_RISK_DATA, MOCK_FX_EXPOSURE, MOCK_APPROVAL_RATIO
} from '../utils/mockData'
import { formatCurrency, formatCompact } from '../utils/helpers'

const TOOLTIP_STYLE = {
  contentStyle: { borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  cursor: { fill: 'rgba(37, 99, 235, 0.04)' },
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: 'Analytics' }]} />
        <div className="mt-3">
          <h1 className="page-title">Analytics & Insights</h1>
          <p className="text-sm text-gray-500 mt-1">Financial performance metrics · May 2024 · Refreshed daily</p>
        </div>
      </div>

      {/* Row 1: Monthly Trend + Approval Ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Monthly Invoice Volume" subtitle="Last 6 months by status">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={MOCK_MONTHLY_TREND} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="approved" name="Approved" fill="#2563eb" radius={[3, 3, 0, 0]} />
              <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="flagged" name="Flagged" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="invoices" name="Total" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4, fill: '#7c3aed' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Approval Ratio" subtitle="Auto vs manual approvals">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={MOCK_APPROVAL_RATIO} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="autoApproved" name="Auto-Approved" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
              <Bar dataKey="manualApproved" name="Manual Approved" stackId="a" fill="#7c3aed" />
              <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 2: Vendor Spending + Currency Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Top Vendor Spending" subtitle="By USD equivalent" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={MOCK_VENDOR_SPENDING}
              layout="vertical"
              margin={{ left: 80, right: 30, top: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => formatCompact(v)}
              />
              <YAxis
                type="category"
                dataKey="vendor"
                tick={{ fontSize: 11, fill: '#374151' }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v) => [formatCurrency(v), 'Spend']}
              />
              <Bar dataKey="amount" fill="#2563eb" radius={[0, 4, 4, 0]}>
                {MOCK_VENDOR_SPENDING.map((_, i) => (
                  <Cell key={i} fill={`hsl(${220 + i * 15}, 80%, ${55 + i * 3}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Currency Distribution" subtitle="Invoice count by currency">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={MOCK_CURRENCY_DATA}
                cx="50%"
                cy="50%"
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                nameKey="currency"
                label={({ currency, percent }) => `${currency} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {MOCK_CURRENCY_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v, name) => [`${v} invoices`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {MOCK_CURRENCY_DATA.map(c => (
              <div key={c.currency} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                <span className="text-gray-600 flex-1">{c.currency}</span>
                <span className="text-gray-900 font-semibold">{c.count} invoices</span>
                <span className="text-gray-400">{formatCurrency(c.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3: Risk Distribution + FX Exposure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Risk Distribution" subtitle="Invoice risk level breakdown">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={MOCK_RISK_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {MOCK_RISK_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {MOCK_RISK_DATA.map(r => (
                <div key={r.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                      <span className="text-sm text-gray-600">{r.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{r.value}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(r.value / 1284) * 100}%`, background: r.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="FX Exposure by Currency" subtitle="Hedged vs open positions (USD)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={MOCK_FX_EXPOSURE} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="currency" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => formatCompact(v)}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v) => [formatCurrency(v), '']}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="hedged" name="Hedged" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
              <Bar dataKey="open" name="Open Exposure" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
