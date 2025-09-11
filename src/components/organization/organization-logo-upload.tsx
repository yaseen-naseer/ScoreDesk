'use client'

import * as React from 'react'
import { useOrganization } from '@/lib/contexts/organization-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Building2, 
  Upload, 
  Trash2, 
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrganizationLogoUploadProps {
  size?: 'sm' | 'md' | 'lg'
  showTitle?: boolean
  className?: string
}

export function OrganizationLogoUpload({ 
  size = 'md', 
  showTitle = true,
  className 
}: OrganizationLogoUploadProps) {
  const { 
    currentOrganization, 
    uploadLogo, 
    updateOrganization,
    canManageOrganization 
  } = useOrganization()

  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = React.useState(false)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  if (!currentOrganization) {
    return null
  }

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-32 w-32'
  }

  const handleFileSelect = async (file: File) => {
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setUploadError(null)
    setIsUploading(true)

    try {
      await uploadLogo(file)
      setUploadSuccess(true)
      setIsDialogOpen(false)
      setTimeout(() => {
        setUploadSuccess(false)
        setPreviewUrl(null)
      }, 3000)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeLogo = async () => {
    try {
      await updateOrganization({ logo_url: null })
      setIsDialogOpen(false)
    } catch (error) {
      setUploadError('Failed to remove logo')
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  if (!canManageOrganization) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Avatar className={sizeClasses[size]}>
          <AvatarImage 
            src={currentOrganization.logo_url || undefined} 
            alt={currentOrganization.name}
          />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {currentOrganization.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        {showTitle && (
          <div>
            <p className="font-medium">{currentOrganization.name}</p>
            <p className="text-sm text-muted-foreground">Organization Logo</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showTitle && (
        <div>
          <h3 className="text-lg font-medium">Organization Logo</h3>
          <p className="text-sm text-muted-foreground">
            Upload a logo to represent your organization
          </p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative group">
          <Avatar className={sizeClasses[size]}>
            <AvatarImage 
              src={previewUrl || currentOrganization.logo_url || undefined} 
              alt={currentOrganization.name}
            />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                currentOrganization.name.charAt(0)
              )}
            </AvatarFallback>
          </Avatar>
          
          {/* Upload overlay */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                disabled={isUploading}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Organization Logo</DialogTitle>
                <DialogDescription>
                  Upload a new logo or remove the current one. Recommended size: 400x400px, max 5MB.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Current Logo Preview */}
                <div className="flex justify-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={previewUrl || currentOrganization.logo_url || undefined} 
                      alt={currentOrganization.name}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {currentOrganization.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Upload Area */}
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                    dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                    isUploading && "opacity-50 pointer-events-none"
                  )}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={openFileDialog}
                >
                  <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-2">
                    Drop an image here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WebP up to 5MB
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* Error Display */}
                {uploadError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}

                {/* Success Display */}
                {uploadSuccess && (
                  <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>Logo uploaded successfully!</AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex justify-between">
                  {currentOrganization.logo_url && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={removeLogo}
                      disabled={isUploading}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Logo
                    </Button>
                  )}
                  
                  <div className="flex gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{currentOrganization.name}</p>
            {uploadSuccess && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {currentOrganization.logo_url ? 'Click to update logo' : 'No logo uploaded'}
          </p>
          
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : currentOrganization.logo_url ? (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Change Logo
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
