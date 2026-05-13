'use client'

import { useState, useEffect, useCallback } from 'react'
import { FieldWidth } from '@/types'

const STORAGE_KEY = 'v0-placeholder-widths'

interface WidthStorageData {
  [placeholderId: string]: FieldWidth
}

/**
 * Hook to persist placeholder width settings in localStorage
 */
export function useWidthStorage() {
  const [widths, setWidths] = useState<WidthStorageData>({})
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as WidthStorageData
        setWidths(parsed)
      }
    } catch (error) {
      console.error('Failed to load width settings:', error)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever widths change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(widths))
      } catch (error) {
        console.error('Failed to save width settings:', error)
      }
    }
  }, [widths, isLoaded])

  // Update a single placeholder width
  const setWidth = useCallback((placeholderId: string, width: FieldWidth) => {
    setWidths(prev => ({
      ...prev,
      [placeholderId]: width
    }))
  }, [])

  // Get width for a placeholder
  const getWidth = useCallback((placeholderId: string): FieldWidth | undefined => {
    return widths[placeholderId]
  }, [widths])

  // Clear all widths
  const clearWidths = useCallback(() => {
    setWidths({})
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    widths,
    isLoaded,
    setWidth,
    getWidth,
    clearWidths,
  }
}
