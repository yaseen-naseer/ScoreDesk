'use client'

import * as React from 'react'
import { useController, Control, FieldValues, Path } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { FormField } from './form-base'
import { CalendarIcon, Check, ChevronsUpDown, Upload, X, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

// Base input props
interface BaseInputProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  label: string
  description?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

// Text Input Component
interface TextInputProps<T extends FieldValues> extends BaseInputProps<T> {
  placeholder?: string
  maxLength?: number
  type?: 'text' | 'email' | 'password' | 'url' | 'tel'
}

export function TextInput<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  placeholder,
  maxLength,
  type = 'text'
}: TextInputProps<T>) {
  const [showPassword, setShowPassword] = React.useState(false)
  const {
    field,
    fieldState: { error }
  } = useController({ name, control })

  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <FormField label={label} required={required} description={description} className={className}>
      <div className="relative">
        <Input
          {...field}
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
        />
        {type === 'password' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="sr-only">
              {showPassword ? 'Hide password' : 'Show password'}
            </span>
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </FormField>
  )
}

// Specialized input components
export function EmailInput<T extends FieldValues>(props: Omit<TextInputProps<T>, 'type'>) {
  return <TextInput {...props} type="email" />
}

export function PasswordInput<T extends FieldValues>(props: Omit<TextInputProps<T>, 'type'>) {
  return <TextInput {...props} type="password" />
}

export function UrlInput<T extends FieldValues>(props: Omit<TextInputProps<T>, 'type'>) {
  return <TextInput {...props} type="url" />
}

export function PhoneInput<T extends FieldValues>(props: Omit<TextInputProps<T>, 'type'>) {
  return <TextInput {...props} type="tel" />
}

// Number Input Component
interface NumberInputProps<T extends FieldValues> extends BaseInputProps<T> {
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

export function NumberInput<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  placeholder,
  min,
  max,
  step
}: NumberInputProps<T>) {
  const {
    field,
    fieldState: { error }
  } = useController({ name, control })

  return (
    <FormField label={label} required={required} description={description} className={className}>
      <Input
        {...field}
        type="number"
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
      />
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </FormField>
  )
}

// Textarea Component
interface TextAreaInputProps<T extends FieldValues> extends BaseInputProps<T> {
  placeholder?: string
  rows?: number
  maxLength?: number
}

export function TextAreaInput<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  placeholder,
  rows = 4,
  maxLength
}: TextAreaInputProps<T>) {
  const {
    field,
    fieldState: { error }
  } = useController({ name, control })

  return (
    <FormField label={label} required={required} description={description} className={className}>
      <Textarea
        {...field}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
      />
      {maxLength && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{error?.message}</span>
          <span>{field.value?.length || 0}/{maxLength}</span>
        </div>
      )}
      {error && !maxLength && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </FormField>
  )
}

// Select Component
interface SelectInputProps<T extends FieldValues> extends BaseInputProps<T> {
  options: Array<{ label: string; value: string }>
  placeholder?: string
}

export function SelectInput<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  options,
  placeholder = 'Select an option'
}: SelectInputProps<T>) {
  const {
    field,
    fieldState: { error }
  } = useController({ name, control })

  return (
    <FormField label={label} required={required} description={description} className={className}>
      <Select onValueChange={field.onChange} value={field.value} disabled={disabled}>
        <SelectTrigger className={cn(error && "border-destructive focus-visible:ring-destructive")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </FormField>
  )
}

// Multi-Select Component
interface MultiSelectInputProps<T extends FieldValues> extends BaseInputProps<T> {
  options: Array<{ label: string; value: string }>
  placeholder?: string
}

export function MultiSelectInput<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  options,
  placeholder = 'Select options'
}: MultiSelectInputProps<T>) {
  const [open, setOpen] = React.useState(false)
  const {
    field,
    fieldState: { error }
  } = useController({ name, control })

  const selectedValues = field.value || []

  const handleSelect = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v: string) => v !== value)
      : [...selectedValues, value]
    field.onChange(newValues)
  }

  return (
    <FormField label={label} required={required} description={description} className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            disabled={disabled}
          >
            {selectedValues.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedValues.slice(0, 3).map((value: string) => {
                  const option = options.find(opt => opt.value === value)
                  return (
                    <Badge key={value} variant="secondary" className="text-xs">
                      {option?.label}
                    </Badge>
                  )
                })}
                {selectedValues.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedValues.length - 3} more
                  </Badge>
                )}
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search options..." />
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValues.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </FormField>
  )
}

// Checkbox Component
interface CheckboxInputProps<T extends FieldValues> extends BaseInputProps<T> {
  checkboxLabel: string
}

export function CheckboxInput<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  checkboxLabel
}: CheckboxInputProps<T>) {
  const {
    field,
    fieldState: { error }
  } = useController({ name, control })

  return (
    <FormField label={label} required={required} description={description} className={className}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={name}
          checked={field.value}
          onCheckedChange={field.onChange}
          disabled={disabled}
        />
        <Label htmlFor={name} className="text-sm font-normal">
          {checkboxLabel}
        </Label>
      </div>
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </FormField>
  )
}

// Radio Group Component
interface RadioInputProps<T extends FieldValues> extends BaseInputProps<T> {
  options: Array<{ label: string; value: string; description?: string }>
}

export function RadioInput<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  options
}: RadioInputProps<T>) {
  const {
    field,
    fieldState: { error }
  } = useController({ name, control })

  return (
    <FormField label={label} required={required} description={description} className={className}>
      <RadioGroup onValueChange={field.onChange} value={field.value} disabled={disabled}>
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
            <Label htmlFor={`${name}-${option.value}`} className="text-sm font-normal">
              <div>
                {option.label}
                {option.description && (
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                )}
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </FormField>
  )
}

// Date Input Component
interface DateInputProps<T extends FieldValues> extends BaseInputProps<T> {
  placeholder?: string
  minDate?: Date
  maxDate?: Date
}

export function DateInput<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  placeholder = 'Pick a date',
  minDate,
  maxDate
}: DateInputProps<T>) {
  const {
    field,
    fieldState: { error }
  } = useController({ name, control })

  return (
    <FormField label={label} required={required} description={description} className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !field.value && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {field.value ? format(field.value, 'PPP') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={field.onChange}
            disabled={(date) => {
              if (minDate && date < minDate) return true
              if (maxDate && date > maxDate) return true
              return false
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </FormField>
  )
}

// Time Input Component  
interface TimeInputProps<T extends FieldValues> extends BaseInputProps<T> {
  placeholder?: string
  format24?: boolean
}

export function TimeInput<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  placeholder = 'Select time',
  format24 = true
}: TimeInputProps<T>) {
  const {
    field,
    fieldState: { error }
  } = useController({ name, control })

  return (
    <FormField label={label} required={required} description={description} className={className}>
      <Input
        {...field}
        type="time"
        placeholder={placeholder}
        disabled={disabled}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
      />
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </FormField>
  )
}

// File Input Component
interface FileInputProps<T extends FieldValues> extends BaseInputProps<T> {
  accept?: string
  maxSize?: number
  multiple?: boolean
}

export function FileInput<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  accept,
  maxSize,
  multiple = false
}: FileInputProps<T>) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const {
    field,
    fieldState: { error }
  } = useController({ name, control })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      field.onChange(multiple ? Array.from(files) : files[0])
    }
  }

  const handleRemoveFile = () => {
    field.onChange(multiple ? [] : null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const files = multiple ? field.value || [] : field.value ? [field.value] : []

  return (
    <FormField label={label} required={required} description={description} className={className}>
      <div className="space-y-2">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors",
            error && "border-destructive",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Click to upload or drag and drop</p>
          {accept && (
            <p className="text-xs text-muted-foreground mt-1">
              Accepted formats: {accept}
            </p>
          )}
          {maxSize && (
            <p className="text-xs text-muted-foreground">
              Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB
            </p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file: File, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </FormField>
  )
}

// Color Input Component
interface ColorInputProps<T extends FieldValues> extends BaseInputProps<T> {
  placeholder?: string
}

export function ColorInput<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  placeholder = '#000000'
}: ColorInputProps<T>) {
  const {
    field,
    fieldState: { error }
  } = useController({ name, control })

  return (
    <FormField label={label} required={required} description={description} className={className}>
      <div className="flex items-center space-x-2">
        <Input
          {...field}
          type="color"
          className={cn("w-16 h-10 p-1 border-2", error && "border-destructive")}
          disabled={disabled}
        />
        <Input
          value={field.value || ''}
          onChange={(e) => field.onChange(e.target.value)}
          placeholder={placeholder}
          className={cn("flex-1", error && "border-destructive focus-visible:ring-destructive")}
          disabled={disabled}
        />
      </div>
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </FormField>
  )
}
