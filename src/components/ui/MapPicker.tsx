import React, { useEffect, useRef, useState } from 'react';

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  defaultCityCoordinates?: { lat: number; lng: number };
}

declare global {
  interface Window {
    L: any;
  }
}

export const MapPicker: React.FC<MapPickerProps> = ({
  latitude,
  longitude,
  onChange,
  defaultCityCoordinates
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet CSS and JS dynamically from CDN
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    // 1. Inject CSS
    const linkId = 'leaflet-cdn-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // 2. Inject JS
    const scriptId = 'leaflet-cdn-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        setLeafletLoaded(true);
      };
      document.body.appendChild(script);
    } else {
      // Script tag exists, wait for it to load
      const interval = setInterval(() => {
        if (window.L) {
          setLeafletLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // Initialize and manage the Leaflet map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    const L = window.L;

    // Use passed coordinates, default city coordinates, or fallback Lahore
    const initialLat = latitude || defaultCityCoordinates?.lat || 31.5204;
    const initialLng = longitude || defaultCityCoordinates?.lng || 74.3587;

    // Destroy existing map instance to prevent duplication
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    }

    // Initialize Map
    const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);
    mapInstanceRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initial Marker
    const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
    markerInstanceRef.current = marker;

    // Handle marker drag end
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      onChange(position.lat, position.lng);
    });

    // Handle map click
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onChange(lat, lng);
    });

    // Cleanup map instance on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Update marker position when latitude/longitude props change from outside
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current || !markerInstanceRef.current) return;

    const currentLat = latitude || 31.5204;
    const currentLng = longitude || 74.3587;

    const markerLatLng = markerInstanceRef.current.getLatLng();
    if (markerLatLng.lat !== currentLat || markerLatLng.lng !== currentLng) {
      markerInstanceRef.current.setLatLng([currentLat, currentLng]);
      mapInstanceRef.current.panTo([currentLat, currentLng]);
    }
  }, [latitude, longitude, leafletLoaded]);

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
      <div 
        ref={mapContainerRef} 
        style={{ 
          height: '240px', 
          width: '100%', 
          borderRadius: '10px', 
          border: '1px solid #1e3d30',
          background: '#0a1a15',
          overflow: 'hidden'
        }} 
      />
      {!leafletLoaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10, 26, 21, 0.8)',
          color: '#e8f5f0',
          borderRadius: '10px',
          fontSize: '13px'
        }}>
          Loading Map Picker...
        </div>
      )}
    </div>
  );
};
