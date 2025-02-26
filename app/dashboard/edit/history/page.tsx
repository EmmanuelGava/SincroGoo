"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

interface HistoryEntry {
  id: string
  date: Date
  user: string
  changes: number
  details: {
    sheetCell: string
    oldPrice: string
    newPrice: string
    slideLocation: string
  }[]
}

export default function HistoryPage() {
  const router = useRouter()
  const [history] = useState<HistoryEntry[]>([
    {
      id: "1",
      date: new Date(2024, 1, 22, 15, 30),
      user: "Juan Pérez",
      changes: 3,
      details: [
        {
          sheetCell: "B2",
          oldPrice: "$100.00",
          newPrice: "$120.00",
          slideLocation: "Diapositiva 1",
        },
        {
          sheetCell: "C4",
          oldPrice: "$50.00",
          newPrice: "$55.00",
          slideLocation: "Diapositiva 2",
        },
        {
          sheetCell: "D6",
          oldPrice: "$75.00",
          newPrice: "$70.00",
          slideLocation: "Diapositiva 3",
        },
      ],
    },
    {
      id: "2",
      date: new Date(2024, 1, 21, 10, 15),
      user: "María García",
      changes: 2,
      details: [
        {
          sheetCell: "E8",
          oldPrice: "$200.00",
          newPrice: "$180.00",
          slideLocation: "Diapositiva 4",
        },
        {
          sheetCell: "F10",
          oldPrice: "$150.00",
          newPrice: "$160.00",
          slideLocation: "Diapositiva 5",
        },
      ],
    },
  ])

  return (
    <div className="container mx-auto p-6">
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/edit")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Historial de Cambios</CardTitle>
          </div>
          <Button variant="outline" size="icon">
            <FileDown className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Cambios</TableHead>
                  <TableHead>Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {format(entry.date, "dd 'de' MMMM 'a las' HH:mm", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell>{entry.user}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entry.changes} cambios</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {entry.details.map((detail, index) => (
                          <p key={index} className="text-sm text-muted-foreground">
                            {detail.sheetCell}: {detail.oldPrice} →{" "}
                            <span className="text-primary">{detail.newPrice}</span> ({detail.slideLocation})
                          </p>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

