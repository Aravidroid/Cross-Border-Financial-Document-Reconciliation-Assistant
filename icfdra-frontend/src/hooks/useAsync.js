import { useState, useCallback, useRef } from 'react'

/**
 * Hook for managing async operations with loading/error state
 */
export function useAsync(asyncFn, options = {}) {
  const [status, setStatus] = useState('idle')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const isMounted = useRef(true)

  const execute = useCallback(async (...args) => {
    setStatus('loading')
    setError(null)
    try {
      const result = await asyncFn(...args)
      if (isMounted.current) {
        setData(result)
        setStatus('success')
        options.onSuccess?.(result)
      }
      return result
    } catch (err) {
      if (isMounted.current) {
        setError(err)
        setStatus('error')
        options.onError?.(err)
      }
      throw err
    }
  }, [asyncFn])

  const reset = useCallback(() => {
    setStatus('idle')
    setData(null)
    setError(null)
  }, [])

  return {
    execute,
    status,
    data,
    error,
    reset,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    isIdle: status === 'idle',
  }
}
