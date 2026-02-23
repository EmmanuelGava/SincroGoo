"use client"

import { useState, useEffect, ChangeEvent } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableContainer,
  TableRow,
  Paper,
  TextField,
  Box,
  Typography,
  InputAdornment
} from "@mui/material"
import { Search } from "lucide-react"
import { useSheets, useUI } from "../../contexts"
import { BotonSincronizar } from "../sheets/BotonSincronizar"
import type { FilaHoja } from "../../types/sheets"

export function TablaPlantillaSheet() {
  const { filas, columnas, tituloHoja } = useSheets()
  const { cargando } = useUI()
  const [busqueda, setBusqueda] = useState("")
  const [filasFiltradas, setFilasFiltradas] = useState<FilaHoja[]>(filas)

  useEffect(() => {
    if (!busqueda) {
      setFilasFiltradas(filas)
      return
    }
    setFilasFiltradas(
      filas.filter((fila) =>
        fila.valores.some((v) =>
          String(v.valor || "").toLowerCase().includes(busqueda.toLowerCase())
        )
      )
    )
  }, [filas, busqueda])

  if (cargando) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        Cargando...
      </Box>
    )
  }

  if (!filas.length || !columnas.length) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        No hay datos disponibles
      </Box>
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="subtitle1" fontWeight={600}>
        {tituloHoja || "Hoja de cálculo"}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <TextField
          fullWidth
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search className="h-4 w-4" />
              </InputAdornment>
            )
          }}
        />
        <BotonSincronizar />
      </Box>
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columnas.map((col) => (
                <TableCell key={col.id}>{col.titulo}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filasFiltradas.map((fila) => (
              <TableRow key={fila.id}>
                {columnas.map((col) => {
                  const val = fila.valores.find((v) => v.columnaId === col.id)
                  return (
                    <TableCell key={col.id}>
                      {val?.valor != null ? String(val.valor) : ""}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
