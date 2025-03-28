import { Progress } from '@/componentes/ui/progress'
import { Alert, AlertDescription } from '@/componentes/ui/alert'
import { Loader2 } from 'lucide-react'

interface SyncProgressProps {
  total: number
  current: number
  status: string
  error?: string
}

export function SyncProgress({
  total,
  current,
  status,
  error,
}: SyncProgressProps) {
  const progress = Math.round((current / total) * 100)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Progress value={progress} className="w-full" />
        <div className="text-sm font-medium">{progress}%</div>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        {status}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="text-sm text-gray-500">
        Procesando {current} de {total} elementos
      </div>
    </div>
  )
} 