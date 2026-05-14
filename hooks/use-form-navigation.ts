'use client'

import { useCallback, useEffect, useRef } from 'react'

type FocusableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/**
 * Hook to manage form keyboard navigation
 * - TAB moves only between input fields (skips buttons, hidden, disabled elements)
 * - Provides smooth focus highlighting
 * - Supports large dynamic forms
 */
export function useFormNavigation(containerRef: React.RefObject<HTMLElement | null>) {
  const lastFocusedRef = useRef<FocusableElement | null>(null)

  // Get all focusable input elements within the container
  const getFocusableInputs = useCallback((): FocusableElement[] => {
    if (!containerRef.current) return []

    const selector = [
      'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
    ].join(', ')

    const elements = containerRef.current.querySelectorAll<FocusableElement>(selector)
    
    // Filter out invisible elements
    return Array.from(elements).filter((el) => {
      const style = window.getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      )
    })
  }, [containerRef])

  // Find the next focusable input
  const getNextInput = useCallback(
    (current: FocusableElement, direction: 'forward' | 'backward'): FocusableElement | null => {
      const inputs = getFocusableInputs()
      const currentIndex = inputs.indexOf(current)

      if (currentIndex === -1) {
        return inputs[0] || null
      }

      const nextIndex =
        direction === 'forward'
          ? (currentIndex + 1) % inputs.length
          : (currentIndex - 1 + inputs.length) % inputs.length

      return inputs[nextIndex] || null
    },
    [getFocusableInputs]
  )

  // Focus an element with smooth scroll
  const focusElement = useCallback((element: FocusableElement) => {
    // Scroll element into view smoothly
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    })

    // Small delay to allow scroll to complete
    requestAnimationFrame(() => {
      element.focus({ preventScroll: true })
      lastFocusedRef.current = element

      // Select text for text inputs
      if (
        element instanceof HTMLInputElement &&
        ['text', 'email', 'url', 'tel', 'search', 'password'].includes(element.type)
      ) {
        element.select()
      }
    })
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Tab key
      if (e.key !== 'Tab') return

      const activeElement = document.activeElement as FocusableElement
      
      // Check if we're inside an input element
      if (
        !activeElement ||
        !(activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement instanceof HTMLSelectElement)
      ) {
        return
      }

      // Check if the active element is within our container
      if (!container.contains(activeElement)) {
        return
      }

      const direction = e.shiftKey ? 'backward' : 'forward'
      const nextInput = getNextInput(activeElement, direction)

      if (nextInput) {
        e.preventDefault()
        focusElement(nextInput)
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [containerRef, getNextInput, focusElement])

  // Focus the first input in the form
  const focusFirstInput = useCallback(() => {
    const inputs = getFocusableInputs()
    if (inputs.length > 0) {
      focusElement(inputs[0])
    }
  }, [getFocusableInputs, focusElement])

  // Focus a specific field by name or ID
  const focusField = useCallback(
    (nameOrId: string) => {
      const inputs = getFocusableInputs()
      const target = inputs.find(
        (input) => input.name === nameOrId || input.id === nameOrId
      )
      if (target) {
        focusElement(target)
      }
    },
    [getFocusableInputs, focusElement]
  )

  // Get current field index for progress indication
  const getCurrentFieldIndex = useCallback((): { current: number; total: number } => {
    const inputs = getFocusableInputs()
    const activeElement = document.activeElement as FocusableElement
    const currentIndex = inputs.indexOf(activeElement)
    return {
      current: currentIndex >= 0 ? currentIndex + 1 : 0,
      total: inputs.length,
    }
  }, [getFocusableInputs])

  return {
    focusFirstInput,
    focusField,
    getFocusableInputs,
    getCurrentFieldIndex,
    getNextInput,
    focusElement,
  }
}

/**
 * CSS class to apply to form inputs for enhanced focus styling
 * Use: className={cn('...other classes', formInputClass)}
 */
export const formInputClass = 'form-input-focus'
