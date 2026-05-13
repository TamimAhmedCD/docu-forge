export type PlaceholderFormat = '{{}}' | '[]'

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'email' | 'select'

export type PlaceholderSyncStatus = 'synced' | 'new' | 'removed' | 'modified'

// Field width for dynamic grid layout (5 options)
export type FieldWidth = 'compact' | 'medium' | 'large' | 'xlarge' | 'full'

export interface Placeholder {
  id: string
  name: string
  type: FieldType
  label: string
  required: boolean
  options?: string[] // For select type
  defaultValue?: string
  syncStatus?: PlaceholderSyncStatus
  width?: FieldWidth // For dynamic grid layout
}

export interface PlaceholderSyncResult {
  placeholders: Placeholder[]
  syncedCount: number
  newCount: number
  removedCount: number
  removedPlaceholders: Placeholder[]
}

export interface Template {
  id: string
  name: string
  file: File
  fileContent: ArrayBuffer
  placeholders: Placeholder[]
  createdAt: Date
  updatedAt: Date
}

export interface FormData {
  [key: string]: string | number | Date
}

export interface GeneratedDocument {
  id: string
  templateId: string
  templateName: string
  fileName: string
  blob: Blob
  type: 'docx' | 'pdf'
  generatedAt: Date
}

export interface TemplateEditorState {
  isAutoDetectMode: boolean
  selectedPlaceholder: Placeholder | null
}

// Field group for grouping multiple placeholders together
export interface FieldGroup {
  id: string
  name: string
  placeholderIds: string[]
  isExpanded: boolean
  color?: string
}

// Section types for dynamic form grouping
export interface FormSection {
  id: string
  name: string
  placeholderIds: string[] // Can contain placeholder IDs or group IDs (prefixed with 'group-')
  groups: FieldGroup[] // Groups within this section
  order: number
  isExpanded: boolean
}

export interface SectionConfig {
  sections: FormSection[]
  isAutoGrouped: boolean
  lastModified: Date
}
