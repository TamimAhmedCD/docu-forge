import { useState, useCallback, useEffect, useRef } from 'react'
import { FormData } from '@/types'

const FORM_DATA_STORAGE_KEY = 'document-generator-form-data'

// Storage structure: { [templateKey]: FormData }
interface StoredFormData {
  [templateKey: string]: FormData
}

export function useFormStorage(templateIds?: string[]) {
  const [formData, setFormData] = useState<FormData>({})
  const [isLoaded, setIsLoaded] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Create a composite key for the selected templates
  const templateKey = templateIds?.sort().join('|') || 'default'

  // Load form data from localStorage on mount or when templateIds change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedData = localStorage.getItem(FORM_DATA_STORAGE_KEY)
        if (storedData) {
          const allData: StoredFormData = JSON.parse(storedData)
          const templateData = allData[templateKey] || {}
          
          // Convert date strings back to proper format
          const restored: FormData = {}
          for (const [key, value] of Object.entries(templateData)) {
            if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
              restored[key] = value as string | number | Date
            }
          }
          setFormData(restored)
        } else {
          setFormData({})
        }
      } catch (error) {
        console.error('Failed to load form data from localStorage:', error)
        setFormData({})
      }
      setIsLoaded(true)
    }
  }, [templateKey])

  // Debounced save to localStorage
  const saveToStorage = useCallback((key: string, data: FormData) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (typeof window !== 'undefined') {
        try {
          const storedData = localStorage.getItem(FORM_DATA_STORAGE_KEY)
          const allData: StoredFormData = storedData ? JSON.parse(storedData) : {}
          
          // Convert Date objects to ISO strings for storage
          const dataToStore: FormData = {}
          for (const [fieldKey, val] of Object.entries(data)) {
            dataToStore[fieldKey] = val instanceof Date ? val.toISOString() : val
          }
          
          allData[key] = dataToStore
          localStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(allData))
        } catch (error) {
          console.error('Failed to save form data to localStorage:', error)
        }
      }
    }, 300) // Debounce 300ms
  }, [])

  // Update a single form field
  const updateFormData = useCallback((id: string, value: string | number | Date) => {
    setFormData(prev => {
      const updated = { ...prev, [id]: value }
      saveToStorage(templateKey, updated)
      return updated
    })
  }, [templateKey, saveToStorage])

  // Bulk update form data (useful for restoring/merging)
  const setFormDataBulk = useCallback((data: FormData) => {
    setFormData(data)
    saveToStorage(templateKey, data)
  }, [templateKey, saveToStorage])

  // Clear form data for current template
  const clearFormData = useCallback(() => {
    setFormData({})
    if (typeof window !== 'undefined') {
      try {
        const storedData = localStorage.getItem(FORM_DATA_STORAGE_KEY)
        if (storedData) {
          const allData: StoredFormData = JSON.parse(storedData)
          delete allData[templateKey]
          localStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(allData))
        }
      } catch (error) {
        console.error('Failed to clear form data from localStorage:', error)
      }
    }
  }, [templateKey])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    formData,
    updateFormData,
    setFormDataBulk,
    clearFormData,
    isLoaded,
  }
}

/**
 * Delete all form data associated with a template
 * Called when a template is deleted
 */
export function deleteTemplateFormData(templateId: string): void {
  if (typeof window === 'undefined') return

  try {
    const storedData = localStorage.getItem(FORM_DATA_STORAGE_KEY)
    if (!storedData) return

    const allData: StoredFormData = JSON.parse(storedData)
    
    // Find and delete all keys that contain this template ID
    const keysToDelete = Object.keys(allData).filter(key => 
      key === templateId || key.includes(templateId)
    )
    
    keysToDelete.forEach(key => {
      delete allData[key]
    })
    
    localStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(allData))
  } catch (error) {
    console.error('Failed to delete template form data:', error)
  }
}

/**
 * Get all form data for a specific template key
 * Useful for checking if there's existing data before template update
 */
export function getTemplateFormData(templateKey: string): FormData | null {
  if (typeof window === 'undefined') return null

  try {
    const storedData = localStorage.getItem(FORM_DATA_STORAGE_KEY)
    if (!storedData) return null

    const allData: StoredFormData = JSON.parse(storedData)
    return allData[templateKey] || null
  } catch (error) {
    console.error('Failed to get template form data:', error)
    return null
  }
}

/**
 * Preserve form data during template update
 * Keeps values for placeholders that still exist in the new template
 */
export function preserveFormDataOnUpdate(
  templateKey: string, 
  oldPlaceholderIds: string[], 
  newPlaceholderIds: string[]
): void {
  if (typeof window === 'undefined') return

  try {
    const storedData = localStorage.getItem(FORM_DATA_STORAGE_KEY)
    if (!storedData) return

    const allData: StoredFormData = JSON.parse(storedData)
    const existingData = allData[templateKey]
    if (!existingData) return

    // Keep only values for placeholders that exist in the new template
    const preservedData: FormData = {}
    const newPlaceholderSet = new Set(newPlaceholderIds)
    
    for (const [key, value] of Object.entries(existingData)) {
      if (newPlaceholderSet.has(key)) {
        preservedData[key] = value
      }
    }

    allData[templateKey] = preservedData
    localStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(allData))
  } catch (error) {
    console.error('Failed to preserve form data on update:', error)
  }
}
