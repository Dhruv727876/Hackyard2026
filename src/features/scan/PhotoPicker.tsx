import { useEffect, useId, useMemo } from 'react'
import { SCAN_CONFIG } from '@/config/scan'

export interface PhotoPickerProps {
  files: readonly File[]
  errors: readonly { name: string; reason: string }[]
  disabled?: boolean
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
}

export function PhotoPicker({
  files,
  errors,
  disabled = false,
  onAdd,
  onRemove,
}: PhotoPickerProps): React.JSX.Element {
  const inputId = useId()

  const previewUrls = useMemo(() => {
    return files.map((file) => URL.createObjectURL(file))
  }, [files])

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const chosen = event.target.files ? Array.from(event.target.files) : []
    if (chosen.length > 0) {
      onAdd(chosen)
    }
    event.target.value = ''
  }

  return (
    <div className="space-y-4">
      <div>
        <input
          id={inputId}
          type="file"
          accept={SCAN_CONFIG.acceptedTypes.join(',')}
          multiple
          disabled={disabled}
          onChange={handleInputChange}
          className="sr-only"
        />
        <label
          htmlFor={inputId}
          className={`flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100/70 ${
            disabled ? 'pointer-events-none cursor-not-allowed opacity-50' : ''
          }`}
        >
          Add photos
        </label>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {files.map((file, index) => {
            const label = `Selected photo ${index + 1} of ${files.length}`
            const previewUrl = previewUrls[index]
            return (
              <div
                key={`${file.name}-${index}`}
                className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm"
              >
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt={label}
                    aria-label={label}
                    className="h-full w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemove(index)}
                  aria-label={`Remove photo ${index + 1} of ${files.length}`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-xs font-bold text-white transition-colors hover:bg-slate-900 focus:outline-none disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
        >
          <ul className="space-y-1">
            {errors.map((err, idx) => (
              <li key={`${err.name}-${idx}`}>
                <span className="font-semibold">{err.name}</span> — {err.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
