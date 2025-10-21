import { useCallback, useEffect, useState } from "react";

/**
 * State interface for async operations
 */
interface AsyncState<T> {
	data: T | null;
	loading: boolean;
	error: Error | null;
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
		error: null,
		loading: false,
	});

	const execute = useCallback(async () => {
		setState((prev) => ({ ...prev, error: null, loading: true }));

		try {
			const data = await asyncFunction();
			setState({ data, error: null, loading: false });
			return data;
		} catch (error) {
			const errorObj =
				error instanceof Error ? error : new Error(String(error));
			setState({ data: null, error: errorObj, loading: false });
			throw errorObj;
		}
	}, [asyncFunction]);

	useEffect(() => {
		if (immediate) {
			execute();
		}
	}, [execute, immediate]);

	return {
		...state,
		execute,
	};
}
