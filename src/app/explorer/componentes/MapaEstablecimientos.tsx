'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { GoogleMap, useLoadScript, Marker, Circle } from '@react-google-maps/api';
import { Lugar } from '../servicios/google-places-service';

interface MapaEstablecimientosProps {
  establecimientos: Lugar[];
  centro: { lat: number; lng: number };
  onCentroChange: (centro: { lat: number; lng: number }) => void;
  establecimientoSeleccionado: Lugar | null;
  onSeleccionarEstablecimiento: (establecimiento: Lugar) => void;
  radio: number; // Radio en kilómetros
}

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

export function MapaEstablecimientos({
  establecimientos,
  centro,
  onCentroChange,
  establecimientoSeleccionado,
  onSeleccionarEstablecimiento,
  radio
}: MapaEstablecimientosProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['geometry']
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calcular el zoom basado en el radio
  const calcularZoom = (radioKm: number) => {
    return Math.round(14 - Math.log2(radioKm));
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Actualizar o crear el círculo
    if (circleRef.current) {
      circleRef.current.setCenter(centro);
      circleRef.current.setRadius(radio * 1000); // Convertir km a metros
    } else {
      circleRef.current = new google.maps.Circle({
        strokeColor: '#6750A4',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#6750A4',
        fillOpacity: 0.1,
        map: mapRef.current,
        center: centro,
        radius: radio * 1000, // Convertir km a metros
        clickable: false
      });
    }

    // Ajustar el zoom para mostrar todo el círculo
    const bounds = circleRef.current.getBounds();
    if (bounds) {
      mapRef.current.fitBounds(bounds);
    }
  }, [centro, radio]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    // Crear el círculo inicial
    circleRef.current = new google.maps.Circle({
      strokeColor: '#6750A4',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#6750A4',
      fillOpacity: 0.1,
      map: map,
      center: centro,
      radius: radio * 1000, // Convertir km a metros
      clickable: false
    });

    // Ajustar el zoom inicial
    const bounds = circleRef.current.getBounds();
    if (bounds) {
      map.fitBounds(bounds);
    }
  }, [centro, radio]);

  const onUnmount = () => {
    mapRef.current = null;
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
  };

  const handleDragStart = () => {
    setIsMoving(true);
  };

  const handleDragEnd = () => {
    if (mapRef.current) {
      const newCenter = mapRef.current.getCenter();
      if (newCenter) {
        onCentroChange({
          lat: newCenter.lat(),
          lng: newCenter.lng()
        });
      }
    }
    setIsMoving(false);
  };

  const handleCenterChanged = () => {
    if (isMoving || !mapRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const newCenter = mapRef.current?.getCenter();
      if (newCenter) {
        onCentroChange({
          lat: newCenter.lat(),
          lng: newCenter.lng()
        });
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const establecimientosFiltrados = useMemo(() => {
    if (!isLoaded) return [];
    return establecimientos.filter(establecimiento => {
      const distancia = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(establecimiento.latitud, establecimiento.longitud),
        new google.maps.LatLng(centro.lat, centro.lng)
      );
      return distancia <= radio * 1000;
    });
  }, [establecimientos, centro, radio, isLoaded]);

  if (loadError) {
    return <Box>Error al cargar el mapa</Box>;
  }

  if (!isLoaded) {
    return <Box>Cargando mapa...</Box>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={centro}
      zoom={calcularZoom(radio)}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onCenterChanged={handleCenterChanged}
    >
      {establecimientosFiltrados.map((establecimiento) => (
        <Marker
          key={establecimiento.id}
          position={{
            lat: establecimiento.latitud,
            lng: establecimiento.longitud
          }}
          onClick={() => onSeleccionarEstablecimiento(establecimiento)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: establecimiento.id === establecimientoSeleccionado?.id ? '#ff4081' : '#6534ac',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }}
        />
      ))}
    </GoogleMap>
  );
} 