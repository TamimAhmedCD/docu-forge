'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  Settings2,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Placeholder, FormSection, FormData as FormDataType } from '@/types'
import { cn } from '@/lib/utils'
import {
  getSectionProgress,
  toggleSectionExpanded,
  addSection,
  renameSection,
  deleteSection,
  movePlaceholder,
  autoGroupPlaceholders,
} from '@/lib/section-grouping'

interface SectionFormProps {
  sections: FormSection[]
  placeholders: Placeholder[]
  formData: FormDataType
  onSectionsChange: (sections: FormSection[]) => void
  onFormDataChange: (id: string, value: string | number | Date) => void
  isAutoGrouped: boolean
  onAutoGroupedChange: (value: boolean) => void
}

export function SectionForm({
  sections,
  placeholders,
  formData,
  onSectionsChange,
  onFormDataChange,
  isAutoGrouped,
  onAutoGroupedChange,
}: SectionFormProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingSectionName, setEditingSectionName] = useState('')
  const [showAddSection, setShowAddSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ sectionId: string; moveTo: string } | null>(null)
  const [draggedPlaceholder, setDraggedPlaceholder] = useState<{ id: string; sectionId: string } | null>(null)

  // Filter placeholders by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery) return sections

    const query = searchQuery.toLowerCase()
    return sections.map(section => {
      const filteredIds = section.placeholderIds.filter(id => {
        const placeholder = placeholders.find(p => p.id === id)
        return placeholder && (
          placeholder.name.toLowerCase().includes(query) ||
          placeholder.label.toLowerCase().includes(query)
        )
      })
      return { ...section, placeholderIds: filteredIds }
    }).filter(section => section.placeholderIds.length > 0)
  }, [sections, searchQuery, placeholders])

  // Overall progress
  const overallProgress = useMemo(() => {
    const filled = placeholders.filter(p => {
      const value = formData[p.id]
      return value !== undefined && value !== null && value !== ''
    }).length
    return {
      filled,
      total: placeholders.length,
      percentage: placeholders.length > 0 ? Math.round((filled / placeholders.length) * 100) : 0,
    }
  }, [placeholders, formData])

  const handleToggleSection = (sectionId: string) => {
    onSectionsChange(toggleSectionExpanded(sections, sectionId))
  }

  const handleStartEditSection = (section: FormSection) => {
    setEditingSectionId(section.id)
    setEditingSectionName(section.name)
  }

  const handleSaveEditSection = () => {
    if (editingSectionId && editingSectionName.trim()) {
      onSectionsChange(renameSection(sections, editingSectionId, editingSectionName.trim()))
      onAutoGroupedChange(false)
    }
    setEditingSectionId(null)
    setEditingSectionName('')
  }

  const handleAddSection = () => {
    if (newSectionName.trim()) {
      onSectionsChange(addSection(sections, newSectionName.trim()))
      onAutoGroupedChange(false)
      setNewSectionName('')
      setShowAddSection(false)
    }
  }

  const handleDeleteSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    if (section.placeholderIds.length > 0) {
      // Show confirmation dialog to choose where to move placeholders
      const otherSections = sections.filter(s => s.id !== sectionId)
      if (otherSections.length > 0) {
        setDeleteConfirm({ sectionId, moveTo: otherSections[0].id })
      }
    } else {
      onSectionsChange(deleteSection(sections, sectionId))
      onAutoGroupedChange(false)
    }
  }

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onSectionsChange(deleteSection(sections, deleteConfirm.sectionId, deleteConfirm.moveTo))
      onAutoGroupedChange(false)
      setDeleteConfirm(null)
    }
  }

  const handleResetToAuto = () => {
    const newSections = autoGroupPlaceholders(placeholders)
    onSectionsChange(newSections)
    onAutoGroupedChange(true)
  }

  const handleDragStart = (placeholderId: string, sectionId: string) => {
    setDraggedPlaceholder({ id: placeholderId, sectionId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetSectionId: string, targetIndex?: number) => {
    if (draggedPlaceholder && draggedPlaceholder.sectionId !== targetSectionId) {
      onSectionsChange(
        movePlaceholder(
          sections,
          draggedPlaceholder.id,
          draggedPlaceholder.sectionId,
          targetSectionId,
          targetIndex
        )
      )
      onAutoGroupedChange(false)
    }
    setDraggedPlaceholder(null)
  }

  const renderField = (placeholder: Placeholder, sectionId: string) => {
    const value = formData[placeholder.id]
    const isFilled = value !== undefined && value !== null && value !== ''

    return (
      <motion.div
        key={placeholder.id}
        layout
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        draggable
        onDragStart={() => handleDragStart(placeholder.id, sectionId)}
        onDragEnd={() => setDraggedPlaceholder(null)}
        className={cn(
          'group relative rounded-lg border border-border bg-card p-4 transition-all',
          draggedPlaceholder?.id === placeholder.id && 'opacity-50',
          isFilled && 'border-primary/30 bg-primary/5'
        )}
      >
        <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="pl-4 space-y-2">
          <Label htmlFor={placeholder.id} className="flex items-center gap-2">
            {placeholder.label}
            {placeholder.required && (
              <span className="text-destructive">*</span>
            )}
            {placeholder.syncStatus === 'new' && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                New
              </Badge>
            )}
          </Label>
          {placeholder.type === 'textarea' ? (
            <Textarea
              id={placeholder.id}
              value={(value as string) || ''}
              onChange={(e) => onFormDataChange(placeholder.id, e.target.value)}
              placeholder={`Enter ${placeholder.label.toLowerCase()}`}
              rows={3}
              className="resize-none"
            />
          ) : placeholder.type === 'select' ? (
            <Select
              value={(value as string) || ''}
              onValueChange={(v) => onFormDataChange(placeholder.id, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${placeholder.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {placeholder.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={placeholder.id}
              type={
                placeholder.type === 'number' ? 'number' :
                placeholder.type === 'date' ? 'date' :
                placeholder.type === 'email' ? 'email' : 'text'
              }
              value={(value as string) || ''}
              onChange={(e) => onFormDataChange(placeholder.id, e.target.value)}
              placeholder={`Enter ${placeholder.label.toLowerCase()}`}
            />
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal">
            {overallProgress.filled}/{overallProgress.total} filled
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-2 h-4 w-4" />
                Sections
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAddSection(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleResetToAuto}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Auto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm text-muted-foreground">{overallProgress.percentage}%</span>
        </div>
        <Progress value={overallProgress.percentage} className="h-2" />
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredSections.map((section) => {
            const progress = getSectionProgress(section, placeholders, formData)
            const sectionPlaceholders = section.placeholderIds
              .map(id => placeholders.find(p => p.id === id))
              .filter(Boolean) as Placeholder[]

            return (
              <motion.div
                key={section.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(section.id)}
              >
                {/* Section Header */}
                <div
                  className={cn(
                    'flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                    section.isExpanded && 'border-b border-border'
                  )}
                  onClick={() => handleToggleSection(section.id)}
                >
                  {section.isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  
                  {editingSectionId === section.id ? (
                    <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditSection()
                          if (e.key === 'Escape') setEditingSectionId(null)
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEditSection}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingSectionId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{section.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {progress.filled}/{progress.total} fields completed
                        </p>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="w-20">
                          <Progress value={progress.percentage} className="h-1.5" />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {progress.percentage}%
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStartEditSection(section)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteSection(section.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </>
                  )}
                </div>

                {/* Section Content */}
                <AnimatePresence>
                  {section.isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3">
                        {sectionPlaceholders.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No fields in this section</p>
                            <p className="text-sm">Drag fields here to add them</p>
                          </div>
                        ) : (
                          sectionPlaceholders.map((placeholder) =>
                            renderField(placeholder, section.id)
                          )
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Add Section Dialog */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Create a new section to organize your form fields.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="section-name">Section Name</Label>
            <Input
              id="section-name"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g., Contact Information"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSection()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSection(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSection} disabled={!newSectionName.trim()}>
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
            <DialogDescription>
              This section contains fields. Choose where to move them before deleting.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Move fields to:</Label>
            <Select
              value={deleteConfirm?.moveTo || ''}
              onValueChange={(v) => setDeleteConfirm(prev => prev ? { ...prev, moveTo: v } : null)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections
                  .filter(s => s.id !== deleteConfirm?.sectionId)
                  .map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
