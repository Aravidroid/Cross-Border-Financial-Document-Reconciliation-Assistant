import React, { useState } from 'react'
import { Search, Clock, ArrowRight, Sparkles, FileText } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Breadcrumb from '../components/ui/Breadcrumb'
import { MOCK_SEARCH_RESULTS, MOCK_RECENT_SEARCHES } from '../utils/mockData'
import { formatDate, formatCurrency } from '../utils/helpers'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

function SimilarityBar({ score }) {
  const pct = Math.round(score * 100)
  const color = pct >= 90 ? '#059669' : pct >= 70 ? '#2563eb' : '#d97706'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{pct}% match</span>
    </div>
  )
}

function ResultCard({ result }) {
  return (
    <div className="card p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-mono text-sm font-bold text-blue-700">{result.id}</p>
              <Badge color="blue">{result.currency}</Badge>
              <SimilarityBar score={result.similarity} />
            </div>
            <p className="text-sm font-semibold text-gray-800 mt-1">{result.vendor}</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{result.snippet}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-gray-400">{formatDate(result.date)}</span>
              <span className="text-sm font-bold text-gray-900">{result.amount}</span>
            </div>
          </div>
        </div>
        <Link
          to={`/invoices/${result.id}`}
          className="btn-secondary flex-shrink-0 text-xs"
        >
          View <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}

export default function SemanticSearchPage() {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (q = query) => {
    if (!q.trim()) return
    setQuery(q)
    setSearching(true)
    setSearched(true)
    await new Promise(r => setTimeout(r, 1000))
    setResults(MOCK_SEARCH_RESULTS)
    setSearching(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: 'Semantic Search' }]} />
        <div className="mt-3">
          <h1 className="page-title">Semantic Search</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered natural language search across all invoice documents and metadata
          </p>
        </div>
      </div>

      {/* Search Hero */}
      <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-0 text-white" noPadding>
        <div className="p-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-200" />
            <span className="text-sm font-medium text-blue-200">Powered by semantic vector search</span>
          </div>
          <p className="text-xl font-bold text-white mb-5">
            Search invoices in plain language
          </p>
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder='Try: "SaaS license invoices from Germany in EUR" or "high risk logistics vendors"'
              className="w-full pl-12 pr-32 py-4 bg-white text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/50 placeholder-gray-400"
            />
            <button
              onClick={() => handleSearch()}
              disabled={searching || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Recent Searches */}
          <Card title="Recent Searches">
            <div className="space-y-1">
              {MOCK_RECENT_SEARCHES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(s)}
                  className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-600 truncate">{s}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Search Tips */}
          <Card title="Search Tips">
            <ul className="space-y-2">
              {[
                'Use natural language descriptions',
                'Include currency codes (EUR, JPY)',
                'Mention vendor names or countries',
                'Describe line item types',
                'Include date ranges',
                'Use risk keywords (high risk, duplicate)',
              ].map((tip, i) => (
                <li key={i} className="text-xs text-gray-500 flex gap-2">
                  <span className="text-blue-400">•</span> {tip}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {!searched ? (
            <Card>
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-base font-semibold text-gray-700">Enter a query to search</p>
                <p className="text-sm text-gray-400 mt-1">
                  Describe what you're looking for in plain language
                </p>
              </div>
            </Card>
          ) : searching ? (
            <Card>
              <LoadingSpinner label="Performing semantic search…" />
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{results?.length}</span> results for "
                  <span className="text-blue-700">{query}</span>"
                </p>
                <Badge color="blue">{results?.length} matches</Badge>
              </div>
              <div className="space-y-3">
                {results?.map(r => <ResultCard key={r.id} result={r} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
