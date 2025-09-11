'use client'

import * as React from 'react'
import { useForm, UseFormReturn, FieldValues, Path, PathValue } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ZodSchema, ZodError } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Form context for accessing form state in child components
interface FormContextType<T extends FieldValues> {
  form: UseFormReturn<T>
  isSubmitting: boolean
  hasErrors: boolean
}

const FormContext = React.createContext<FormContextType<any> | null>(null)

export function useFormContext<T extends FieldValues>(): FormContextType<T> {
  const context = React.useContext(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a FormBase component')
  }
  return context
}

// Base form props
interface FormBaseProps<T extends FieldValues> {
  schema: ZodSchema<T>
  onSubmit: (data: T) => Promise<void> | void
  defaultValues?: Partial<T>
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  submitText?: string
  resetOnSuccess?: boolean
  showSuccessMessage?: boolean
  disabled?: boolean
  autoFocus?: boolean
  debugMode?: boolean
}

export function FormBase<T extends FieldValues>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className,
  title,
  description,
  submitText = 'Submit',
  resetOnSuccess = false,
  showSuccessMessage = false,
  disabled = false,
  autoFocus = true,
  debugMode = false,
}: FormBaseProps<T>) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = React.useState(false)

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const { handleSubmit, formState: { errors, isValid, isDirty }, reset } = form

  const hasErrors = Object.keys(errors).length > 0

  const handleFormSubmit = async (data: T) => {
    if (disabled) return

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      await onSubmit(data)
      
      if (showSuccessMessage) {
        setSubmitSuccess(true)
        setTimeout(() => setSubmitSuccess(false), 3000)
      }
      
      if (resetOnSuccess) {
        reset()
      }
    } catch (error) {
      console.error('Form submission error:', error)
      
      if (error instanceof ZodError) {
        setSubmitError('Validation failed. Please check your input.')
      } else if (error instanceof Error) {
        setSubmitError(error.message)
      } else {
        setSubmitError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const contextValue: FormContextType<T> = React.useMemo(() => ({
    form,
    isSubmitting,
    hasErrors,
  }), [form, isSubmitting, hasErrors])

  return (
    <FormContext.Provider value={contextValue}>
      <Card className={cn("w-full", className)}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Error Alert */}
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {submitSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Successfully submitted!</AlertDescription>
              </Alert>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              {children}
            </div>

            {/* Debug Panel */}
            {debugMode && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Debug Info</h4>
                <div className="text-xs space-y-1">
                  <div>Valid: {isValid ? 'Yes' : 'No'}</div>
                  <div>Dirty: {isDirty ? 'Yes' : 'No'}</div>
                  <div>Errors: {Object.keys(errors).length}</div>
                  <div>Submitting: {isSubmitting ? 'Yes' : 'No'}</div>
                </div>
                {Object.keys(errors).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer">Form Errors</summary>
                    <pre className="text-xs mt-1 overflow-auto">
                      {JSON.stringify(errors, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={disabled || isSubmitting || (!isDirty && !debugMode)}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  submitText
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </FormContext.Provider>
  )
}

// Form field components for consistent styling
interface FormFieldProps {
  label: string
  required?: boolean
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ 
  label, 
  required = false, 
  description, 
  children, 
  className 
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

// Form section for grouping related fields
interface FormSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4 pl-0">
        {children}
      </div>
    </div>
  )
}

// Form actions for submit/cancel buttons
interface FormActionsProps {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right' | 'between'
}

export function FormActions({ children, className, align = 'right' }: FormActionsProps) {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  }

  return (
    <div className={cn(
      "flex gap-3 pt-6 border-t",
      alignmentClasses[align],
      className
    )}>
      {children}
    </div>
  )
}

// Higher-order component for form validation
export function withFormValidation<T extends FieldValues>(
  Component: React.ComponentType<any>,
  schema: ZodSchema<T>
) {
  return function ValidatedComponent(props: any) {
    return (
      <FormBase schema={schema} {...props}>
        <Component {...props} />
      </FormBase>
    )
  }
}

// Form hook for imperative access
export function useFormValidation<T extends FieldValues>(
  schema: ZodSchema<T>,
  defaultValues?: Partial<T>
) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  })

  const validateField = (name: Path<T>, value: PathValue<T, Path<T>>) => {
    try {
      const result = schema.shape[name].parse(value)
      return { isValid: true, error: null }
    } catch (error) {
      if (error instanceof ZodError) {
        return { isValid: false, error: error.errors[0]?.message || 'Invalid input' }
      }
      return { isValid: false, error: 'Validation error' }
    }
  }

  const validateForm = (data: T) => {
    try {
      schema.parse(data)
      return { isValid: true, errors: {} }
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path) {
            errors[err.path.join('.')] = err.message
          }
        })
        return { isValid: false, errors }
      }
      return { isValid: false, errors: { _form: 'Validation failed' } }
    }
  }

  return {
    ...form,
    validateField,
    validateForm,
  }
}
