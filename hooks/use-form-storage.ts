import { useState, useCallback, useEffect } from 'react'
import { FormData } from '@/types'

const FORM_DATA_STORAGE_KEY = 'document-generator-form-data'

export function useFormStorage() {
  const [formData, setFormData] = useState<FormData>({})
  const [isLoaded, setIsLoaded] = useState(false)

  // Load form data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedData = localStorage.getItem(FORM_DATA_STORAGE_KEY)
        if (storedData) {
          const parsed = JSON.parse(storedData)
          // Convert date strings back to Date objects where applicable
          const restored: FormData = {}
          for (const [key, value] of Object.entries(parsed)) {
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
              // If it looks like a date string, keep it as string for input[type="date"]
              restored[key] = value
            } else if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
              restored[key] = value as string | number | Date
            }
          }
          setFormData(restored)
        }
      } catch (error) {
        console.error('Failed to load form data from localStorage:', error)
      }
      setIsLoaded(true)
    }
  }, [])

  // Save form data to localStorage whenever it changes
  const updateFormData = useCallback((id: string, value: string | number | Date) => {
    setFormData(prev => {
      const updated = { ...prev, [id]: value }
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          // Convert Date objects to ISO strings for storage
          const dataToStore: FormData = {}
          for (const [key, val] of Object.entries(updated)) {
            dataToStore[key] = val instanceof Date ? val.toISOString() : val
          }
          localStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(dataToStore))
        } catch (error) {
          console.error('Failed to save form data to localStorage:', error)
        }
      }
      
      return updated
    })
  }, [])

  // Clear all form data
  const clearFormData = useCallback(() => {
    setFormData({})
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(FORM_DATA_STORAGE_KEY)
      } catch (error) {
        console.error('Failed to clear form data from localStorage:', error)
      }
    }
  }, [])

  return {
    formData,
    updateFormData,
    clearFormData,
    isLoaded,
  }
}
