'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, use } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  FileText,
  Settings2,
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
import { useTemplates } from '@/hooks/use-templates'
import { Placeholder, FieldType, Template } from '@/types'
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
  const { getTemplate, updatePlaceholders } = useTemplates()
  const [template, setTemplate] = useState<Template | null>(null)
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([])
  const [isAutoMode, setIsAutoMode] = useState(true)
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string | null>(null)
  const [documentText, setDocumentText] = useState('')

  useEffect(() => {
    const t = getTemplate(resolvedParams.id)
    if (t) {
      setTemplate(t)
      setPlaceholders(t.placeholders)
      // Extract document text for preview
      mammoth.extractRawText({ arrayBuffer: t.fileContent }).then((result) => {
        setDocumentText(result.value)
      })
    }
  }, [resolvedParams.id, getTemplate])

  const handleRedetect = async () => {
    if (!template) return
    const result = await mammoth.extractRawText({ arrayBuffer: template.fileContent })
    const detected = detectPlaceholders(result.value)
    setPlaceholders(detected)
    toast.success(`Found ${detected.length} placeholders`)
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

  const handleSave = () => {
    if (!template) return
    updatePlaceholders(template.id, placeholders)
    toast.success('Template saved')
    router.push('/dashboard/templates')
  }

  if (!template) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">Template not found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This template may have been deleted
          </p>
          <Link href="/dashboard/templates" className="mt-6 inline-block">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Templates
            </Button>
          </Link>
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
          <Link href="/dashboard/templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
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
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Placeholders List */}
        <div className="w-80 flex-shrink-0 border-r border-border bg-muted/20">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-semibold text-foreground">Placeholders</h2>
            <Button variant="ghost" size="sm" onClick={addPlaceholder}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
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
                    <p className="font-medium text-foreground truncate">
                      {placeholder.label}
                    </p>
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
    </div>
  )
}
