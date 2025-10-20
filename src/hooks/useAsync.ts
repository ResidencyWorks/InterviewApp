import { useCallback, useEffect, useState } from 'react'

/**
 * State interface for async operations
 */
interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * Custom hook for handling async operations with loading, error, and data states
 *
 * @param asyncFunction - The async function to execute
 * @param immediate - Whether to execute immediately on mount (default: true)
 * @returns Object with async state and execute function
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useAsync(
 *   () => fetchUserData(userId),
 *   false
 * );
 *
 * const handleSubmit = () => execute();
 * ```
 */
export function useAsync<T>(asyncFunction: () => Promise<T>, immediate = true) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const data = await asyncFunction()
      setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      setState({ data: null, loading: false, error: errorObj })
      throw errorObj
    }
  }, [asyncFunction])

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  return {
    ...state,
    execute,
  }
}
