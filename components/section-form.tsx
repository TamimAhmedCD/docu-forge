'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
  MeasuringStrategy,
  useDroppable,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers'
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
  Undo2,
  Columns,
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
import { Placeholder, FormSection, FormData as FormDataType, FieldWidth } from '@/types'
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
import {
  detectFieldWidth,
  getFieldWidthClasses,
  WIDTH_OPTIONS,
} from '@/lib/field-width'

interface SectionFormProps {
  sections: FormSection[]
  placeholders: Placeholder[]
  formData: FormDataType
  onSectionsChange: (sections: FormSection[]) => void
  onFormDataChange: (id: string, value: string | number | Date) => void
  onPlaceholderWidthChange?: (id: string, width: FieldWidth) => void
  isAutoGrouped: boolean
  onAutoGroupedChange: (value: boolean) => void
}

// Types for drag items
type DragItemType = 'placeholder' | 'section'
interface DragData {
  type: DragItemType
  sectionId?: string
  placeholderId?: string
}

// Droppable Section Content Wrapper - makes the entire section content area a valid drop target
function DroppableSectionContent({ 
  sectionId, 
  children,
  isEmpty 
}: { 
  sectionId: string
  children: React.ReactNode
  isEmpty?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-drop-${sectionId}`,
    data: {
      type: 'section' as DragItemType,
      sectionId,
    },
  })

  if (isEmpty) {
    return (
      <div 
        ref={setNodeRef}
        className={cn(
          "text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg transition-colors",
          isOver ? "border-primary bg-primary/10" : "border-border"
        )}
      >
        <p>No fields in this section</p>
        <p className="text-sm">Drag fields here to add them</p>
      </div>
    )
  }

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "rounded-lg transition-colors",
        isOver && "ring-2 ring-primary/30 bg-primary/5"
      )}
    >
      {children}
    </div>
  )
}

// Sortable Field Component
function SortableField({
  placeholder,
  sectionId,
  formData,
  onFormDataChange,
  onWidthChange,
  isDragging,
}: {
  placeholder: Placeholder
  sectionId: string
  formData: FormDataType
  onFormDataChange: (id: string, value: string | number | Date) => void
  onWidthChange?: (id: string, width: FieldWidth) => void
  isDragging?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `placeholder-${placeholder.id}`,
    data: {
      type: 'placeholder' as DragItemType,
      sectionId,
      placeholderId: placeholder.id,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const value = formData[placeholder.id]
  const isFilled = value !== undefined && value !== null && value !== ''
  const fieldWidth = detectFieldWidth(placeholder)

  if (isSortableDragging || isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 h-16',
          getFieldWidthClasses(fieldWidth)
        )}
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-lg border border-border bg-card p-3 transition-all hover:border-muted-foreground/30',
        isFilled && 'border-primary/30 bg-primary/5',
        getFieldWidthClasses(fieldWidth)
      )}
    >
      {/* Compact Header with Drag Handle and Width Selector */}
      <div className="flex items-center gap-2 mb-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted transition-colors touch-none opacity-50 group-hover:opacity-100"
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <Label htmlFor={placeholder.id} className="flex-1 text-sm font-medium truncate flex items-center gap-1.5">
          {placeholder.label}
          {placeholder.required && (
            <span className="text-destructive text-xs">*</span>
          )}
        </Label>
        {placeholder.syncStatus === 'new' && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] px-1 py-0">
            New
          </Badge>
        )}
        {/* Width Selector */}
        {onWidthChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Columns className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[100px]">
              {WIDTH_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onWidthChange(placeholder.id, option.value)}
                  className={cn(
                    'text-xs',
                    fieldWidth === option.value && 'bg-muted'
                  )}
                >
                  <span className="mr-2 font-mono text-muted-foreground">{option.icon}</span>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Compact Input */}
      {placeholder.type === 'textarea' ? (
        <Textarea
          id={placeholder.id}
          value={(value as string) || ''}
          onChange={(e) => onFormDataChange(placeholder.id, e.target.value)}
          placeholder={`Enter ${placeholder.label.toLowerCase()}`}
          rows={2}
          className="resize-none text-sm min-h-[60px]"
        />
      ) : placeholder.type === 'select' ? (
        <Select
          value={(value as string) || ''}
          onValueChange={(v) => onFormDataChange(placeholder.id, v)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={`Select...`} />
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
          className="h-9 text-sm"
        />
      )}
    </div>
  )
}

// Sortable Section Component
function SortableSection({
  section,
  placeholders,
  formData,
  onFormDataChange,
  onWidthChange,
  onToggleSection,
  onEditSection,
  onDeleteSection,
  editingSectionId,
  editingSectionName,
  setEditingSectionName,
  onSaveEditSection,
  onCancelEditSection,
  isDragOverlay,
  activePlaceholderId,
}: {
  section: FormSection
  placeholders: Placeholder[]
  formData: FormDataType
  onFormDataChange: (id: string, value: string | number | Date) => void
  onWidthChange?: (id: string, width: FieldWidth) => void
  onToggleSection: (sectionId: string) => void
  onEditSection: (section: FormSection) => void
  onDeleteSection: (sectionId: string) => void
  editingSectionId: string | null
  editingSectionName: string
  setEditingSectionName: (name: string) => void
  onSaveEditSection: () => void
  onCancelEditSection: () => void
  isDragOverlay?: boolean
  activePlaceholderId?: string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `section-${section.id}`,
    data: {
      type: 'section' as DragItemType,
      sectionId: section.id,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const progress = getSectionProgress(section, placeholders, formData)
  const sectionPlaceholders = section.placeholderIds
    .map(id => placeholders.find(p => p.id === id))
    .filter(Boolean) as Placeholder[]

  const placeholderIds = sectionPlaceholders.map(p => `placeholder-${p.id}`)

  if (isDragging && !isDragOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 h-20"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border border-border bg-card overflow-hidden',
        isDragOverlay && 'shadow-2xl ring-2 ring-primary/50'
      )}
    >
      {/* Section Header */}
      <div
        className={cn(
          'flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors',
          section.isExpanded && 'border-b border-border'
        )}
      >
        {/* Section Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 flex items-center gap-3" onClick={() => onToggleSection(section.id)}>
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
                  if (e.key === 'Enter') onSaveEditSection()
                  if (e.key === 'Escape') onCancelEditSection()
                }}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onSaveEditSection}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onCancelEditSection}>
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
                    <DropdownMenuItem onClick={() => onEditSection(section)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteSection(section.id)}
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
            <div className="p-4 min-h-[80px]">
              <DroppableSectionContent 
                sectionId={section.id} 
                isEmpty={sectionPlaceholders.length === 0}
              >
                <SortableContext items={placeholderIds} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-6 gap-3">
                    {sectionPlaceholders.map((placeholder) => (
                      <SortableField
                        key={placeholder.id}
                        placeholder={placeholder}
                        sectionId={section.id}
                        formData={formData}
                        onFormDataChange={onFormDataChange}
                        onWidthChange={onWidthChange}
                        isDragging={activePlaceholderId === placeholder.id}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DroppableSectionContent>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Field Drag Overlay Component
function FieldDragOverlay({ placeholder, formData }: { placeholder: Placeholder; formData: FormDataType }) {
  const value = formData[placeholder.id]
  const isFilled = value !== undefined && value !== null && value !== ''

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-primary bg-card p-4 shadow-2xl w-full max-w-md',
        isFilled && 'border-primary bg-primary/5'
      )}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-primary" />
        <Label className="flex items-center gap-2">
          {placeholder.label}
          {placeholder.required && (
            <span className="text-destructive">*</span>
          )}
        </Label>
      </div>
    </div>
  )
}

// Section Drag Overlay Component
function SectionDragOverlay({ section, placeholders, formData }: { 
  section: FormSection
  placeholders: Placeholder[]
  formData: FormDataType 
}) {
  const progress = getSectionProgress(section, placeholders, formData)

  return (
    <div className="rounded-xl border-2 border-primary bg-card shadow-2xl overflow-hidden w-full max-w-2xl">
      <div className="flex items-center gap-3 p-4">
        <GripVertical className="h-5 w-5 text-primary" />
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{section.name}</h3>
          <p className="text-xs text-muted-foreground">
            {progress.filled}/{progress.total} fields
          </p>
        </div>
      </div>
    </div>
  )
}

export function SectionForm({
  sections,
  placeholders,
  formData,
  onSectionsChange,
  onFormDataChange,
  onPlaceholderWidthChange,
  isAutoGrouped,
  onAutoGroupedChange,
}: SectionFormProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingSectionName, setEditingSectionName] = useState('')
  const [showAddSection, setShowAddSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ sectionId: string; moveTo: string } | null>(null)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [activeType, setActiveType] = useState<DragItemType | null>(null)
  const [history, setHistory] = useState<FormSection[][]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Configure sensors with touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  // Save to history for undo
  const saveToHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-9), JSON.parse(JSON.stringify(sections))])
  }, [sections])

  // Undo last move
  const handleUndo = useCallback(() => {
    if (history.length > 0) {
      const previousState = history[history.length - 1]
      setHistory(prev => prev.slice(0, -1))
      onSectionsChange(previousState)
    }
  }, [history, onSectionsChange])

  // Get active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId) return null

    const idStr = String(activeId)
    
    if (idStr.startsWith('placeholder-')) {
      const placeholderId = idStr.replace('placeholder-', '')
      return {
        type: 'placeholder' as const,
        placeholder: placeholders.find(p => p.id === placeholderId),
      }
    }
    
    if (idStr.startsWith('section-')) {
      const sectionId = idStr.replace('section-', '')
      return {
        type: 'section' as const,
        section: sections.find(s => s.id === sectionId),
      }
    }

    return null
  }, [activeId, placeholders, sections])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id)
    
    const data = active.data.current as DragData | undefined
    setActiveType(data?.type || null)
    saveToHistory()
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current as DragData | undefined
    const overData = over.data.current as DragData | undefined

    if (!activeData || activeData.type !== 'placeholder') return

    const activeSectionId = activeData.sectionId
    let overSectionId: string | undefined

    // Check if dropping on a placeholder
    if (overData?.type === 'placeholder') {
      overSectionId = overData.sectionId
    } 
    // Check if dropping on a section (including section header or empty area)
    else if (overData?.type === 'section') {
      overSectionId = overData.sectionId
    }
    // Also check if the over.id itself is a section id or section drop zone
    else {
      const overId = String(over.id)
      if (overId.startsWith('section-drop-')) {
        // This is the droppable empty section zone
        overSectionId = overId.replace('section-drop-', '')
      } else if (overId.startsWith('section-')) {
        overSectionId = overId.replace('section-', '')
      }
    }



    if (!activeSectionId || !overSectionId || activeSectionId === overSectionId) return

    // Move placeholder to new section
    const placeholderId = activeData.placeholderId
    if (!placeholderId) return

    // Update the active data's sectionId so subsequent drag-over events work correctly
    if (active.data.current) {
      (active.data.current as DragData).sectionId = overSectionId
    }

    onSectionsChange(
      movePlaceholder(sections, placeholderId, activeSectionId, overSectionId)
    )
    onAutoGroupedChange(false)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setActiveType(null)

    if (!over) return

    const activeData = active.data.current as DragData | undefined
    const overData = over.data.current as DragData | undefined

    if (!activeData) return

    // Handle section reordering
    if (activeData.type === 'section' && overData?.type === 'section') {
      const activeIndex = sections.findIndex(s => s.id === activeData.sectionId)
      const overIndex = sections.findIndex(s => s.id === overData.sectionId)

      if (activeIndex !== overIndex) {
        const newSections = arrayMove(sections, activeIndex, overIndex).map((s, i) => ({
          ...s,
          order: i,
        }))
        onSectionsChange(newSections)
        onAutoGroupedChange(false)
      }
      return
    }

    // Handle placeholder reordering within same section
    if (activeData.type === 'placeholder' && overData?.type === 'placeholder') {
      if (activeData.sectionId === overData.sectionId) {
        const sectionIndex = sections.findIndex(s => s.id === activeData.sectionId)
        if (sectionIndex === -1) return

        const section = sections[sectionIndex]
        const activeIndex = section.placeholderIds.indexOf(activeData.placeholderId!)
        const overIndex = section.placeholderIds.indexOf(overData.placeholderId!)

        if (activeIndex !== overIndex) {
          const newPlaceholderIds = arrayMove(section.placeholderIds, activeIndex, overIndex)
          const newSections = [...sections]
          newSections[sectionIndex] = { ...section, placeholderIds: newPlaceholderIds }
          onSectionsChange(newSections)
          onAutoGroupedChange(false)
        }
      }
    }
  }

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
      saveToHistory()
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
      const otherSections = sections.filter(s => s.id !== sectionId)
      if (otherSections.length > 0) {
        setDeleteConfirm({ sectionId, moveTo: otherSections[0].id })
      }
    } else {
      saveToHistory()
      onSectionsChange(deleteSection(sections, sectionId))
      onAutoGroupedChange(false)
    }
  }

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      saveToHistory()
      onSectionsChange(deleteSection(sections, deleteConfirm.sectionId, deleteConfirm.moveTo))
      onAutoGroupedChange(false)
      setDeleteConfirm(null)
    }
  }

  const handleResetToAuto = () => {
    saveToHistory()
    const newSections = autoGroupPlaceholders(placeholders)
    onSectionsChange(newSections)
    onAutoGroupedChange(true)
  }

  const sectionIds = filteredSections.map(s => `section-${s.id}`)

  return (
    <div className="space-y-4" ref={containerRef}>
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
          {history.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleUndo}>
              <Undo2 className="mr-2 h-4 w-4" />
              Undo
            </Button>
          )}
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

      {/* Sections with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {filteredSections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                placeholders={placeholders}
                formData={formData}
                onFormDataChange={onFormDataChange}
                onWidthChange={onPlaceholderWidthChange}
                onToggleSection={handleToggleSection}
                onEditSection={handleStartEditSection}
                onDeleteSection={handleDeleteSection}
                editingSectionId={editingSectionId}
                editingSectionName={editingSectionName}
                setEditingSectionName={setEditingSectionName}
                onSaveEditSection={handleSaveEditSection}
                onCancelEditSection={() => setEditingSectionId(null)}
                activePlaceholderId={activeType === 'placeholder' && activeItem?.type === 'placeholder' 
                  ? activeItem.placeholder?.id 
                  : null}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null} modifiers={[restrictToWindowEdges]}>
          {activeItem?.type === 'placeholder' && activeItem.placeholder && (
            <FieldDragOverlay placeholder={activeItem.placeholder} formData={formData} />
          )}
          {activeItem?.type === 'section' && activeItem.section && (
            <SectionDragOverlay 
              section={activeItem.section} 
              placeholders={placeholders} 
              formData={formData} 
            />
          )}
        </DragOverlay>
      </DndContext>

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
