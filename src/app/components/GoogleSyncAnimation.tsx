'use client';
import React from 'react';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Box } from '@mui/material';

const GoogleSyncAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const googleLogoRef = useRef<SVGSVGElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const appLogoRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!googleLogoRef.current || !arrowRef.current || !appLogoRef.current) return;

    const tl = gsap.timeline({
      repeat: -1,
      defaults: { duration: 1, ease: "power2.inOut" }
    });

    // Animación inicial
    tl.from(googleLogoRef.current, { 
      scale: 0.8, 
      opacity: 0,
      duration: 0.5 
    })
    .from(arrowRef.current, { 
      width: 0,
      opacity: 0,
      duration: 0.8 
    }, "-=0.3")
    .from(appLogoRef.current, { 
      scale: 0.8,
      opacity: 0,
      duration: 0.5 
    }, "-=0.3")
    
    // Animación de sincronización
    .to([googleLogoRef.current, appLogoRef.current], {
      scale: 1.1,
      duration: 0.4,
      yoyo: true,
      repeat: 1
    })
    .to(arrowRef.current, {
      stroke: "#4285f4",
      duration: 0.4,
      yoyo: true,
      repeat: 1
    }, "<");

    // Cleanup function
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <Box 
      ref={containerRef} 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 4, 
        my: 8,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at center, rgba(66, 133, 244, 0.1), transparent 70%)',
          filter: 'blur(20px)',
          zIndex: 0
        }
      }}
    >
      {/* Google Logo */}
      <svg ref={googleLogoRef} viewBox="0 0 24 24" width="64" height="64">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>

      {/* Flecha animada */}
      <svg ref={arrowRef} width="64" height="32" viewBox="0 0 64 32">
        <path 
          d="M2 16h52M44 4l12 12-12 12" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>

      {/* App Logo (SincroGoo) */}
      <svg ref={appLogoRef} width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="#4285F4" />
        <path 
          d="M20 32c0-6.627 5.373-12 12-12s12 5.373 12 12-5.373 12-12 12" 
          fill="none" 
          stroke="#FFF" 
          strokeWidth="4" 
          strokeLinecap="round"
        />
        <circle cx="32" cy="32" r="6" fill="#FFF" />
      </svg>
    </Box>
  );
};

export default GoogleSyncAnimation; 