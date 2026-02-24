"use client"

import React from "react"
import { Box, Button, Typography } from "@mui/material"
import { OpenInNew as OpenInNewIcon } from "@mui/icons-material"

interface SlidesEmbedProps {
  presentationId: string
  onNeedShare?: () => Promise<void>
}

const EDIT_URL = (id: string) =>
  `https://docs.google.com/presentation/d/${id}/edit`
const VIEW_URL = (id: string) =>
  `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`

export function SlidesEmbed({ presentationId, onNeedShare }: SlidesEmbedProps) {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden"
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <iframe
          src={VIEW_URL(presentationId)}
          title="Vista de presentación"
          style={{
            flex: 1,
            width: "100%",
            minHeight: 200,
            border: "none",
            aspectRatio: "16 / 9"
          }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ p: 1, textAlign: "center" }}
        >
          Si no ves la presentación, comparte el archivo en Google Drive.
        </Typography>
      </Box>
      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<OpenInNewIcon />}
          href={EDIT_URL(presentationId)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir en Google Slides para editar
        </Button>
      </Box>
    </Box>
  )
}
