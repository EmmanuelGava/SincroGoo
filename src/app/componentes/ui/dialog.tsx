"use client"

import * as React from "react"
import {
  Dialog as MuiDialog,
  DialogTitle as MuiDialogTitle,
  DialogContent as MuiDialogContent,
  DialogActions as MuiDialogActions,
  DialogContentText as MuiDialogContentText,
  IconButton,
  DialogProps as MuiDialogProps
} from "@mui/material"
import CloseIcon from '@mui/icons-material/Close'

export interface DialogProps extends Omit<MuiDialogProps, 'title'> {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  onClose?: () => void;
}

const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ children, title, actions, onClose, ...props }, ref) => {
    return (
      <MuiDialog
        ref={ref}
        onClose={onClose}
        {...props}
      >
        {title && (
          <DialogTitle>
            {title}
            {onClose && (
              <IconButton
                aria-label="close"
                onClick={onClose}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
            )}
          </DialogTitle>
        )}
        <DialogContent>
          {children}
        </DialogContent>
        {actions && (
          <DialogFooter>
            {actions}
          </DialogFooter>
        )}
      </MuiDialog>
    )
  }
)

Dialog.displayName = "Dialog"

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className="flex flex-col space-y-1.5 text-center sm:text-left"
    {...props}
  />
))
DialogHeader.displayName = "DialogHeader"

const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <MuiDialogActions
    ref={ref}
    className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2"
    {...props}
  />
))
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <MuiDialogTitle
    ref={ref}
    className="text-lg font-semibold leading-none tracking-tight"
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <MuiDialogContent
    ref={ref}
    className="flex-1 overflow-auto p-6"
    {...props}
  />
))
DialogContent.displayName = "DialogContent"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <MuiDialogContentText
    ref={ref}
    className="text-sm text-muted-foreground"
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogContent,
  DialogDescription
}
