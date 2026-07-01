import React, { useState } from 'react'
import {
  User, Building, Bell, Shield, Code, Save, Eye, EyeOff,
  Copy, RefreshCw, Plus, Trash2
} from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Breadcrumb from '../components/ui/Breadcrumb'
import Button from '../components/ui/Button'
import Input, { Select, Textarea } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api', label: 'API Config', icon: Code },
]

const MOCK_API_KEYS = [
  { id: 'key_001', name: 'Production API Key', key: 'sk_prod_x2kJm9...rT8pQ', created: '2024-03-15', lastUsed: '2024-05-29', scope: 'read,write' },
  { id: 'key_002', name: 'SFTP Integration', key: 'sk_int_p7mNv4...kW2lR', created: '2024-04-01', lastUsed: '2024-05-28', scope: 'read' },
]

function ProfileTab({ user }) {
  const [saved, setSaved] = useState(false)
  const handleSave = () => {
    setSaved(true)
    toast.success('Profile updated successfully.')
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-5">
      <Card title="Personal Information">
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-2xl font-bold">AC</span>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.role}</p>
            <button className="text-xs text-blue-600 hover:underline mt-1">Change avatar</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="First Name" defaultValue="Alexandra" />
          <Input label="Last Name" defaultValue="Chen" />
          <Input label="Email Address" type="email" defaultValue={user?.email} className="sm:col-span-2" />
          <Input label="Job Title" defaultValue="Senior Finance Manager" />
          <Input label="Department" defaultValue="Finance & Operations" />
          <Input label="Phone" type="tel" defaultValue="+1 (415) 555-0123" />
          <Select label="Timezone" defaultValue="America/Los_Angeles">
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
          </Select>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleSave} icon={<Save className="w-4 h-4" />}>
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function OrganizationTab() {
  return (
    <div className="space-y-5">
      <Card title="Organization Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Organization Name" defaultValue="GlobalFinance Corp" className="sm:col-span-2" />
          <Input label="Tax ID / EIN" defaultValue="47-1234567" />
          <Input label="Registration Number" defaultValue="GFC-2018-USA" />
          <Select label="Industry" defaultValue="finance">
            <option value="finance">Financial Services</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="tech">Technology</option>
            <option value="retail">Retail</option>
          </Select>
          <Select label="Base Currency" defaultValue="USD">
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
          </Select>
          <Input label="Registered Address" defaultValue="100 Market St, San Francisco, CA 94105" className="sm:col-span-2" />
        </div>
        <div className="flex justify-end mt-4">
          <Button icon={<Save className="w-4 h-4" />} onClick={() => toast.success('Organization updated.')}>
            Save Changes
          </Button>
        </div>
      </Card>

      <Card title="Invoice Processing Settings">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Auto-Approval Threshold" type="number" defaultValue="90" hint="Confidence % required for automatic approval" />
          <Input label="Risk Flag Threshold (%)" type="number" defaultValue="50" hint="Confidence % below which to flag for review" />
          <Input label="FX Deviation Alert (%)" type="number" defaultValue="2" hint="% deviation from interbank rate to trigger alert" />
          <Input label="Max Invoice Amount (USD)" type="number" defaultValue="500000" hint="Invoices above this require additional approval" />
        </div>
        <div className="flex justify-end mt-4">
          <Button icon={<Save className="w-4 h-4" />} onClick={() => toast.success('Processing settings updated.')}>
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  )
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    emailAlerts: true, emailDigest: true, highRisk: true,
    approvals: false, rejections: true, fxAlerts: true,
    batchComplete: true, systemUpdates: false,
  })
  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }))

  const notifItems = [
    { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive email for critical events' },
    { key: 'emailDigest', label: 'Daily Digest', desc: 'Daily summary email at 8 AM' },
    { key: 'highRisk', label: 'High Risk Invoices', desc: 'Alert when high-risk invoice detected' },
    { key: 'approvals', label: 'Approvals', desc: 'Notify when invoices are approved' },
    { key: 'rejections', label: 'Rejections', desc: 'Notify when invoices are rejected' },
    { key: 'fxAlerts', label: 'FX Rate Alerts', desc: 'Alert on significant FX movements' },
    { key: 'batchComplete', label: 'Batch Complete', desc: 'Notify when batch processing finishes' },
    { key: 'systemUpdates', label: 'System Updates', desc: 'Maintenance windows and updates' },
  ]

  return (
    <Card title="Notification Preferences" subtitle="Choose what events to be notified about">
      <div className="space-y-1">
        {notifItems.map(item => (
          <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-800">{item.label}</p>
              <p className="text-xs text-gray-400">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${prefs[item.key] ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={prefs[item.key]}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs[item.key] ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <Button icon={<Save className="w-4 h-4" />} onClick={() => toast.success('Notification preferences saved.')}>
          Save Preferences
        </Button>
      </div>
    </Card>
  )
}

function SecurityTab() {
  const [show, setShow] = useState({})
  return (
    <div className="space-y-5">
      <Card title="Change Password">
        <div className="space-y-4 max-w-sm">
          <Input label="Current Password" type="password" placeholder="Enter current password" />
          <Input label="New Password" type="password" placeholder="Minimum 12 characters" />
          <Input label="Confirm New Password" type="password" placeholder="Repeat new password" />
          <Button icon={<Save className="w-4 h-4" />} onClick={() => toast.success('Password changed successfully.')}>
            Update Password
          </Button>
        </div>
      </Card>

      <Card title="Two-Factor Authentication">
        <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200 mb-4">
          <div>
            <p className="text-sm font-semibold text-emerald-800">2FA is Enabled</p>
            <p className="text-xs text-emerald-600 mt-0.5">Authenticator app configured</p>
          </div>
          <Badge color="green" dot>Active</Badge>
        </div>
        <div className="space-y-2">
          <Button variant="secondary">Reconfigure Authenticator</Button>
          <p className="text-xs text-gray-400">Generate backup codes for account recovery</p>
        </div>
      </Card>

      <Card title="Active Sessions">
        {[
          { device: 'Chrome — macOS', ip: '203.0.113.42', location: 'San Francisco, US', current: true, last: 'Now' },
          { device: 'Safari — iPhone 15', ip: '203.0.113.99', location: 'San Francisco, US', current: false, last: '2 hours ago' },
          { device: 'Edge — Windows', ip: '198.51.100.14', location: 'New York, US', current: false, last: 'Yesterday' },
        ].map((s, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800">{s.device}</p>
                {s.current && <Badge color="green" dot>Current</Badge>}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{s.ip} · {s.location} · {s.last}</p>
            </div>
            {!s.current && (
              <button className="text-xs text-red-500 hover:underline" onClick={() => toast.success('Session revoked.')}>
                Revoke
              </button>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}

function ApiTab() {
  const [showKey, setShowKey] = useState({})
  const toggleKey = (id) => setShowKey(p => ({ ...p, [id]: !p[id] }))
  const copyKey = (key) => { navigator.clipboard.writeText(key); toast.success('API key copied to clipboard.') }

  return (
    <div className="space-y-5">
      <Card title="API Configuration" subtitle="Manage API keys and webhook settings">
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-xs text-gray-500">API Base URL</p>
              <p className="text-sm font-mono text-gray-800">https://api.icfdra.example.com/v1</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText('https://api.icfdra.example.com/v1'); toast.success('Copied!') }} className="p-1.5 rounded hover:bg-gray-200 text-gray-500">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-xs text-gray-500">Webhook URL</p>
              <p className="text-sm font-mono text-gray-800">https://api.icfdra.example.com/webhooks</p>
            </div>
            <Badge color="green" dot>Active</Badge>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">API Keys</p>
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => toast.success('New API key generated.')}>
            Generate Key
          </Button>
        </div>

        <div className="space-y-3">
          {MOCK_API_KEYS.map(k => (
            <div key={k.id} className="p-4 border border-gray-200 rounded-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{k.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-mono text-xs text-gray-500">
                      {showKey[k.id] ? 'sk_prod_fullkeywouldbehere' : k.key}
                    </p>
                    <button onClick={() => toggleKey(k.id)} className="text-gray-400 hover:text-gray-600">
                      {showKey[k.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => copyKey(k.key)} className="text-gray-400 hover:text-gray-600">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>Created {k.created}</span>
                    <span>Last used {k.lastUsed}</span>
                    <Badge color="blue">{k.scope}</Badge>
                  </div>
                </div>
                <button onClick={() => toast.success('API key revoked.')} className="text-red-400 hover:text-red-600 p-1 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Webhook Configuration">
        <div className="space-y-4">
          <Input label="Webhook Endpoint URL" defaultValue="https://your-system.com/webhooks/icfdra" />
          <Input label="Webhook Secret" type="password" defaultValue="whsec_xxxxxxxxxxxxx" />
          <div className="space-y-2">
            <p className="label">Trigger Events</p>
            {['invoice.processed', 'invoice.approved', 'invoice.rejected', 'invoice.flagged', 'batch.complete'].map(evt => (
              <label key={evt} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" defaultChecked={evt !== 'batch.complete'} className="accent-blue-600" />
                <span className="font-mono text-xs">{evt}</span>
              </label>
            ))}
          </div>
          <Button icon={<Save className="w-4 h-4" />} onClick={() => toast.success('Webhook settings saved.')}>
            Save Webhook Config
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  const renderTab = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab user={user} />
      case 'organization': return <OrganizationTab />
      case 'notifications': return <NotificationsTab />
      case 'security': return <SecurityTab />
      case 'api': return <ApiTab />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: 'Settings' }]} />
        <div className="mt-3">
          <h1 className="page-title">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account, organization, and preferences</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab Navigation */}
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible w-full lg:w-56 flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="flex-1 min-w-0 animate-fade-in">
          {renderTab()}
        </div>
      </div>
    </div>
  )
}
