import React from 'react'
import { Link } from 'react-router-dom'
import { Home, LayoutDashboard, Search } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* 404 Illustration */}
        <div className="relative mb-8">
          <div className="text-[120px] font-black text-gray-100 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center">
              <Search className="w-12 h-12 text-blue-300" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back to the financial reconciliation dashboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/dashboard" className="btn-primary w-full sm:w-auto justify-center">
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link to="/invoices" className="btn-secondary w-full sm:w-auto justify-center">
            <Home className="w-4 h-4" />
            View Invoices
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-400">
            If you believe this is an error, please contact{' '}
            <a href="mailto:support@icfdra.example.com" className="text-blue-600 hover:underline">
              support@icfdra.example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
