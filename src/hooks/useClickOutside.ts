import { useEffect, useRef } from 'react'

/**
 * Custom hook that detects clicks outside of a referenced element
 * Useful for closing dropdowns, modals, or other overlay components
 *
 * @param handler - Function to call when click outside is detected
 * @returns Ref to attach to the element to monitor
 * @example
 * ```tsx
 * const ref = useClickOutside(() => setIsOpen(false));
 *
 * return (
 *   <div ref={ref}>
 *     <button onClick={() => setIsOpen(true)}>Open</button>
 *     {isOpen && <Dropdown />}
 *   </div>
 * );
 * ```
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [handler])

  return ref
}
