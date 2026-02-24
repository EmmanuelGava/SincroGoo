"use client"

import React, { useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Popover from "@mui/material/Popover"
import Typography from "@mui/material/Typography"
import { HexColorPicker } from "react-colorful"

interface ColorPickerButtonProps {
  label: string
  value: string
  onChange: (hex: string) => void
  size?: "small" | "medium"
}

export function ColorPickerButton({
  label,
  value,
  onChange,
  size = "medium"
}: ColorPickerButtonProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)

  return (
    <>
      <Button
        variant="outlined"
        size={size}
        onClick={handleClick}
        sx={{
          minWidth: size === "small" ? 90 : 120,
          justifyContent: "flex-start",
          gap: 1,
          textTransform: "none"
        }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: 1,
            bgcolor: value,
            border: "1px solid",
            borderColor: "divider",
            flexShrink: 0
          }}
        />
        <Typography variant="body2" noWrap sx={{ maxWidth: 70 }}>
          {label}
        </Typography>
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: { p: 2, borderRadius: 2 }
          }
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          {label}
        </Typography>
        <HexColorPicker color={value} onChange={onChange} style={{ width: "200px" }} />
        <Box
          sx={{
            mt: 2,
            display: "flex",
            alignItems: "center",
            gap: 1
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: value,
              border: "1px solid",
              borderColor: "divider"
            }}
          />
          <Typography variant="body2" fontFamily="monospace">
            {value}
          </Typography>
        </Box>
      </Popover>
    </>
  )
}
