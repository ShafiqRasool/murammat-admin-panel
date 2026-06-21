import React, { useEffect, useRef, useState } from 'react';

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  defaultCityCoordinates?: { lat: number; lng: number };
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
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Load Google Maps script dynamically
  useEffect(() => {
    if ((window as any).google && (window as any).google.maps) {
      setGoogleLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script-admin';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBKXixSZWYE5MqJlysVTO_rmi4Y-L_lFN8&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setGoogleLoaded(true);
      };
      document.body.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if ((window as any).google && (window as any).google.maps) {
          setGoogleLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // Initialize map and marker
  useEffect(() => {
    if (!googleLoaded || !mapContainerRef.current) return;

    const google = (window as any).google;
    const initialLat = latitude || defaultCityCoordinates?.lat || 31.5204;
    const initialLng = longitude || defaultCityCoordinates?.lng || 74.3587;
    const initialCenter = { lat: initialLat, lng: initialLng };

    // Initialize Map
    const map = new google.maps.Map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // Initialize Marker
    const marker = new google.maps.Marker({
      position: initialCenter,
      map: map,
      draggable: true,
    });
    markerInstanceRef.current = marker;

    // Marker drag end listener
    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (pos) {
        onChange(pos.lat(), pos.lng());
      }
    });

    // Map click listener to relocate pin
    map.addListener('click', (e: any) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        onChange(e.latLng.lat(), e.latLng.lng());
      }
    });

    return () => {
      if (google.maps.event) {
        google.maps.event.clearInstanceListeners(marker);
        google.maps.event.clearInstanceListeners(map);
      }
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
  }, [googleLoaded]);

  // Update marker position from outside latitude/longitude changes
  useEffect(() => {
    if (!googleLoaded || !mapInstanceRef.current || !markerInstanceRef.current) return;

    const currentLat = latitude || 31.5204;
    const currentLng = longitude || 74.3587;

    const markerPosition = markerInstanceRef.current.getPosition();
    if (markerPosition) {
      const diffLat = Math.abs(markerPosition.lat() - currentLat);
      const diffLng = Math.abs(markerPosition.lng() - currentLng);

      // Pan/Move marker only if coordinates differ significantly
      if (diffLat > 0.0001 || diffLng > 0.0001) {
        const newPos = { lat: currentLat, lng: currentLng };
        markerInstanceRef.current.setPosition(newPos);
        mapInstanceRef.current.panTo(newPos);
      }
    }
  }, [latitude, longitude, googleLoaded]);

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
      <div 
        ref={mapContainerRef} 
        style={{ 
          height: '240px', 
          width: '100%', 
          borderRadius: '10px', 
          border: '1px solid var(--border)',
          background: 'var(--input-bg)',
          overflow: 'hidden'
        }} 
      />
      {!googleLoaded && (
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
          color: 'var(--text-primary)',
          borderRadius: '10px',
          fontSize: '13px'
        }}>
          Loading Map Picker...
        </div>
      )}
    </div>
  );
};
