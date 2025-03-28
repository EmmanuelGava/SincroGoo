import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/componentes/ui/alert-dialog'

interface ConfirmSyncModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  selectedCount: number
  hasHighChanges: boolean
}

export function ConfirmSyncModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  hasHighChanges,
}: ConfirmSyncModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Sincronización</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de actualizar {selectedCount} precio
            {selectedCount === 1 ? '' : 's'} en las diapositivas.
            {hasHighChanges && (
              <div className="mt-2 text-red-500">
                ⚠️ Advertencia: Algunos precios tienen cambios superiores al 10%.
              </div>
            )}
            <div className="mt-4">
              Esta acción:
              <ul className="list-disc pl-6 mt-2">
                <li>Actualizará los precios en las diapositivas seleccionadas</li>
                <li>Registrará los cambios en el historial</li>
                <li>No se puede deshacer automáticamente</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirmar Sincronización
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 