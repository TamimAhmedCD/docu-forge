'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  DragMoveEvent,
  UniqueIdentifier,
  MeasuringStrategy,
  useDroppable,
  CollisionDetection,
  type DropAnimation,
  defaultDropAnimationSideEffects,
  useDndMonitor,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
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
  Group,
  Ungroup,
  CheckSquare,
  Square,
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
import { Placeholder, FormSection, FormData as FormDataType, FieldWidth, FieldGroup } from '@/types'
import { cn } from '@/lib/utils'
import {
  getSectionProgress,
  toggleSectionExpanded,
  addSection,
  renameSection,
  deleteSection,
  movePlaceholder,
  createGroup,
  ungroupFields,
  toggleGroupExpanded,
  renameGroup,
  moveGroup,
  reorderSectionItems,
  getAllPlaceholderIdsInSection,
  addPlaceholderToSection,
  removePlaceholderFromSection,
} from '@/lib/section-grouping'
import {
  detectFieldWidth,
  getFieldWidthClasses,
  WIDTH_OPTIONS,
} from '@/lib/field-width'
import { useFormNavigation, formInputClass } from '@/hooks/use-form-navigation'

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

// Smooth drop animation configuration with spring physics
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
  duration: 300,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
}

// Spring animation configurations for smooth motion
const springTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
}

const smoothSpringTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
  mass: 1,
}

// Animated insertion line component
function InsertionIndicator({ 
  isVisible, 
  orientation = 'horizontal' 
}: { 
  isVisible: boolean
  orientation?: 'horizontal' | 'vertical'
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scaleX: orientation === 'horizontal' ? 0 : 1, scaleY: orientation === 'vertical' ? 0 : 1 }}
          animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleX: orientation === 'horizontal' ? 0 : 1, scaleY: orientation === 'vertical' ? 0 : 1 }}
          transition={springTransition}
          className={cn(
            "bg-primary rounded-full",
            orientation === 'horizontal' 
              ? "h-0.5 w-full my-1" 
              : "w-0.5 h-full mx-1"
          )}
          style={{
            boxShadow: '0 0 8px var(--primary), 0 0 16px var(--primary)',
          }}
        />
      )}
    </AnimatePresence>
  )
}

// Spacing preview during drag
function SpacingPreview({ height }: { height: number }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height, opacity: 0.5 }}
      exit={{ height: 0, opacity: 0 }}
      transition={springTransition}
      className="bg-primary/10 border-2 border-dashed border-primary/30 rounded-lg"
    />
  )
}

// Types for drag items
type DragItemType = 'placeholder' | 'section' | 'group'
interface DragData {
  type: DragItemType
  sectionId?: string
  placeholderId?: string
  groupId?: string
}

// Droppable Section Area - wraps section content to enable cross-section drops
function DroppableSectionArea({ 
  sectionId, 
  children, 
  isEmpty,
  collapsed
}: { 
  sectionId: string
  children?: React.ReactNode
  isEmpty?: boolean
  collapsed?: boolean
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `section-drop-${sectionId}`,
    data: {
      type: 'section' as DragItemType,
      sectionId,
    },
  })

  const isReceivingDrop = isOver && active?.data?.current?.sectionId !== sectionId

  // Collapsed sections show a minimal drop indicator
  if (collapsed) {
    return (
      <motion.div 
        ref={setNodeRef}
        initial={false}
        animate={{
          height: isReceivingDrop ? 48 : 8,
          backgroundColor: isReceivingDrop ? 'hsl(var(--primary) / 0.15)' : 'transparent',
        }}
        transition={springTransition}
        className={cn(
          "mx-4 mb-2 rounded-lg border-2 border-dashed transition-colors",
          isReceivingDrop ? "border-primary" : "border-transparent"
        )}
      >
        <AnimatePresence>
          {isReceivingDrop && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center h-full text-xs text-primary font-medium"
            >
              Drop here to add
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  if (isEmpty) {
    return (
      <motion.div 
        ref={setNodeRef}
        initial={false}
        animate={{
          scale: isReceivingDrop ? 1.02 : 1,
          borderColor: isReceivingDrop ? 'hsl(var(--primary))' : 'hsl(var(--border))',
        }}
        transition={springTransition}
        className={cn(
          "text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg",
          isReceivingDrop && "bg-primary/10"
        )}
      >
        <motion.div
          animate={{ scale: isReceivingDrop ? 1.05 : 1 }}
          transition={springTransition}
        >
          <p className={isReceivingDrop ? "text-primary font-medium" : ""}>
            {isReceivingDrop ? "Release to drop here" : "No fields in this section"}
          </p>
          <p className="text-sm">Drag fields here to add them</p>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      ref={setNodeRef}
      initial={false}
      animate={{
        boxShadow: isReceivingDrop 
          ? '0 0 0 2px hsl(var(--primary) / 0.5), inset 0 0 20px hsl(var(--primary) / 0.05)' 
          : '0 0 0 0 transparent',
      }}
      transition={springTransition}
      className={cn(
        "min-h-[60px] rounded-lg transition-colors",
        isReceivingDrop && "bg-primary/5"
      )}
    >
      {children}
    </motion.div>
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
  isSelectionMode,
  isSelected,
  onToggleSelection,
  isOverlay,
  showInsertBefore,
}: {
  placeholder: Placeholder
  sectionId: string
  formData: FormDataType
  onFormDataChange: (id: string, value: string | number | Date) => void
  onWidthChange?: (id: string, width: FieldWidth) => void
  isDragging?: boolean
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelection?: (id: string) => void
  isOverlay?: boolean
  showInsertBefore?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
    isOver,
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
    transition: transition || 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
  }

  const value = formData[placeholder.id]
  const isFilled = value !== undefined && value !== null && value !== ''
  const fieldWidth = detectFieldWidth(placeholder)

  // Dragging placeholder - shows where item was
  if (isSortableDragging || isDragging) {
    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ 
          scale: 0.97, 
          opacity: 0.4,
        }}
        transition={springTransition}
        className={cn(
          'rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 h-16 relative overflow-hidden',
          getFieldWidthClasses(fieldWidth)
        )}
      >
        {/* Animated shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    )
  }

  return (
    <>
      {/* Insertion indicator */}
      <InsertionIndicator isVisible={!!showInsertBefore} />
      
      <motion.div
        ref={setNodeRef}
        style={style}
        layout
        layoutId={isOverlay ? undefined : `field-${placeholder.id}`}
        initial={false}
        animate={{
          scale: isOver && !isSortableDragging ? 1.02 : 1,
          y: 0,
        }}
        transition={smoothSpringTransition}
        className={cn(
          'group relative rounded-lg border border-border bg-card p-3 transition-colors hover:border-muted-foreground/30',
          isFilled && 'border-primary/30 bg-primary/5',
          isSelectionMode && isSelected && 'ring-2 ring-primary border-primary',
          isOver && !isSortableDragging && 'border-primary/50 shadow-lg shadow-primary/10',
          getFieldWidthClasses(fieldWidth)
        )}
      >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <button
          onClick={() => onToggleSelection?.(placeholder.id)}
          className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors z-10"
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      )}
      
      {/* Compact Header with Drag Handle and Width Selector */}
      <div className="flex items-center gap-2 mb-2">
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-muted transition-colors touch-none",
            isSelectionMode && "opacity-50 pointer-events-none"
          )}
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
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
          name={placeholder.id}
          value={(value as string) || ''}
          onChange={(e) => onFormDataChange(placeholder.id, e.target.value)}
          placeholder={`Enter ${placeholder.label.toLowerCase()}`}
          rows={2}
          className={cn("resize-none text-sm min-h-[60px]", formInputClass)}
        />
      ) : placeholder.type === 'select' ? (
        <Select
          value={(value as string) || ''}
          onValueChange={(v) => onFormDataChange(placeholder.id, v)}
        >
          <SelectTrigger className={cn("h-9 text-sm", formInputClass)}>
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
          name={placeholder.id}
          type={
            placeholder.type === 'number' ? 'number' :
            placeholder.type === 'date' ? 'date' :
            placeholder.type === 'email' ? 'email' : 'text'
          }
          value={(value as string) || ''}
          onChange={(e) => onFormDataChange(placeholder.id, e.target.value)}
          placeholder={`Enter ${placeholder.label.toLowerCase()}`}
          className={cn("h-9 text-sm", formInputClass)}
        />
      )}
    </motion.div>
  )
}

// Sortable Group Component - renders a group of fields as a single draggable unit
function SortableGroup({
  group,
  sectionId,
  placeholders,
  formData,
  onFormDataChange,
  onWidthChange,
  onToggleGroup,
  onUngroupFields,
  onRenameGroup,
  isDragging: externalIsDragging,
  isSelectionMode,
  selectedFields,
  onToggleFieldSelection,
}: {
  group: FieldGroup
  sectionId: string
  placeholders: Placeholder[]
  formData: FormDataType
  onFormDataChange: (id: string, value: string | number | Date) => void
  onWidthChange?: (id: string, width: FieldWidth) => void
  onToggleGroup: (groupId: string) => void
  onUngroupFields: (groupId: string) => void
  onRenameGroup: (groupId: string, newName: string) => void
  isDragging?: boolean
  isSelectionMode?: boolean
  selectedFields?: Set<string>
  onToggleFieldSelection?: (id: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(group.name)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `group-${group.id}`,
    data: {
      type: 'group' as DragItemType,
      sectionId,
      groupId: group.id,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  }

  const groupPlaceholders = group.placeholderIds
    .map(id => placeholders.find(p => p.id === id))
    .filter(Boolean) as Placeholder[]

  const filledCount = groupPlaceholders.filter(p => {
    const value = formData[p.id]
    return value !== undefined && value !== null && value !== ''
  }).length

  if (isSortableDragging || externalIsDragging) {
    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ scale: 0.98, opacity: 0.6 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'col-span-6 rounded-lg border-2 border-dashed border-primary/50 bg-primary/10 h-20'
        )}
      />
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'col-span-6 rounded-lg border-2 transition-colors',
        group.color || 'bg-muted/30 border-border'
      )}
    >
      {/* Group Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/50">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-muted transition-colors touch-none"
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <button
          onClick={() => onToggleGroup(group.id)}
          className="p-0.5 hover:bg-muted rounded transition-colors"
        >
          {group.isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-7 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onRenameGroup(group.id, editName)
                  setIsEditing(false)
                }
                if (e.key === 'Escape') {
                  setEditName(group.name)
                  setIsEditing(false)
                }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => {
                onRenameGroup(group.id, editName)
                setIsEditing(false)
              }}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => {
                setEditName(group.name)
                setIsEditing(false)
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 flex items-center gap-2">
              <Group className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{group.name}</span>
              <Badge variant="secondary" className="text-xs">
                {filledCount}/{groupPlaceholders.length}
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onUngroupFields(group.id)}>
                  <Ungroup className="mr-2 h-4 w-4" />
                  Ungroup
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      
      {/* Group Content */}
      <AnimatePresence>
        {group.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-3 grid grid-cols-6 gap-3">
              {groupPlaceholders.map((placeholder) => (
                <GroupField
                  key={placeholder.id}
                  placeholder={placeholder}
                  formData={formData}
                  onFormDataChange={onFormDataChange}
                  onWidthChange={onWidthChange}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedFields?.has(placeholder.id)}
                  onToggleSelection={onToggleFieldSelection}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Field inside a group (not individually draggable)
function GroupField({
  placeholder,
  formData,
  onFormDataChange,
  onWidthChange,
  isSelectionMode,
  isSelected,
  onToggleSelection,
}: {
  placeholder: Placeholder
  formData: FormDataType
  onFormDataChange: (id: string, value: string | number | Date) => void
  onWidthChange?: (id: string, width: FieldWidth) => void
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelection?: (id: string) => void
}) {
  const value = formData[placeholder.id]
  const isFilled = value !== undefined && value !== null && value !== ''
  const fieldWidth = detectFieldWidth(placeholder)

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border bg-card p-3 transition-all hover:border-muted-foreground/30',
        isFilled && 'border-primary/30 bg-primary/5',
        isSelectionMode && isSelected && 'ring-2 ring-primary border-primary',
        getFieldWidthClasses(fieldWidth)
      )}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <button
          onClick={() => onToggleSelection?.(placeholder.id)}
          className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors z-10"
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      )}
      
      {/* Field Header */}
      <div className="flex items-center gap-2 mb-2">
        <Label htmlFor={placeholder.id} className="flex-1 text-sm font-medium truncate flex items-center gap-1.5">
          {placeholder.label}
          {placeholder.required && (
            <span className="text-destructive text-xs">*</span>
          )}
        </Label>
      </div>

      {/* Input */}
      {placeholder.type === 'textarea' ? (
        <Textarea
          id={placeholder.id}
          name={placeholder.id}
          value={(value as string) || ''}
          onChange={(e) => onFormDataChange(placeholder.id, e.target.value)}
          placeholder={`Enter ${placeholder.label.toLowerCase()}`}
          rows={2}
          className={cn("resize-none text-sm min-h-[60px]", formInputClass)}
        />
      ) : placeholder.type === 'select' ? (
        <Select
          value={(value as string) || ''}
          onValueChange={(v) => onFormDataChange(placeholder.id, v)}
        >
          <SelectTrigger className={cn("h-9 text-sm", formInputClass)}>
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
          name={placeholder.id}
          type={
            placeholder.type === 'number' ? 'number' :
            placeholder.type === 'date' ? 'date' :
            placeholder.type === 'email' ? 'email' : 'text'
          }
          value={(value as string) || ''}
          onChange={(e) => onFormDataChange(placeholder.id, e.target.value)}
          placeholder={`Enter ${placeholder.label.toLowerCase()}`}
          className={cn("h-9 text-sm", formInputClass)}
        />
      )}
    </div>
  )
}

// Sortable Unassigned Field Component - allows dragging and reordering unassigned fields
function SortableUnassignedField({
  placeholder,
  formData,
  onFormDataChange,
  isDragging,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  index,
  onReorder,
}: {
  placeholder: Placeholder
  formData: FormDataType
  onFormDataChange: (id: string, value: string | number | Date) => void
  isDragging?: boolean
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelection?: (id: string) => void
  index?: number
  onReorder?: (fromIndex: number, toIndex: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
    isOver,
  } = useSortable({
    id: `unassigned-${placeholder.id}`,
    data: {
      type: 'placeholder' as DragItemType,
      sectionId: 'unassigned',
      placeholderId: placeholder.id,
      index,
    },
  })

  // Apply transform for smooth reordering animation
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
  }

  const value = formData[placeholder.id]
  const isFilled = value !== undefined && value !== null && value !== ''

  if (isSortableDragging || isDragging) {
    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ scale: 0.97, opacity: 0.4 }}
        transition={springTransition}
        className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 h-24 relative overflow-hidden"
      >
        {/* Animated shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      layoutId={`unassigned-${placeholder.id}`}
      initial={false}
      animate={{
        scale: isOver && !isSortableDragging ? 1.02 : 1,
      }}
      transition={smoothSpringTransition}
      className={cn(
        'group relative rounded-md border bg-card p-3 transition-colors',
        isFilled ? 'border-primary/30 bg-primary/5' : 'border-border',
        isSelectionMode && isSelected && 'ring-2 ring-primary border-primary',
        isOver && !isSortableDragging && 'border-primary/50 shadow-md shadow-primary/10'
      )}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <button
          onClick={() => onToggleSelection?.(placeholder.id)}
          className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors z-10"
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      )}
      
      {/* Header with Drag Handle */}
      <div className="flex items-center gap-2 mb-1.5">
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-muted transition-colors touch-none",
            isSelectionMode && "opacity-50 pointer-events-none"
          )}
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Label htmlFor={`unassigned-${placeholder.id}`} className="text-sm font-medium flex-1 truncate">
          {placeholder.label}
          {placeholder.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      </div>

      {/* Input */}
      {placeholder.type === 'textarea' ? (
        <Textarea
          id={`unassigned-${placeholder.id}`}
          name={placeholder.id}
          value={(value as string) || ''}
          onChange={(e) => onFormDataChange(placeholder.id, e.target.value)}
          placeholder={`Enter ${placeholder.label.toLowerCase()}`}
          rows={2}
          className={cn("resize-none text-sm min-h-[60px]", formInputClass)}
          disabled={isSelectionMode}
        />
      ) : placeholder.type === 'select' ? (
        <Select
          value={(value as string) || ''}
          onValueChange={(v) => onFormDataChange(placeholder.id, v)}
          disabled={isSelectionMode}
        >
          <SelectTrigger className={cn("h-9 text-sm", formInputClass)}>
            <SelectValue placeholder="Select..." />
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
          id={`unassigned-${placeholder.id}`}
          name={placeholder.id}
          type={
            placeholder.type === 'number' ? 'number' :
            placeholder.type === 'date' ? 'date' :
            placeholder.type === 'email' ? 'email' : 'text'
          }
          value={(value as string) || ''}
          onChange={(e) => onFormDataChange(placeholder.id, e.target.value)}
          placeholder={`Enter ${placeholder.label.toLowerCase()}`}
          className={cn("h-9 text-sm", formInputClass)}
          disabled={isSelectionMode}
        />
  )}
  </motion.div>
  )
  }
  
// Droppable area for unassigned fields section
function DroppableUnassignedArea({ 
  children, 
  isEmpty
}: { 
  children?: React.ReactNode
  isEmpty?: boolean
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: 'section-drop-unassigned',
    data: {
      type: 'section' as DragItemType,
      sectionId: 'unassigned',
    },
  })

  // Check if something is being dragged from a section (not from unassigned)
  const isDraggingFromSection = active?.data?.current?.sectionId && 
    active.data.current.sectionId !== 'unassigned'

  const isReceivingDrop = isOver && isDraggingFromSection

  if (isEmpty) {
    return (
      <motion.div 
        ref={setNodeRef}
        initial={false}
        animate={{
          scale: isReceivingDrop ? 1.02 : 1,
          borderColor: isReceivingDrop ? 'hsl(var(--primary))' : 'hsl(var(--border))',
        }}
        transition={springTransition}
        className={cn(
          "text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg",
          isReceivingDrop && "bg-primary/10"
        )}
      >
        <motion.div
          animate={{ scale: isReceivingDrop ? 1.05 : 1 }}
          transition={springTransition}
        >
          <p className={isReceivingDrop ? "text-primary font-medium" : ""}>
            {isReceivingDrop ? "Release to unassign" : "No unassigned fields"}
          </p>
          <p className="text-sm">Drag fields here to unassign them</p>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      ref={setNodeRef}
      initial={false}
      animate={{
        boxShadow: isReceivingDrop 
          ? '0 0 0 2px hsl(var(--primary) / 0.5), inset 0 0 20px hsl(var(--primary) / 0.05)' 
          : '0 0 0 0 transparent',
      }}
      transition={springTransition}
      className={cn(
        "min-h-[60px] rounded-lg transition-colors",
        isReceivingDrop && "bg-primary/5"
      )}
    >
      {children}
    </motion.div>
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
  activeGroupId,
  onToggleGroup,
  onUngroupFields,
  onRenameGroup,
  isSelectionMode,
  selectedFields,
  onToggleFieldSelection,
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
  activeGroupId?: string | null
  onToggleGroup: (sectionId: string, groupId: string) => void
  onUngroupFields: (sectionId: string, groupId: string) => void
  onRenameGroup: (sectionId: string, groupId: string, newName: string) => void
  isSelectionMode?: boolean
  selectedFields?: Set<string>
  onToggleFieldSelection?: (id: string) => void
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
    transition: transition || 'transform 250ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  }

  const progress = getSectionProgress(section, placeholders, formData)
  
  // Get items for rendering (both placeholders and group references)
  const sectionItems = section.placeholderIds.map(itemId => {
    if (itemId.startsWith('group-')) {
      const groupId = itemId.replace('group-', '')
      const group = section.groups?.find(g => g.id === groupId)
      return group ? { type: 'group' as const, group } : null
    } else {
      const placeholder = placeholders.find(p => p.id === itemId)
      return placeholder ? { type: 'placeholder' as const, placeholder } : null
    }
  }).filter(Boolean) as ({ type: 'group'; group: FieldGroup } | { type: 'placeholder'; placeholder: Placeholder })[]

  // IDs for SortableContext - includes both placeholders and groups
  const sortableIds = section.placeholderIds.map(id => 
    id.startsWith('group-') ? id : `placeholder-${id}`
  )

  if (isDragging && !isDragOverlay) {
    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ scale: 0.98, opacity: 0.6 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 h-20"
      />
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
        {section.isExpanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 min-h-[80px]">
              <DroppableSectionArea sectionId={section.id} isEmpty={sectionItems.length === 0}>
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-6 gap-3">
                    {sectionItems.map((item) => {
                      if (item.type === 'group') {
                        return (
                          <SortableGroup
                            key={item.group.id}
                            group={item.group}
                            sectionId={section.id}
                            placeholders={placeholders}
                            formData={formData}
                            onFormDataChange={onFormDataChange}
                            onWidthChange={onWidthChange}
                            onToggleGroup={(groupId) => onToggleGroup(section.id, groupId)}
                            onUngroupFields={(groupId) => onUngroupFields(section.id, groupId)}
                            onRenameGroup={(groupId, newName) => onRenameGroup(section.id, groupId, newName)}
                            isDragging={activeGroupId === item.group.id}
                            isSelectionMode={isSelectionMode}
                            selectedFields={selectedFields}
                            onToggleFieldSelection={onToggleFieldSelection}
                          />
                        )
                      }
                      return (
                        <SortableField
                          key={item.placeholder.id}
                          placeholder={item.placeholder}
                          sectionId={section.id}
                          formData={formData}
                          onFormDataChange={onFormDataChange}
                          onWidthChange={onWidthChange}
                          isDragging={activePlaceholderId === item.placeholder.id}
                          isSelectionMode={isSelectionMode}
                          isSelected={selectedFields?.has(item.placeholder.id)}
                          onToggleSelection={onToggleFieldSelection}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DroppableSectionArea>
            </div>
          </motion.div>
        ) : (
          // Collapsed section still needs a droppable area
          <DroppableSectionArea sectionId={section.id} collapsed={true} />
        )}
  </AnimatePresence>
  </motion.div>
  )
  }
  
// Field Drag Overlay Component - professional floating preview
function FieldDragOverlay({ placeholder, formData }: { placeholder: Placeholder; formData: FormDataType }) {
  const value = formData[placeholder.id]
  const isFilled = value !== undefined && value !== null && value !== ''
  const fieldWidth = detectFieldWidth(placeholder)

  return (
    <motion.div
      initial={{ scale: 1, rotate: 0, opacity: 0.9 }}
      animate={{ 
        scale: 1.03, 
        rotate: 1.5,
        opacity: 1,
      }}
      transition={smoothSpringTransition}
      className={cn(
        'rounded-lg border-2 border-primary bg-card p-4 w-full max-w-sm cursor-grabbing relative overflow-hidden',
        isFilled && 'border-primary bg-primary/5'
      )}
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px hsl(var(--primary) / 0.2)',
      }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      
      <div className="flex items-center gap-3 relative">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          <GripVertical className="h-5 w-5 text-primary" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <Label className="flex items-center gap-2 text-foreground font-medium">
            {placeholder.label}
            {placeholder.required && (
              <span className="text-destructive text-sm">*</span>
            )}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {isFilled ? String(value).slice(0, 30) + (String(value).length > 30 ? '...' : '') : 'Not filled'}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
          {placeholder.type}
        </Badge>
      </div>
    </motion.div>
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
    <motion.div
      initial={{ scale: 1, rotate: 0, opacity: 0.9 }}
      animate={{ 
        scale: 1.02, 
        rotate: 0.75,
        opacity: 1,
      }}
      transition={smoothSpringTransition}
      className="rounded-xl border-2 border-primary bg-card overflow-hidden w-full max-w-xl cursor-grabbing"
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px hsl(var(--primary) / 0.2)',
      }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      
      <div className="flex items-center gap-3 p-4 relative">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          <GripVertical className="h-5 w-5 text-primary" />
        </motion.div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{section.name}</h3>
          <p className="text-xs text-muted-foreground">
            {progress.filled}/{progress.total} fields completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={progress.percentage} className="w-16 h-1.5" />
          <span className="text-xs text-muted-foreground font-medium">{progress.percentage}%</span>
        </div>
      </div>
    </motion.div>
  )
}

// Group Drag Overlay Component
function GroupDragOverlay({ group, placeholders, formData }: { 
  group: FieldGroup
  placeholders: Placeholder[]
  formData: FormDataType 
}) {
  const groupPlaceholders = group.placeholderIds
    .map(id => placeholders.find(p => p.id === id))
    .filter(Boolean) as Placeholder[]
  
  const filledCount = groupPlaceholders.filter(p => {
    const value = formData[p.id]
    return value !== undefined && value !== null && value !== ''
  }).length

  return (
    <motion.div 
      initial={{ scale: 1, rotate: 0, opacity: 0.9 }}
      animate={{ 
        scale: 1.03, 
        rotate: 1,
        opacity: 1,
      }}
      transition={smoothSpringTransition}
      className={cn(
        "rounded-lg border-2 border-primary bg-card w-full max-w-md p-3 cursor-grabbing relative overflow-hidden",
        group.color
      )}
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px hsl(var(--primary) / 0.2)',
      }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      
      <div className="flex items-center gap-2 relative">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          <GripVertical className="h-4 w-4 text-primary" />
        </motion.div>
        <Group className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{group.name}</span>
        <Badge variant="secondary" className="text-xs ml-auto">
          {filledCount}/{groupPlaceholders.length}
        </Badge>
      </div>
    </motion.div>
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
  const formContainerRef = useRef<HTMLDivElement>(null)
  
  // Form keyboard navigation
  const { focusFirstInput, getCurrentFieldIndex } = useFormNavigation(formContainerRef)
  
  // Selection mode state for grouping
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  
  // Track custom order for unassigned fields (array of placeholder IDs)
  const [unassignedFieldOrder, setUnassignedFieldOrder] = useState<string[]>([])

  // Configure sensors with touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Helper to calculate overlap ratio between two rectangles
  type RectLike = { left: number; right: number; top: number; bottom: number; width?: number; height?: number }
  const getOverlapRatio = useCallback((
    rect1: RectLike | null, 
    rect2: RectLike | null
  ): number => {
    if (!rect1 || !rect2) return 0
    const xOverlap = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left))
    const yOverlap = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top))
    const overlapArea = xOverlap * yOverlap
    const rect1Width = rect1.width ?? (rect1.right - rect1.left)
    const rect1Height = rect1.height ?? (rect1.bottom - rect1.top)
    const rect1Area = rect1Width * rect1Height
    return rect1Area > 0 ? overlapArea / rect1Area : 0
  }, [])

  // Simple and reliable collision detection
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    // Get all intersecting rectangles
    const collisions = rectIntersection(args)
    
    if (collisions.length === 0) {
      return []
    }

    // Sort collisions by overlap ratio (highest first)
    const sortedCollisions = [...collisions].sort((a, b) => {
      const rectA = a.data?.droppableContainer?.rect?.current as RectLike | undefined
      const rectB = b.data?.droppableContainer?.rect?.current as RectLike | undefined
      const collisionRect = args.collisionRect as RectLike
      const ratioA = rectA ? getOverlapRatio(collisionRect, rectA) : 0
      const ratioB = rectB ? getOverlapRatio(collisionRect, rectB) : 0
      return ratioB - ratioA
    })

    // Find the best match with priority: placeholder/unassigned > group > section-drop > section
    const placeholder = sortedCollisions.find(c => 
      String(c.id).startsWith('placeholder-') || String(c.id).startsWith('unassigned-')
    )
    if (placeholder) return [placeholder]
    
    const group = sortedCollisions.find(c => String(c.id).startsWith('group-'))
    if (group) return [group]
    
    const sectionDrop = sortedCollisions.find(c => String(c.id).startsWith('section-drop-'))
    if (sectionDrop) return [sectionDrop]
    
    const section = sortedCollisions.find(c => 
      String(c.id).startsWith('section-') && !String(c.id).startsWith('section-drop-')
    )
    if (section) return [section]

    return [sortedCollisions[0]]
  }, [getOverlapRatio])

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

  // Calculate unassigned placeholders (not in any section)
  const unassignedPlaceholders = useMemo(() => {
    // Collect all placeholder IDs that are in sections (including in groups)
    const assignedIds = new Set<string>()
    for (const section of sections) {
      for (const id of section.placeholderIds) {
        if (id.startsWith('group-')) {
          const groupId = id.replace('group-', '')
          const group = section.groups?.find(g => g.id === groupId)
          if (group) {
            group.placeholderIds.forEach(pid => assignedIds.add(pid))
          }
        } else {
          assignedIds.add(id)
        }
      }
    }
    // Get all unassigned placeholder IDs
    const unassignedIds = placeholders.filter(p => !assignedIds.has(p.id)).map(p => p.id)
    
    // Sort by custom order if we have one, otherwise use natural order
    const orderedIds = unassignedFieldOrder.length > 0
      ? [...unassignedIds].sort((a, b) => {
          const indexA = unassignedFieldOrder.indexOf(a)
          const indexB = unassignedFieldOrder.indexOf(b)
          // Items not in the order array go to the end
          if (indexA === -1 && indexB === -1) return 0
          if (indexA === -1) return 1
          if (indexB === -1) return -1
          return indexA - indexB
        })
      : unassignedIds
    
    // Return placeholders in the correct order
    return orderedIds
      .map(id => placeholders.find(p => p.id === id))
      .filter(Boolean) as Placeholder[]
  }, [sections, placeholders, unassignedFieldOrder])
  
  // Sync unassigned field order when placeholders change
  useEffect(() => {
    const currentUnassignedIds = unassignedPlaceholders.map(p => p.id)
    // Only update if we have no order yet or if the IDs have changed
    if (unassignedFieldOrder.length === 0 && currentUnassignedIds.length > 0) {
      setUnassignedFieldOrder(currentUnassignedIds)
    } else {
      // Clean up any IDs that are no longer unassigned
      const validOrder = unassignedFieldOrder.filter(id => currentUnassignedIds.includes(id))
      // Add any new unassigned IDs to the end
      const newIds = currentUnassignedIds.filter(id => !unassignedFieldOrder.includes(id))
      if (newIds.length > 0 || validOrder.length !== unassignedFieldOrder.length) {
        setUnassignedFieldOrder([...validOrder, ...newIds])
      }
    }
  }, [placeholders, sections]) // Don't include unassignedFieldOrder to avoid infinite loop

  // Filter unassigned placeholders by search query
  const filteredUnassignedPlaceholders = useMemo(() => {
    if (!searchQuery) return unassignedPlaceholders
    const query = searchQuery.toLowerCase()
    return unassignedPlaceholders.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.label.toLowerCase().includes(query)
    )
  }, [unassignedPlaceholders, searchQuery])

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
    
    // Handle unassigned fields - they also show as placeholder type
    if (idStr.startsWith('unassigned-')) {
      const placeholderId = idStr.replace('unassigned-', '')
      return {
        type: 'placeholder' as const,
        placeholder: placeholders.find(p => p.id === placeholderId),
      }
    }
    
    if (idStr.startsWith('group-')) {
      const groupId = idStr.replace('group-', '')
      // Find the group in sections
      for (const section of sections) {
        const group = section.groups?.find(g => g.id === groupId)
        if (group) {
          return {
            type: 'group' as const,
            group,
            sectionId: section.id,
          }
        }
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

    if (!activeData) return

    // Determine target section
    let targetSectionId: string | undefined
    const overId = String(over.id)

    if (overData?.type === 'placeholder' && overData.sectionId) {
      targetSectionId = overData.sectionId
    } else if (overData?.type === 'group' && overData.sectionId) {
      targetSectionId = overData.sectionId
    } else if (overId.startsWith('section-drop-')) {
      targetSectionId = overId.replace('section-drop-', '')
    } else if (overData?.type === 'section' && overData.sectionId) {
      targetSectionId = overData.sectionId
    } else if (overId.startsWith('section-') && !overId.startsWith('section-drop-')) {
      targetSectionId = overId.replace('section-', '')
    } else if (overId.startsWith('unassigned-')) {
      targetSectionId = 'unassigned'
    }

    // Handle placeholder dragging
    if (activeData.type === 'placeholder') {
      const activeSectionId = activeData.sectionId
      const placeholderId = activeData.placeholderId
      if (!activeSectionId || !placeholderId) return

      // Move to new section if different
      if (targetSectionId && targetSectionId !== activeSectionId) {
        // Update active data for subsequent events
        if (active.data.current) {
          (active.data.current as DragData).sectionId = targetSectionId
        }
        
        // Handle moving from unassigned to a section
        if (activeSectionId === 'unassigned' && targetSectionId !== 'unassigned') {
          onSectionsChange(addPlaceholderToSection(sections, placeholderId, targetSectionId))
          onAutoGroupedChange(false)
        }
        // Handle moving from a section to unassigned
        else if (activeSectionId !== 'unassigned' && targetSectionId === 'unassigned') {
          onSectionsChange(removePlaceholderFromSection(sections, placeholderId, activeSectionId))
          onAutoGroupedChange(false)
        }
        // Handle moving between sections (neither is unassigned)
        else if (activeSectionId !== 'unassigned' && targetSectionId !== 'unassigned') {
          onSectionsChange(movePlaceholder(sections, placeholderId, activeSectionId, targetSectionId))
          onAutoGroupedChange(false)
        }
      }
    }

    // Handle group dragging
    if (activeData.type === 'group') {
      const activeSectionId = activeData.sectionId
      const groupId = activeData.groupId
      if (!activeSectionId || !groupId) return

      // Move group to new section if different (groups cannot be unassigned)
      if (targetSectionId && targetSectionId !== activeSectionId && targetSectionId !== 'unassigned') {
        // Update active data for subsequent events
        if (active.data.current) {
          (active.data.current as DragData).sectionId = targetSectionId
        }
        onSectionsChange(moveGroup(sections, groupId, activeSectionId, targetSectionId))
        onAutoGroupedChange(false)
      }
    }
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

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
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
    if (activeData.type === 'placeholder') {
      const activePlaceholderId = activeData.placeholderId
      if (!activePlaceholderId) return
      
      // Handle dragging within unassigned area
      if (activeData.sectionId === 'unassigned') {
        const overId = String(over.id)
        
        // Check if we're dropping onto another unassigned field (reordering)
        if (overId.startsWith('unassigned-') && overData?.sectionId === 'unassigned') {
          const overPlaceholderId = overId.replace('unassigned-', '')
          if (overPlaceholderId !== activePlaceholderId) {
            // Reorder within unassigned area
            const currentOrder = unassignedPlaceholders.map(p => p.id)
            const activeIndex = currentOrder.indexOf(activePlaceholderId)
            const overIndex = currentOrder.indexOf(overPlaceholderId)
            
            if (activeIndex !== -1 && overIndex !== -1) {
              const newOrder = arrayMove(currentOrder, activeIndex, overIndex)
              setUnassignedFieldOrder(newOrder)
            }
          }
          return
        }
        
        // Check if we're dropping onto a section
        let targetSectionId: string | undefined
        
        if (overData?.sectionId && overData.sectionId !== 'unassigned') {
          targetSectionId = overData.sectionId
        } else if (overId.startsWith('section-drop-')) {
          targetSectionId = overId.replace('section-drop-', '')
        } else if (overId.startsWith('section-') && !overId.startsWith('section-drop-')) {
          targetSectionId = overId.replace('section-', '')
        }
        
        // If dropping on a section, add the placeholder to that section
        if (targetSectionId && targetSectionId !== 'unassigned') {
          // Find target index if dropping on a specific placeholder
          let targetIndex: number | undefined
          if (overData?.type === 'placeholder' && overData.placeholderId) {
            const targetSection = sections.find(s => s.id === targetSectionId)
            if (targetSection) {
              targetIndex = targetSection.placeholderIds.indexOf(overData.placeholderId)
            }
          }
          
          // Remove from unassigned order when moving to a section
          setUnassignedFieldOrder(prev => prev.filter(id => id !== activePlaceholderId))
          onSectionsChange(addPlaceholderToSection(sections, activePlaceholderId, targetSectionId, targetIndex))
          onAutoGroupedChange(false)
        }
        return
      }
      
      const sectionIndex = sections.findIndex(s => s.id === activeData.sectionId)
      if (sectionIndex === -1) return
      const section = sections[sectionIndex]

      // Determine over index based on what we're over
      let overIndex = -1
      const overId = String(over.id)
      
      if (overData?.type === 'placeholder' && overData.placeholderId) {
        overIndex = section.placeholderIds.indexOf(overData.placeholderId)
      } else if (overData?.type === 'group' && overData.groupId) {
        overIndex = section.placeholderIds.indexOf(`group-${overData.groupId}`)
      } else if (overId.startsWith('group-')) {
        overIndex = section.placeholderIds.indexOf(overId)
      }

      const activeIndex = section.placeholderIds.indexOf(activePlaceholderId)

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        const newPlaceholderIds = arrayMove(section.placeholderIds, activeIndex, overIndex)
        const newSections = [...sections]
        newSections[sectionIndex] = { ...section, placeholderIds: newPlaceholderIds }
        onSectionsChange(newSections)
        onAutoGroupedChange(false)
      }
    }

    // Handle group reordering within same section
    if (activeData.type === 'group') {
      const activeGroupId = activeData.groupId
      if (!activeGroupId) return

      const sectionIndex = sections.findIndex(s => s.id === activeData.sectionId)
      if (sectionIndex === -1) return
      const section = sections[sectionIndex]

      // Determine over index based on what we're over
      let overIndex = -1
      const overId = String(over.id)
      
      if (overData?.type === 'placeholder' && overData.placeholderId) {
        overIndex = section.placeholderIds.indexOf(overData.placeholderId)
      } else if (overData?.type === 'group' && overData.groupId) {
        overIndex = section.placeholderIds.indexOf(`group-${overData.groupId}`)
      } else if (overId.startsWith('group-')) {
        overIndex = section.placeholderIds.indexOf(overId)
      } else if (overId.startsWith('placeholder-')) {
        const placeholderId = overId.replace('placeholder-', '')
        overIndex = section.placeholderIds.indexOf(placeholderId)
      }

      const activeIndex = section.placeholderIds.indexOf(`group-${activeGroupId}`)

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        const newPlaceholderIds = arrayMove(section.placeholderIds, activeIndex, overIndex)
        const newSections = [...sections]
        newSections[sectionIndex] = { ...section, placeholderIds: newPlaceholderIds }
        onSectionsChange(newSections)
        onAutoGroupedChange(false)
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

  const handleResetToUngrouped = () => {
    saveToHistory()
    // Reset to empty sections - all placeholders become unassigned
    onSectionsChange([])
    onAutoGroupedChange(false)
  }

  // Handle toggling field selection
  const handleToggleFieldSelection = useCallback((fieldId: string) => {
    setSelectedFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId)
      } else {
        newSet.add(fieldId)
      }
      return newSet
    })
  }, [])

  // Find which section contains a selected field
  const findSectionForField = useCallback((fieldId: string): string | null => {
    for (const section of sections) {
      // Check direct placeholders
      if (section.placeholderIds.includes(fieldId)) {
        return section.id
      }
      // Check inside groups
      for (const group of section.groups || []) {
        if (group.placeholderIds.includes(fieldId)) {
          return section.id
        }
      }
    }
    return null
  }, [sections])

  // Handle creating a group from selected fields
  const handleCreateGroup = useCallback(() => {
    if (selectedFields.size < 2 || !newGroupName.trim()) return

    const selectedFieldIds = Array.from(selectedFields)
    
    // Find the section containing the first selected field
    const firstFieldId = selectedFieldIds[0]
    let sectionId = findSectionForField(firstFieldId)
    
    // Check if these are unassigned fields
    const unassignedFieldIds = selectedFieldIds.filter(id => 
      unassignedPlaceholders.some(p => p.id === id)
    )
    
    // If all selected fields are unassigned, create a new section for them
    if (unassignedFieldIds.length === selectedFieldIds.length) {
      saveToHistory()
      // Create new section with the group name and add all selected fields
      const newSectionName = `${newGroupName.trim()} Section`
      let updatedSections = addSection(sections, newSectionName)
      const newSection = updatedSections[updatedSections.length - 1]
      
      // Add all selected fields to the new section
      for (const fieldId of selectedFieldIds) {
        updatedSections = addPlaceholderToSection(updatedSections, fieldId, newSection.id)
      }
      
      // Now create the group within this new section
      updatedSections = createGroup(updatedSections, newSection.id, selectedFieldIds, newGroupName.trim())
      
      onSectionsChange(updatedSections)
      onAutoGroupedChange(false)
      
      // Reset state
      setSelectedFields(new Set())
      setIsSelectionMode(false)
      setShowGroupDialog(false)
      setNewGroupName('')
      return
    }
    
    if (!sectionId) return

    // Get all selected fields that are in this section (must be ungrouped)
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    // Only include fields that are direct children of the section (not in groups)
    const fieldsInSection = selectedFieldIds.filter(id => 
      section.placeholderIds.includes(id)
    )

    if (fieldsInSection.length < 2) {
      // Fields are spread across groups or sections - can't group
      return
    }

    saveToHistory()
    const updatedSections = createGroup(sections, sectionId, fieldsInSection, newGroupName.trim())
    onSectionsChange(updatedSections)
    onAutoGroupedChange(false)
    
    // Reset state
    setSelectedFields(new Set())
    setIsSelectionMode(false)
    setShowGroupDialog(false)
    setNewGroupName('')
  }, [selectedFields, newGroupName, sections, findSectionForField, saveToHistory, onSectionsChange, onAutoGroupedChange, unassignedPlaceholders])

  // Handle toggling group expanded state
  const handleToggleGroup = useCallback((sectionId: string, groupId: string) => {
    onSectionsChange(toggleGroupExpanded(sections, sectionId, groupId))
  }, [sections, onSectionsChange])

  // Handle ungrouping fields
  const handleUngroupFields = useCallback((sectionId: string, groupId: string) => {
    saveToHistory()
    onSectionsChange(ungroupFields(sections, sectionId, groupId))
    onAutoGroupedChange(false)
  }, [sections, saveToHistory, onSectionsChange, onAutoGroupedChange])

  // Handle renaming a group
  const handleRenameGroup = useCallback((sectionId: string, groupId: string, newName: string) => {
    onSectionsChange(renameGroup(sections, sectionId, groupId, newName))
    onAutoGroupedChange(false)
  }, [sections, onSectionsChange, onAutoGroupedChange])

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
              <DropdownMenuItem onClick={handleResetToUngrouped}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Ungrouped
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

      {/* Selection Mode Toolbar */}
      <div className="flex items-center gap-2">
        <Button
          variant={isSelectionMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setIsSelectionMode(!isSelectionMode)
            if (isSelectionMode) {
              setSelectedFields(new Set())
            }
          }}
        >
          {isSelectionMode ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Cancel Selection
            </>
          ) : (
            <>
              <CheckSquare className="mr-2 h-4 w-4" />
              Select Fields
            </>
          )}
        </Button>
        
        {isSelectionMode && (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedFields.size} selected
            </span>
            {selectedFields.size >= 2 && (
              <Button
                size="sm"
                onClick={() => setShowGroupDialog(true)}
              >
                <Group className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            )}
            {selectedFields.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFields(new Set())}
              >
                Clear
              </Button>
            )}
          </>
        )}
      </div>

      {/* Sections with DnD */}
      <div ref={formContainerRef}>
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        autoScroll={{
          enabled: true,
          threshold: { x: 0, y: 0.2 },
          acceleration: 10,
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
                activeGroupId={activeType === 'group' ? String(activeId).replace('group-', '') : null}
                onToggleGroup={handleToggleGroup}
                onUngroupFields={handleUngroupFields}
                onRenameGroup={handleRenameGroup}
                isSelectionMode={isSelectionMode}
                selectedFields={selectedFields}
                onToggleFieldSelection={handleToggleFieldSelection}
              />
            ))}
          </div>
        </SortableContext>

        {/* Unassigned Fields - shown when there are placeholders not in any section */}
        {filteredUnassignedPlaceholders.length > 0 && (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Unassigned Fields
                </span>
                <Badge variant="secondary" className="text-xs">
                  {filteredUnassignedPlaceholders.length}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Drag fields to a section or drag here to unassign
              </span>
            </div>
            <DroppableUnassignedArea>
              <SortableContext
                items={filteredUnassignedPlaceholders.map(p => `unassigned-${p.id}`)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredUnassignedPlaceholders.map((placeholder) => (
                    <SortableUnassignedField
                      key={placeholder.id}
                      placeholder={placeholder}
                      formData={formData}
                      onFormDataChange={onFormDataChange}
                      isDragging={activeType === 'placeholder' && activeItem?.type === 'placeholder' && activeItem.placeholder?.id === placeholder.id}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedFields.has(placeholder.id)}
                      onToggleSelection={handleToggleFieldSelection}
                    />
                  ))}
                </div>
              </SortableContext>
            </DroppableUnassignedArea>
          </div>
        )}

        {/* Empty Unassigned Drop Area - shown when there are sections but no unassigned fields */}
        {filteredUnassignedPlaceholders.length === 0 && sections.length > 0 && (
          <div className="mt-4">
            <DroppableUnassignedArea isEmpty>
              <div />
            </DroppableUnassignedArea>
          </div>
        )}

        <DragOverlay dropAnimation={dropAnimationConfig} modifiers={[restrictToWindowEdges]}>
          {activeItem?.type === 'placeholder' && activeItem.placeholder && (
            <FieldDragOverlay placeholder={activeItem.placeholder} formData={formData} />
          )}
          {activeItem?.type === 'group' && activeItem.group && (
            <GroupDragOverlay 
              group={activeItem.group} 
              placeholders={placeholders} 
              formData={formData} 
            />
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

      {/* Create Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={(open) => {
        setShowGroupDialog(open)
        if (!open) setNewGroupName('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Field Group</DialogTitle>
            <DialogDescription>
              Group {selectedFields.size} selected fields together. Groups can be moved as a single unit, collapsed/expanded, and ungrouped later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g., Contact Details, Address Info"
              className="mt-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newGroupName.trim()) {
                  handleCreateGroup()
                }
              }}
            />
            <div className="mt-4">
              <Label className="text-muted-foreground text-sm">Selected Fields:</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from(selectedFields).map(fieldId => {
                  const placeholder = placeholders.find(p => p.id === fieldId)
                  return placeholder ? (
                    <Badge key={fieldId} variant="secondary" className="text-xs">
                      {placeholder.label}
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowGroupDialog(false)
              setNewGroupName('')
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
              <Group className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
