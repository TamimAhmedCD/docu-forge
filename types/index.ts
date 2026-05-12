export type PlaceholderFormat = '{{}}' | '[]'

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'email' | 'select'

export interface Placeholder {
  id: string
  name: string
  type: FieldType
  label: string
  required: boolean
  options?: string[] // For select type
  defaultValue?: string
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
