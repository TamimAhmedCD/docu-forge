'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  value?: Date | string
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  id?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  id,
}: DatePickerProps) {
  // Convert string value to Date if needed
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    // Parse string date (handles ISO format from input type="date")
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? undefined : parsed
  }, [value])

  // Format date as "Day DD MM YY" (e.g., "Mon 13 05 26")
  const formatDisplayDate = (date: Date) => {
    const dayName = format(date, 'EEE') // Short day name (Mon, Tue, etc.)
    const day = format(date, 'dd')
    const month = format(date, 'MM')
    const year = format(date, 'yy')
    return `${dayName} ${day} ${month} ${year}`
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !dateValue && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? formatDisplayDate(dateValue) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={onChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
