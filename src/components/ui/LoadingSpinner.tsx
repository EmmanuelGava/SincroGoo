// Loading Spinner - Componente de spinner de carga
// Fecha: 2025-01-16

'use client';

import React from 'react';

// =====================================================
// Interfaces
// =====================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'gray' | 'white' | 'green' | 'red';
  className?: string;
  text?: string;
}

// =====================================================
// Componente principal
// =====================================================

export function LoadingSpinner({ 
  size = 'md', 
  color = 'blue', 
  className = '', 
  text 
}: LoadingSpinnerProps) {
  // Configuración de tamaños
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  // Configuración de colores
  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white',
    green: 'border-green-600',
    red: 'border-red-600'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`
          ${sizeClasses[size]} 
          ${colorClasses[color]} 
          border-2 border-t-transparent 
          rounded-full 
          animate-spin
        `}
        role="status"
        aria-label="Cargando"
      />
      {text && (
        <p className={`mt-2 ${textSizeClasses[size]} text-gray-600`}>
          {text}
        </p>
      )}
    </div>
  );
}

// =====================================================
// Variantes específicas
// =====================================================

export function LoadingSpinnerInline({ 
  size = 'sm', 
  color = 'blue', 
  className = '' 
}: Omit<LoadingSpinnerProps, 'text'>) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white',
    green: 'border-green-600',
    red: 'border-red-600'
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        ${colorClasses[color]} 
        border-2 border-t-transparent 
        rounded-full 
        animate-spin
        inline-block
        ${className}
      `}
      role="status"
      aria-label="Cargando"
    />
  );
}

export function LoadingSpinnerOverlay({ 
  text = 'Cargando...', 
  className = '' 
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={`
      fixed inset-0 bg-black bg-opacity-50 
      flex items-center justify-center 
      z-50 ${className}
    `}>
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
}

export function LoadingSpinnerCard({ 
  text = 'Cargando...', 
  className = '' 
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={`
      bg-white border border-gray-200 rounded-lg 
      p-8 flex items-center justify-center 
      ${className}
    `}>
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}