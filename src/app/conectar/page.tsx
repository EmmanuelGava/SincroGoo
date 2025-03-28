import { ConectarDocumentos } from "@/componentes/conectar/ConectarDocumentos"

export default function PaginaConectar() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Conectar Documentos</h1>
      <ConectarDocumentos />
    </div>
  )
} 