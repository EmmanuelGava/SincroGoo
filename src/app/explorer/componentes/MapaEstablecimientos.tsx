'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import { GoogleMap, useLoadScript, Libraries } from '@react-google-maps/api';
import { Lugar } from '@/app/servicios/google/explorer/types';
import LocationOnIcon from '@mui/icons-material/LocationOn';

interface MapaEstablecimientosProps {
  establecimientos: Lugar[];
  centro: { lat: number; lng: number };
  onCentroChange: (centro: { lat: number; lng: number }) => void;
  onRadioChange: (radio: number) => void;
  onUbicacionSeleccionada: (ubicacion: { lat: number; lng: number; direccion?: string }) => void;
  establecimientoSeleccionado: Lugar | null;
  onSeleccionarEstablecimiento: (establecimiento: Lugar) => void;
  radio: number; // Radio en kilómetros
}

// Definir las bibliotecas fuera del componente como una constante
const libraries: Libraries = ["geometry"];

const containerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
  clickableIcons: false
};

// Calcular el zoom basado en el radio
const calcularZoom = (radioKm: number) => {
  return Math.round(14 - Math.log2(radioKm));
};

interface MapState {
  map: google.maps.Map | null;
  circle: google.maps.Circle | null;
  markers: Map<string, google.maps.Marker>;
}

export function MapaEstablecimientos({
  establecimientos,
  centro,
  onCentroChange,
  onRadioChange,
  onUbicacionSeleccionada,
  establecimientoSeleccionado,
  onSeleccionarEstablecimiento,
  radio
}: MapaEstablecimientosProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const [mapState, setMapState] = useState<MapState>({
    map: null,
    circle: null,
    markers: new Map()
  });

  const [isMoving, setIsMoving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Memoizar el zoom
  const zoom = useMemo(() => calcularZoom(radio), [radio]);

  // Función para calcular la distancia entre dos puntos en kilómetros
  const calcularDistancia = useCallback((punto1: { lat: number; lng: number }, punto2: { lat: number; lng: number }): number => {
    if (!isLoaded || !window.google?.maps) return Infinity;

    try {
      const p1 = new window.google.maps.LatLng(punto1.lat, punto1.lng);
      const p2 = new window.google.maps.LatLng(punto2.lat, punto2.lng);
      
      // Convertir metros a kilómetros
      return window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2) / 1000;
    } catch (error) {
      console.error('Error al calcular distancia:', error);
      return Infinity;
    }
  }, [isLoaded]);

  // Filtrar establecimientos por distancia
  const establecimientosFiltrados = useMemo(() => {
    if (!isLoaded) return establecimientos;

    return establecimientos.filter(establecimiento => {
      const distancia = calcularDistancia(
        { lat: establecimiento.latitud, lng: establecimiento.longitud },
        centro
      );
      return distancia <= radio;
    });
  }, [establecimientos, centro, radio, isLoaded, calcularDistancia]);

  // Función para actualizar marcadores usando establecimientosFiltrados
  const updateMarkers = useCallback(() => {
    if (!isLoaded || !mapState.map) return;

    const { map, markers } = mapState;

    try {
      // Limpiar marcadores antiguos
      markers.forEach((marker, id) => {
        if (!establecimientosFiltrados.find(e => e.id === id)) {
          marker.setMap(null);
          markers.delete(id);
        }
      });

      // Actualizar o crear nuevos marcadores
      establecimientosFiltrados.forEach(establecimiento => {
        const position = { 
          lat: establecimiento.latitud, 
          lng: establecimiento.longitud 
        };
        const isSelected = establecimiento.id === establecimientoSeleccionado?.id;

        let marker = markers.get(establecimiento.id);
        
        if (!marker) {
          marker = new window.google.maps.Marker({
            position,
            map,
            title: establecimiento.nombre,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: isSelected ? '#ff4081' : '#6534ac',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2,
              scale: 8
            }
          });

          marker.addListener('click', () => {
            onSeleccionarEstablecimiento(establecimiento);
          });

          markers.set(establecimiento.id, marker);
        } else {
          marker.setPosition(position);
          marker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: isSelected ? '#ff4081' : '#6534ac',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
            scale: 8
          });
        }
      });

      setMapState(prev => ({
        ...prev,
        markers: new Map(markers)
      }));
    } catch (error) {
      console.error('Error al actualizar marcadores:', error);
    }
  }, [isLoaded, mapState.map, establecimientosFiltrados, establecimientoSeleccionado, onSeleccionarEstablecimiento]);

  // Efecto para actualizar marcadores cuando cambian los establecimientos filtrados
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // Efecto para actualizar el círculo
  useEffect(() => {
    if (!isLoaded || !mapState.map || !window.google) return;

    try {
      const { map, circle: oldCircle } = mapState;
      const google = window.google;

      // Limpiar círculo anterior
      if (oldCircle) {
        oldCircle.setMap(null);
      }

      // Crear nuevo círculo
      const circle = new google.maps.Circle({
        strokeColor: '#6750A4',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#6750A4',
        fillOpacity: 0.1,
        map,
        center: centro,
        radius: radio * 1000,
        editable: true,
        draggable: false
      });

      // Eventos del círculo
      circle.addListener('radius_changed', () => {
        const nuevoRadioKm = Math.round(circle.getRadius() / 1000);
        if (nuevoRadioKm !== radio && nuevoRadioKm > 0) {
          onRadioChange(nuevoRadioKm);
        }
      });

      circle.addListener('center_changed', () => {
        const nuevoCentro = circle.getCenter();
        if (nuevoCentro) {
          onCentroChange({
            lat: nuevoCentro.lat(),
            lng: nuevoCentro.lng()
          });
        }
      });

      setMapState(prev => ({
        ...prev,
        circle
      }));

      return () => {
        circle.setMap(null);
      };
    } catch (error) {
      console.error('Error al crear/actualizar el círculo:', error);
    }
  }, [isLoaded, mapState.map, centro, radio, onCentroChange, onRadioChange]);

  const handleLoad = useCallback((map: google.maps.Map) => {
    setMapState(prev => ({
      ...prev,
      map
    }));
  }, []);

  const handleUnmount = useCallback(() => {
    setMapState({
      map: null,
      circle: null,
      markers: new Map()
    });
  }, []);

  const handleCenterChanged = useCallback(() => {
    if (isMoving || isDragging || !mapState.map) return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < 500) return; // Evitar actualizaciones muy frecuentes

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (mapState.map) {
        const center = mapState.map.getCenter();
        if (center) {
          lastUpdateRef.current = Date.now();
          onCentroChange({
            lat: center.lat(),
            lng: center.lng()
          });
        }
      }
    }, 300); // Aumentamos el debounce a 300ms
  }, [isMoving, isDragging, mapState.map, onCentroChange]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setIsMoving(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setIsMoving(false);
    if (mapState.map) {
      const center = mapState.map.getCenter();
      if (center) {
        lastUpdateRef.current = Date.now();
        onCentroChange({
          lat: center.lat(),
          lng: center.lng()
        });
      }
    }
  }, [mapState.map, onCentroChange]);

  const handleUbicacionSeleccionada = useCallback(async () => {
    if (!isLoaded || !mapState.map || !window.google) {
      console.error('El mapa o la API de Google Maps no está disponible');
      return;
    }

    try {
      const center = mapState.map.getCenter();
      if (!center) {
        console.error('No se pudo obtener el centro del mapa');
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode({
        location: {
          lat: center.lat(),
          lng: center.lng()
        }
      }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          onUbicacionSeleccionada({
            lat: center.lat(),
            lng: center.lng(),
            direccion: results[0].formatted_address
          });
        } else {
          onUbicacionSeleccionada({
            lat: center.lat(),
            lng: center.lng()
          });
        }
      });
    } catch (error) {
      console.error('Error al obtener la dirección:', error);
    }
  }, [isLoaded, mapState.map, onUbicacionSeleccionada]);

  // Limpieza de timeouts al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (loadError) {
    return <Box>Error al cargar el mapa</Box>;
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {isLoaded ? (
        <>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={centro}
            zoom={zoom}
            options={mapOptions}
            onLoad={handleLoad}
            onUnmount={handleUnmount}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onCenterChanged={handleCenterChanged}
          />
          <Tooltip title="Usar esta ubicación para buscar">
            <Button
              variant="contained"
              color="primary"
              startIcon={<LocationOnIcon />}
              onClick={handleUbicacionSeleccionada}
              sx={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                backgroundColor: 'white',
                color: '#6750A4',
                '&:hover': {
                  backgroundColor: '#f5f5f5'
                }
              }}
            >
              Buscar en esta zona
            </Button>
          </Tooltip>
        </>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          Cargando mapa...
        </Box>
      )}
    </Box>
  );
} 