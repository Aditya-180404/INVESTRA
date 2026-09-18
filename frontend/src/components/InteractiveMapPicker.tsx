import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Crosshair } from 'lucide-react';

interface InteractiveMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  onSelectLocation: (lat: number, lng: number, address: string) => void;
  height?: string;
}

const PRESET_LOCATIONS = [
  { name: 'Sector V Webel / College More', lat: 22.5731, lng: 88.4332, district: 'Bidhannagar' },
  { name: 'Salt Lake Karunamoyee Bus Terminus', lat: 22.5867, lng: 88.4178, district: 'Bidhannagar' },
  { name: 'Bidhannagar Railway Station', lat: 22.5930, lng: 88.3882, district: 'North 24 Parganas' },
  { name: 'New Town Action Area I Gateway', lat: 22.5902, lng: 88.4687, district: 'North 24 Parganas' },
  { name: 'Lake Town Clock Tower / VIP Road', lat: 22.6025, lng: 88.4012, district: 'Bidhannagar' },
  { name: 'Nicco Park Crossing', lat: 22.5695, lng: 88.4235, district: 'Bidhannagar' }
];

export const InteractiveMapPicker: React.FC<InteractiveMapPickerProps> = ({
  initialLat = 22.5731,
  initialLng = 88.4332,
  initialAddress = 'Sector V, Salt Lake, Kolkata',
  onSelectLocation,
  height = '340px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [address, setAddress] = useState<string>(initialAddress);

  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  useEffect(() => {
    setLat(initialLat);
    setLng(initialLng);
    setAddress(initialAddress);
    if (mapInstanceRef.current && markerInstanceRef.current) {
      mapInstanceRef.current.setView([initialLat, initialLng], 14);
      markerInstanceRef.current.setLatLng([initialLat, initialLng]);
    }
  }, [initialLat, initialLng, initialAddress]);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      try {
        const L = (await import('leaflet')).default;
        // Import leaflet css
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (!mapContainerRef.current || !isMounted) return;

        if (!mapInstanceRef.current) {
          const map = L.map(mapContainerRef.current).setView([lat, lng], 14);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          // Custom police pin icon
          const icon = L.divIcon({
            className: 'custom-police-pin',
            html: `<div style="background-color:#d32f2f;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(0,0,0,0.4);border:2px solid white;font-size:16px;">📍</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          });

          const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
          markerInstanceRef.current = marker;

          // Drag end event
          marker.on('dragend', (e: any) => {
            const pos = e.target.getLatLng();
            const newLat = parseFloat(pos.lat.toFixed(6));
            const newLng = parseFloat(pos.lng.toFixed(6));
            setLat(newLat);
            setLng(newLng);
            onSelectLocation(newLat, newLng, address);
          });

          // Click on map to place pin
          map.on('click', (e: any) => {
            const newLat = parseFloat(e.latlng.lat.toFixed(6));
            const newLng = parseFloat(e.latlng.lng.toFixed(6));
            marker.setLatLng([newLat, newLng]);
            setLat(newLat);
            setLng(newLng);
            onSelectLocation(newLat, newLng, address);
          });

          mapInstanceRef.current = map;
        }
      } catch (e) {
        console.warn('Leaflet initialization fallback', e);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleSelectPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    setLat(preset.lat);
    setLng(preset.lng);
    setAddress(preset.name);
    if (mapInstanceRef.current && markerInstanceRef.current) {
      mapInstanceRef.current.setView([preset.lat, preset.lng], 15);
      markerInstanceRef.current.setLatLng([preset.lat, preset.lng]);
    }
    onSelectLocation(preset.lat, preset.lng, preset.name);
  };

  const handleManualCoordChange = (newLat: number, newLng: number) => {
    if (!Number.isFinite(newLat) || !Number.isFinite(newLng)) return;
    setLat(newLat);
    setLng(newLng);
    if (mapInstanceRef.current && markerInstanceRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], 14);
      markerInstanceRef.current.setLatLng([newLat, newLng]);
    }
    onSelectLocation(newLat, newLng, address);
  };

  return (
    <div className="interactive-map-picker">
      <div className="picker-header">
        <div className="picker-badge">
          <MapPin size={15} /> Real Interactive Crime Scene Picker
        </div>
        <div className="picker-coords">
          <span>Lat: <b>{lat.toFixed(4)}</b></span>
          <span>Lng: <b>{lng.toFixed(4)}</b></span>
        </div>
      </div>

      <div className="presets-bar">
        <span className="presets-label"><Crosshair size={13} /> Quick Landmarks:</span>
        <div className="presets-chips">
          {PRESET_LOCATIONS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={`chip ${Math.abs(lat - preset.lat) < 0.002 && Math.abs(lng - preset.lng) < 0.002 ? 'active' : ''}`}
              onClick={() => handleSelectPreset(preset)}
            >
              {preset.name.split('/')[0]}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="map-viewport"
        style={{ height, width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
      />

      <div className="picker-footer">
        <span className="picker-tip">
          💡 Click directly on the map or drag the pin to set the exact crime location coordinates.
        </span>
        <div className="coord-inputs">
          <label>
            Latitude:
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => handleManualCoordChange(parseFloat(e.target.value) || lat, lng)}
            />
          </label>
          <label>
            Longitude:
            <input
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) => handleManualCoordChange(lat, parseFloat(e.target.value) || lng)}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
