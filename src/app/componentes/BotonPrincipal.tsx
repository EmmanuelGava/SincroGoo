"use client"

import React from 'react';
import { Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useThemeMode } from '@/app/lib/theme';

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '0.5rem',
  padding: '0.5rem 1.25rem',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: theme.palette.mode === 'dark' 
    ? '0 4px 14px rgba(140, 95, 208, 0.3)' 
    : '0 4px 14px rgba(101, 52, 172, 0.25)',
  transition: 'all 0.2s ease-in-out',
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: theme.palette.mode === 'dark' 
      ? '0 6px 20px rgba(140, 95, 208, 0.4)' 
      : '0 6px 20px rgba(101, 52, 172, 0.35)',
    transform: 'translateY(-2px)',
  },
}));

interface BotonPrincipalProps {
  children: React.ReactNode;
  onClick?: () => void;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'outlined' | 'contained';
  className?: string;
}

export function BotonPrincipal({
  children,
  onClick,
  startIcon,
  endIcon,
  fullWidth = false,
  disabled = false,
  type = 'button',
  size = 'medium',
  variant = 'contained',
  className,
  ...props
}: BotonPrincipalProps) {
  const { mode } = useThemeMode();
  
  return (
    <StyledButton
      onClick={onClick}
      startIcon={startIcon}
      endIcon={endIcon}
      fullWidth={fullWidth}
      disabled={disabled}
      type={type}
      size={size}
      variant={variant}
      className={className}
      {...props}
    >
      {children}
    </StyledButton>
  );
} 