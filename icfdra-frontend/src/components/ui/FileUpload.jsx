import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { clsx } from '../../utils/helpers'

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
}

export default function FileUpload({ onFiles, maxFiles = 5, maxSize = 25 * 1024 * 1024 }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((accepted, rejected) => {
    const mapped = accepted.map(f => ({
      file: f,
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size,
      type: f.type,
      progress: 0,
      status: 'queued',
    }))
    setFiles(prev => [...prev, ...mapped])
    onFiles?.(accepted)

    // Simulate upload progress
    mapped.forEach(item => {
      let prog = 0
      const interval = setInterval(() => {
        prog += Math.random() * 20
        if (prog >= 100) {
          prog = 100
          clearInterval(interval)
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 100, status: 'done' } : f))
        } else {
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: Math.round(prog), status: 'uploading' } : f))
        }
      }, 300)
    })
  }, [onFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles,
    maxSize,
  })

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id))

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={clsx(
            'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
            isDragActive ? 'bg-blue-100' : 'bg-gray-100'
          )}>
            <Upload className={clsx('w-7 h-7', isDragActive ? 'text-blue-600' : 'text-gray-400')} />
          </div>
          {isDragActive ? (
            <p className="text-base font-semibold text-blue-600">Drop files here…</p>
          ) : (
            <>
              <div>
                <p className="text-base font-semibold text-gray-700">
                  Drag & drop files here, or{' '}
                  <span className="text-blue-600 underline underline-offset-2">browse</span>
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Accepts PDF, JPG, PNG — up to {formatSize(maxSize)} per file
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{formatSize(item.size)}</span>
                </div>
                {item.status === 'uploading' && (
                  <div className="mt-1">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${item.progress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{item.progress}% uploading…</p>
                  </div>
                )}
                {item.status === 'done' && (
                  <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Upload complete
                  </p>
                )}
              </div>
              <button
                onClick={() => removeFile(item.id)}
                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
