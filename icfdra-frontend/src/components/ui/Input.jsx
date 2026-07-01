import React, { forwardRef } from 'react'
import { clsx } from '../../utils/helpers'

const Input = forwardRef(function Input(
  { label, error, hint, className = '', icon, iconRight, type = 'text', id, required, ...rest },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '_')
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          type={type}
          className={clsx(
            'input-field',
            icon && 'pl-9',
            iconRight && 'pr-9',
            error && 'border-red-400 focus:ring-red-400'
          )}
          {...rest}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
})

export default Input

export function Select({ label, error, hint, className = '', children, id, required, ...rest }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '_')
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={clsx('input-field', error && 'border-red-400 focus:ring-red-400')}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export function Textarea({ label, error, hint, className = '', id, required, ...rest }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '_')
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={clsx('input-field resize-none', error && 'border-red-400 focus:ring-red-400')}
        rows={4}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}
