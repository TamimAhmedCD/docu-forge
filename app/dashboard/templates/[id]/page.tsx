'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, use, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  FileText,
  Settings2,
  Upload,
  GitCompare,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTemplates } from '@/hooks/use-templates'
import { Placeholder, FieldType, Template, PlaceholderSyncResult } from '@/types'
import { PlaceholderSyncPanel } from '@/components/placeholder-sync-panel'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import mammoth from 'mammoth'
import { detectPlaceholders } from '@/lib/placeholder-utils'

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'select', label: 'Select' },
]

export default function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { getTemplate, updatePlaceholders, updateTemplateFile, savePlaceholdersClean, isLoading: storeLoading } = useTemplates()
  const [template, setTemplate] = useState<Template | null>(null)
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([])
  const [originalPlaceholders, setOriginalPlaceholders] = useState<Placeholder[]>([])
  const [removedPlaceholders, setRemovedPlaceholders] = useState<Placeholder[]>([])
  const [isAutoMode, setIsAutoMode] = useState(true)
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string | null>(null)
  const [documentText, setDocumentText] = useState('')
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const [syncResult, setSyncResult] = useState<PlaceholderSyncResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // DB-FIRST LOAD: Load from database first, wait for completion
  useEffect(() => {
    if (storeLoading) {
      // Store is still initializing from database
      return
    }

    const t = getTemplate(resolvedParams.id)
    if (t) {
      setTemplate(t)
      // Load the latest data from the database template
      setPlaceholders(JSON.parse(JSON.stringify(t.placeholders)))
      setOriginalPlaceholders(JSON.parse(JSON.stringify(t.placeholders)))
      // Extract document text for preview
      mammoth.extractRawText({ arrayBuffer: t.fileContent }).then((result) => {
        setDocumentText(result.value)
      })
    }
  }, [resolvedParams.id, getTemplate, storeLoading])

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return JSON.stringify(placeholders) !== JSON.stringify(originalPlaceholders)
  }, [placeholders, originalPlaceholders])

  const handleBack = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedDialog(true)
    } else {
      router.push('/dashboard/templates')
    }
  }

  const handleDiscard = () => {
    setShowUnsavedDialog(false)
    router.push('/dashboard/templates')
  }

  const handleSaveAndLeave = () => {
    if (template) {
      updatePlaceholders(template.id, placeholders)
      toast.success('Template saved')
    }
    setShowUnsavedDialog(false)
    router.push('/dashboard/templates')
  }

  const handleRedetect = async () => {
    if (!template) return
    const result = await mammoth.extractRawText({ arrayBuffer: template.fileContent })
    const detected = detectPlaceholders(result.value)
    setPlaceholders(detected)
    setRemovedPlaceholders([])
    setSyncResult(null)
    setShowSyncPanel(false)
    toast.success(`Found ${detected.length} placeholders`)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !template) return

    if (!file.name.endsWith('.docx')) {
      toast.error('Please upload a DOCX file')
      return
    }

    setIsUploading(true)
    try {
      const result = await updateTemplateFile(template.id, file)
      
      if (result) {
        setSyncResult(result)
        setPlaceholders(result.placeholders)
        setRemovedPlaceholders(result.removedPlaceholders)
        setShowSyncPanel(true)
        
        // Reload template data
        const updatedTemplate = getTemplate(template.id)
        if (updatedTemplate) {
          setTemplate(updatedTemplate)
          mammoth.extractRawText({ arrayBuffer: updatedTemplate.fileContent }).then((r) => {
            setDocumentText(r.value)
          })
        }

        if (result.newCount > 0 || result.removedCount > 0) {
          toast.success(
            `Template synced: ${result.syncedCount} preserved, ${result.newCount} new, ${result.removedCount} removed`
          )
        } else {
          toast.success('Template updated successfully')
        }
      }
    } catch (error) {
      toast.error('Failed to update template')
    } finally {
      setIsUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const addPlaceholder = () => {
    const newPlaceholder: Placeholder = {
      id: crypto.randomUUID(),
      name: 'new_field',
      type: 'text',
      label: 'New Field',
      required: true,
    }
    setPlaceholders((prev) => [...prev, newPlaceholder])
    setSelectedPlaceholder(newPlaceholder.id)
  }

  const updatePlaceholder = (id: string, updates: Partial<Placeholder>) => {
    setPlaceholders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
  }

  const removePlaceholder = (id: string) => {
    setPlaceholders((prev) => prev.filter((p) => p.id !== id))
    if (selectedPlaceholder === id) {
      setSelectedPlaceholder(null)
    }
  }

  const handleSave = async () => {
    if (!template || isSaving) return
    
    setIsSaving(true)
    try {
      await savePlaceholdersClean(template.id, placeholders)
      setOriginalPlaceholders(JSON.parse(JSON.stringify(placeholders)))
      // Clear sync status after saving
      setPlaceholders(prev => prev.map(p => ({ ...p, syncStatus: undefined })))
      setRemovedPlaceholders([])
      setSyncResult(null)
      setShowSyncPanel(false)
      toast.success('Template saved successfully')
    } catch (error) {
      console.error('[v0] Save failed:', error)
      toast.error('Failed to save template')
      // State remains unchanged - user can retry
    } finally {
      setIsSaving(false)
    }
  }

  // HYDRATION SAFETY: Wait for database to load before rendering editor
  if (storeLoading || !template) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted animate-pulse">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {storeLoading ? 'Loading template...' : 'Template not found'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {storeLoading ? 'Fetching data from database' : 'This template may have been deleted'}
          </p>
          {!storeLoading && (
            <Link href="/dashboard/templates" className="mt-6 inline-block">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Templates
              </Button>
            </Link>
          )}
        </div>
      </div>
    )
  }

  const selected = placeholders.find((p) => p.id === selectedPlaceholder)

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {template.name.replace(/\.[^/.]+$/, '')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {placeholders.length} placeholder{placeholders.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-mode"
              checked={isAutoMode}
              onCheckedChange={setIsAutoMode}
            />
            <Label htmlFor="auto-mode" className="text-sm text-muted-foreground">
              Auto-detect
            </Label>
          </div>
          {isAutoMode && (
            <Button variant="outline" size="sm" onClick={handleRedetect}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-detect
            </Button>
          )}
          <label htmlFor="file-upload">
            <Button variant="outline" size="sm" asChild disabled={isUploading}>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Update File'}
              </span>
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".docx"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
          {syncResult && (syncResult.newCount > 0 || syncResult.removedCount > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSyncPanel(!showSyncPanel)}
              className={cn(showSyncPanel && 'bg-muted')}
            >
              <GitCompare className="mr-2 h-4 w-4" />
              Sync Status
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving || storeLoading || !hasUnsavedChanges()}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Placeholders Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-border bg-muted/20">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-semibold text-foreground">Placeholders</h2>
            <Button variant="ghost" size="sm" onClick={addPlaceholder}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="h-[calc(100vh-11rem)] overflow-y-auto overflow-x-hidden p-4">
            <div className="space-y-2">
              {placeholders.map((placeholder) => (
                <motion.div
                  key={placeholder.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-3 transition-all hover:border-muted-foreground/50',
                    selectedPlaceholder === placeholder.id && 'border-primary bg-primary/5'
                  )}
                  onClick={() => setSelectedPlaceholder(placeholder.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {placeholder.label}
                      </p>
                      {placeholder.syncStatus === 'new' && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs px-1.5 py-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {`{{${placeholder.name}}}`} · {placeholder.type}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      removePlaceholder(placeholder.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </motion.div>
              ))}
              {placeholders.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No placeholders found
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={isAutoMode ? handleRedetect : addPlaceholder}
                  >
                    {isAutoMode ? 'Re-detect' : 'Add manually'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Editor Panel */}
        <div className="flex-1 overflow-auto p-6">
          {/* Sync Panel */}
          {showSyncPanel && syncResult && (
            <div className="mx-auto max-w-2xl mb-6">
              <PlaceholderSyncPanel
                placeholders={placeholders}
                removedPlaceholders={removedPlaceholders}
                syncedCount={syncResult.syncedCount}
                newCount={syncResult.newCount}
                removedCount={syncResult.removedCount}
              />
            </div>
          )}

          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-2xl space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Settings2 className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Edit Placeholder</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure field settings
                  </p>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-border bg-card p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Placeholder Name</Label>
                    <Input
                      id="name"
                      value={selected.name}
                      onChange={(e) =>
                        updatePlaceholder(selected.id, { name: e.target.value })
                      }
                      placeholder="e.g., customer_name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used in template as {`{{${selected.name}}}`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="label">Display Label</Label>
                    <Input
                      id="label"
                      value={selected.label}
                      onChange={(e) =>
                        updatePlaceholder(selected.id, { label: e.target.value })
                      }
                      placeholder="e.g., Customer Name"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">Field Type</Label>
                    <Select
                      value={selected.type}
                      onValueChange={(value: FieldType) =>
                        updatePlaceholder(selected.id, { type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default">Default Value</Label>
                    <Input
                      id="default"
                      value={selected.defaultValue || ''}
                      onChange={(e) =>
                        updatePlaceholder(selected.id, { defaultValue: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="required"
                    checked={selected.required}
                    onCheckedChange={(checked) =>
                      updatePlaceholder(selected.id, { required: checked })
                    }
                  />
                  <Label htmlFor="required">Required field</Label>
                </div>

                {selected.type === 'select' && (
                  <div className="space-y-2">
                    <Label htmlFor="options">Options (comma separated)</Label>
                    <Input
                      id="options"
                      value={selected.options?.join(', ') || ''}
                      onChange={(e) =>
                        updatePlaceholder(selected.id, {
                          options: e.target.value.split(',').map((o) => o.trim()),
                        })
                      }
                      placeholder="Option 1, Option 2, Option 3"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted">
                  <Settings2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Select a placeholder
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Click on a placeholder to edit its settings
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Document Preview */}
        <div className="hidden w-96 flex-shrink-0 border-l border-border bg-muted/20 xl:block">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold text-foreground">Document Preview</h2>
          </div>
          <div className="p-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground max-h-[60vh] overflow-auto">
                {documentText || 'Loading document...'}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to save them before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscard}>Discard</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndLeave}>Save Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
