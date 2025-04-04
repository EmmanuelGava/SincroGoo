"use client"

import { Box, Skeleton } from "@mui/material"

export default function Loading() {
  return (
    <div className="flex flex-col h-screen">
      {/* Encabezado Sistema */}
      <div className="h-16 border-b border-gray-200">
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', px: 2 }}>
          <Skeleton variant="rectangular" width={120} height={32} />
        </Box>
      </div>

      {/* Encabezado Editor */}
      <div className="h-16 border-b border-gray-200">
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', px: 2 }}>
          <Skeleton variant="rectangular" width={200} height={32} />
        </Box>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Área de la tabla */}
        <div className="w-2/5 border-r border-gray-200 overflow-auto p-4">
          <Box sx={{ 
            border: 1, 
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden'
          }}>
            {/* Encabezado de tabla */}
            <Box sx={{ 
              display: 'flex', 
              p: 2, 
              borderBottom: 1, 
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}>
              {[1, 2, 3].map((i) => (
                <Box key={i} sx={{ flex: 1, mr: 2 }}>
                  <Skeleton variant="rectangular" height={24} />
                </Box>
              ))}
            </Box>

            {/* Filas de tabla */}
            {[1, 2, 3, 4, 5].map((row) => (
              <Box 
                key={row}
                sx={{ 
                  display: 'flex', 
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider'
                }}
              >
                {[1, 2, 3].map((col) => (
                  <Box key={col} sx={{ flex: 1, mr: 2 }}>
                    <Skeleton variant="text" />
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </div>

        {/* Área de slides */}
        <div className="flex-1 overflow-auto p-4">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton 
                key={i} 
                variant="rectangular" 
                width={200} 
                height={120} 
                sx={{ borderRadius: 1 }}
              />
            ))}
          </Box>
        </div>
      </div>
    </div>
  )
} 