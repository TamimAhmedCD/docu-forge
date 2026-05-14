'use client'

import { useState, useEffect, Suspense, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  FileOutput,
  Download,
  Check,
  Plus,
  Eye,
  Menu,
  X,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTemplates } from '@/hooks/use-templates'
import { useFormStorage } from '@/hooks/use-form-storage'
import { useSectionStorage } from '@/hooks/use-section-storage'
import { useWidthStorage } from '@/hooks/use-width-storage'
import { Template, FormData as FormDataType, GeneratedDocument, FieldWidth, Placeholder } from '@/types'
import { SectionForm } from '@/components/section-form'
import { createDefaultSectionConfig } from '@/lib/section-grouping'
import { generateDocx, generatePdf, downloadDocument } from '@/lib/document-generator'
import { formatDateDDMMYYYY } from '@/lib/date-formatter'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import mammoth from 'mammoth'
import { Trash2 } from 'lucide-react'

function GeneratePageContent() {
  const searchParams = useSearchParams()
  const templateId = searchParams.get('template')
  const { templates, isLoading } = useTemplates()
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  // Use template-scoped form storage so form data persists per template combination
  const { formData, updateFormData, clearFormData, isLoaded } = useFormStorage(
    selectedTemplates.length > 0 ? selectedTemplates : undefined
  )
  const {
    sections,
    isAutoGrouped,
    isLoaded: sectionsLoaded,
    hasDbData,
    setSections,
    setIsAutoGrouped,
    syncWithPlaceholders,
  } = useSectionStorage(selectedTemplates)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([])
  const [outputFormat, setOutputFormat] = useState<'docx' | 'pdf'>('docx')
  const [showPreview, setShowPreview] = useState(false)
  const [documentHtml, setDocumentHtml] = useState<Record<string, string>>({})
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    if (templateId && templates.find(t => t.id === templateId)) {
      setSelectedTemplates([templateId])
    }
  }, [templateId, templates])

  // Persisted placeholder width overrides using the width storage hook
  const { widths: storedWidths, setWidth: setStoredWidth, isLoaded: widthsLoaded } = useWidthStorage()

  // Get all unique placeholders from selected templates with width overrides
  const allPlaceholders = useMemo(() => {
    const basePlaceholders = selectedTemplates.flatMap(id => {
      const template = templates.find(t => t.id === id)
      return template?.placeholders || []
    }).filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i)
    
    // Apply persisted width overrides from storage
    return basePlaceholders.map(p => ({
      ...p,
      width: storedWidths[p.id] || p.width
    }))
  }, [selectedTemplates, templates, storedWidths])

  // Handle placeholder width change - persists to localStorage
  const handlePlaceholderWidthChange = (id: string, width: FieldWidth) => {
    setStoredWidth(id, width)
  }

  // Track if sections have been initialized to prevent duplicate initialization
  const sectionsInitializedRef = useRef(false)
  
  // Reset initialization tracking when template selection changes
  useEffect(() => {
    sectionsInitializedRef.current = false
  }, [selectedTemplates.join('|')])

  // Sync sections when placeholders change
  // CRITICAL: Only sync AFTER DB load completes to prevent overwriting saved data
  useEffect(() => {
    // Wait until sections are loaded from DB
    if (!sectionsLoaded) return
    // Wait until we have placeholders to sync
    if (allPlaceholders.length === 0) return

    // If DB has data, it's already loaded into sections state
    // Only initialize defaults if DB returned nothing
    if (sections.length === 0 && !hasDbData && !sectionsInitializedRef.current) {
      // No DB data exists - create default sections (won't be saved until user changes something)
      const defaultConfig = createDefaultSectionConfig(allPlaceholders)
      setSections(defaultConfig.sections)
      sectionsInitializedRef.current = true
    } else if (sections.length > 0 && !sectionsInitializedRef.current) {
      // DB has data or we have sections - sync with placeholders to add any new ones
      syncWithPlaceholders(allPlaceholders)
      sectionsInitializedRef.current = true
    }
  }, [allPlaceholders, sectionsLoaded, hasDbData, sections.length, setSections, syncWithPlaceholders])

  // Extract document HTML when templates are selected (for preview with formatting)
  useEffect(() => {
    // Set first selected template as preview
    if (selectedTemplates.length > 0 && !previewTemplate) {
      setPreviewTemplate(selectedTemplates[0])
    }
  }, [selectedTemplates, previewTemplate])

  // Separate effect for extracting HTML to avoid dependency issues
  useEffect(() => {
    const extractHtml = async () => {
      if (!previewTemplate || documentHtml[previewTemplate]) return

      setLoadingPreview(true)
      const template = templates.find(t => t.id === previewTemplate)
      
      if (template?.fileContent) {
        try {
          // Create a promise with timeout to prevent hanging on large files
          const extractPromise = mammoth.convertToHtml({ arrayBuffer: template.fileContent })
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Extraction timeout')), 30000) // 30 second timeout
          )
          
          const result = await Promise.race([extractPromise, timeoutPromise]) as any
          setDocumentHtml(prev => ({ ...prev, [previewTemplate]: result.value }))
          setLoadingPreview(false)
        } catch {
          // Generate basic text preview as fallback
          try {
            const textResult = await mammoth.extractRawText({ arrayBuffer: template.fileContent })
            const basicHtml = `<p>${textResult.value.split('\n').join('</p><p>')}</p>`
            setDocumentHtml(prev => ({ ...prev, [previewTemplate]: basicHtml }))
          } catch {
            setDocumentHtml(prev => ({ ...prev, [previewTemplate]: '<p>Document loaded (preview formatting unavailable)</p>' }))
          }
          setLoadingPreview(false)
        }
      }
    }

    extractHtml()
  }, [previewTemplate, templates, documentHtml])

  // Generate preview HTML with placeholders replaced
  const previewHtml = useMemo(() => {
    if (!previewTemplate || !documentHtml[previewTemplate]) return ''
    
    let html = documentHtml[previewTemplate]
    const template = templates.find(t => t.id === previewTemplate)
    
    if (template) {
      template.placeholders.forEach(placeholder => {
        const value = formData[placeholder.id]
        // Format dates as DD/MM/YYYY for preview
        let displayValue = ''
        if (value instanceof Date) {
          displayValue = formatDateDDMMYYYY(value)
        } else if (typeof value === 'string' && placeholder.type === 'date' && value) {
          displayValue = formatDateDDMMYYYY(new Date(value))
        } else {
          displayValue = String(value || '')
        }
        
        // Show filled value or highlight unfilled placeholder
        const replacement = displayValue 
          ? `<span style="background-color: rgba(34, 197, 94, 0.2); padding: 0 2px; border-radius: 2px;">${displayValue}</span>`
          : `<span style="background-color: rgba(239, 68, 68, 0.2); padding: 0 2px; border-radius: 2px; color: #ef4444;">[${placeholder.label}]</span>`
        
        // Replace all placeholder formats in HTML
        const patterns = [
          new RegExp(`\\{\\{\\s*${placeholder.name}\\s*\\}\\}`, 'gi'),
          new RegExp(`\\[${placeholder.name}\\]`, 'gi'),
        ]
        patterns.forEach(pattern => {
          html = html.replace(pattern, replacement)
        })
      })
    }
    
    return html
  }, [previewTemplate, documentHtml, formData, templates])

  const toggleTemplate = (id: string) => {
    setSelectedTemplates(prev => 
      prev.includes(id) 
        ? prev.filter(t => t !== id)
        : [...prev, id]
    )
  }

  const handleInputChange = (id: string, value: string | number | Date) => {
    updateFormData(id, value)
  }

  const handleClearForm = () => {
    clearFormData()
    toast.success('Form data cleared')
  }

  const handleGenerate = async () => {
    if (selectedTemplates.length === 0) {
      toast.error('Please select at least one template')
      return
    }

    // Validate required fields
    const missingFields = allPlaceholders
      .filter(p => p.required && !formData[p.id])
      .map(p => p.label)

    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(', ')}`)
      return
    }

    setIsGenerating(true)
    const docs: GeneratedDocument[] = []

    try {
      for (const templateId of selectedTemplates) {
        const template = templates.find(t => t.id === templateId)
        if (!template) continue

        const generator = outputFormat === 'pdf' ? generatePdf : generateDocx
        const doc = await generator(template, formData)
        docs.push(doc)
      }

      setGeneratedDocs(docs)
      toast.success(`Generated ${docs.length} document${docs.length > 1 ? 's' : ''}`)
    } catch (error) {
      toast.error('Failed to generate documents')
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = (doc: GeneratedDocument) => {
    downloadDocument(doc)
    toast.success('Download started')
  }

  const handleDownloadAll = () => {
    generatedDocs.forEach(doc => downloadDocument(doc))
    toast.success('Downloads started')
  }

  // Wait for database to load before rendering page
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Generate Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Fill the form once, generate multiple documents
        </p>
      </motion.div>

      {templates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-8"
        >
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">No templates available</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Upload templates first to generate documents
            </p>
            <Link href="/dashboard/upload" className="mt-6">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Template
              </Button>
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="mt-8 flex gap-8">
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="fixed bottom-6 right-6 z-40 hidden lg:flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted cursor-pointer"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Template Selection Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: sidebarOpen ? 1 : 0, x: sidebarOpen ? 0 : -20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex-shrink-0 w-full lg:w-80 transition-all duration-200",
              !sidebarOpen && "hidden lg:hidden"
            )}
          >
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border p-4">
                <h2 className="font-semibold text-foreground">Select Templates</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose one or more templates
                </p>
              </div>
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-4">
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => toggleTemplate(template.id)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-all hover:border-muted-foreground/50',
                        selectedTemplates.includes(template.id) && 'border-primary bg-primary/5'
                      )}
                    >
                      <Checkbox
                        checked={selectedTemplates.includes(template.id)}
                        onCheckedChange={() => toggleTemplate(template.id)}
                      />
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <FileText className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate text-sm">
                          {template.name.replace(/\.[^/.]+$/, '')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {template.placeholders.length} fields
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border p-4">
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-muted-foreground">Output Format:</Label>
                  <Select value={outputFormat} onValueChange={(v: 'docx' | 'pdf') => setOutputFormat(v)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="docx">DOCX</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex-1 min-w-0"
          >
            {selectedTemplates.length === 0 ? (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FileOutput className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Select templates to continue
                </h3>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Choose at least one template from the list
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Form Card */}
                <div className="rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <div>
                      <h2 className="font-semibold text-foreground">Fill Form</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {allPlaceholders.length} field{allPlaceholders.length !== 1 ? 's' : ''} to fill
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearForm}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Form
                      </Button>
                      <Button
                        variant={showPreview ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {showPreview ? 'Hide Preview' : 'Show Preview'}
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-[calc(100vh-14rem)] overflow-y-auto overflow-x-hidden p-4 custom-scrollbar">
                    {/* Loading guard: Wait for section config to load from DB before rendering form */}
                    {!sectionsLoaded ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading form layout...</span>
                      </div>
                    ) : (
                      <SectionForm
                        sections={sections}
                        placeholders={allPlaceholders}
                        formData={formData}
                        onSectionsChange={setSections}
                        onFormDataChange={handleInputChange}
                        onPlaceholderWidthChange={handlePlaceholderWidthChange}
                        isAutoGrouped={isAutoGrouped}
                        onAutoGroupedChange={setIsAutoGrouped}
                      />
                    )}
                  </div>
                  <div className="border-t border-border p-4">
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileOutput className="mr-2 h-4 w-4" />
                          Generate {selectedTemplates.length} Document{selectedTemplates.length > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Live Preview */}
                <AnimatePresence>
                  {showPreview && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      <div className="flex items-center justify-between border-b border-border p-4">
                        <div>
                          <h2 className="font-semibold text-foreground">Live Preview</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            See how your document will look with filled values
                          </p>
                        </div>
                        {selectedTemplates.length > 1 && (
                          <Select
                            value={previewTemplate || ''}
                            onValueChange={(v) => setPreviewTemplate(v)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedTemplates.map((id) => {
                                const t = templates.find(t => t.id === id)
                                return (
                                  <SelectItem key={id} value={id}>
                                    {t?.name.replace(/\.[^/.]+$/, '') || id}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="max-h-[500px] overflow-auto p-4">
                        <div className="rounded-lg border border-border bg-white p-6 text-black min-h-[200px] flex items-center justify-center">
                          {loadingPreview ? (
                            <div className="flex flex-col items-center gap-3">
                              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500" />
                              <p className="text-sm text-gray-500">Processing large document...</p>
                            </div>
                          ) : previewHtml ? (
                            <div 
                              className="prose prose-sm max-w-none w-full [&_p]:my-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_img]:max-w-full"
                              dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                          ) : (
                            <p className="text-gray-400">Select a template to see preview</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Generated Documents */}
      <AnimatePresence>
        {generatedDocs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8"
          >
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <h2 className="font-semibold text-foreground">Generated Documents</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {generatedDocs.length} document{generatedDocs.length > 1 ? 's' : ''} ready
                  </p>
                </div>
                {generatedDocs.length > 1 && (
                  <Button variant="outline" onClick={handleDownloadAll}>
                    <Download className="mr-2 h-4 w-4" />
                    Download All
                  </Button>
                )}
              </div>
              <div className="divide-y divide-border">
                {generatedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                        <Check className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{doc.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.type.toUpperCase()} · {formatDateDDMMYYYY(new Date(doc.generatedAt))}
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => handleDownload(doc)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <GeneratePageContent />
    </Suspense>
  )
}
