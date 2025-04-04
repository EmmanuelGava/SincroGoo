"use client"

import * as React from "react"
import { Box, BoxProps } from "@mui/material"
import { styled } from "@mui/material/styles"

const ScrollArea = styled(Box)(({ theme }) => ({
  overflow: 'auto',
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.grey[400],
    borderRadius: '4px',
    '&:hover': {
      background: theme.palette.grey[500],
    },
  },
}))

export interface ScrollAreaProps extends BoxProps {
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

const ScrollAreaComponent = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ orientation = 'vertical', style, ...props }, ref) => {
    return (
      <ScrollArea
        ref={ref}
        style={{
          ...style,
          overflowY: orientation === 'vertical' ? 'auto' : 'hidden',
          overflowX: orientation === 'horizontal' ? 'auto' : 'hidden',
        }}
        {...props}
      />
    )
  }
)

ScrollAreaComponent.displayName = "ScrollArea"

export { ScrollAreaComponent as ScrollArea }
