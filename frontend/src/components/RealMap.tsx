import { ExternalLink, MapPin, Navigation } from 'lucide-react';

export interface CrimeLocation {
  lat: number;
  lng: number;
  label: string;
  caseNumber: string;
  crimeType?: string;
  date?: string;
}

export interface StationLocation {
  id: number;
  name: string;
  area: string;
  score: number;
  level: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  selected?: boolean;
}

interface RealMapProps {
  crimeLocation?: CrimeLocation;
  allCrimeLocations?: CrimeLocation[];
  stations?: StationLocation[];
  interactivePicker?: boolean;
  onLocationSelect?: (lat: number, lng: number, approxAddress: string) => void;
  height?: string;
  showProximityLines?: boolean;
}

const googleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export default function RealMap({
  crimeLocation,
  stations = [],
  interactivePicker = false,
  onLocationSelect,
  height = '520px'
}: RealMapProps) {
  const location = crimeLocation || {
    lat: 22.5804,
    lng: 88.4282,
    label: 'Sector V, Salt Lake, Kolkata',
    caseNumber: 'New case'
  };
  const embedUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}&z=14&output=embed`;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" style={{ height }}>
      <div className="relative h-full">
        <iframe
          title={`Google Map — ${location.caseNumber}`}
          src={embedUrl}
          className="h-full w-full border-0"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="absolute left-4 top-4 max-w-xs rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-start gap-2">
            <MapPin size={17} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="text-[10px] font-bold tracking-wider text-red-700">ACTIVE POLICE CASE</p>
              <strong className="block text-sm text-slate-900">{location.caseNumber}</strong>
              <span className="block text-xs text-slate-600">{location.label}</span>
            </div>
          </div>
          <a className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900" href={googleMapsUrl(location.lat, location.lng)} target="_blank" rel="noreferrer">
            Open in Google Maps <ExternalLink size={12} />
          </a>
        </div>

        {interactivePicker && (
          <button
            type="button"
            onClick={() => onLocationSelect?.(location.lat, location.lng, location.label)}
            className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-slate-800"
          >
            <Navigation size={14} /> Use displayed case location
          </button>
        )}

        {!interactivePicker && stations.length > 0 && (
          <div className="absolute bottom-4 right-4 max-h-[42%] w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <p className="mb-2 text-[10px] font-bold tracking-wider text-slate-500">RELEVANT POLICE STATIONS</p>
            <div className="space-y-2">
              {stations.map((station) => station.latitude != null && station.longitude != null && (
                <a key={station.id} href={googleMapsUrl(station.latitude, station.longitude)} target="_blank" rel="noreferrer" className="block rounded-md border border-slate-100 p-2 hover:border-blue-200 hover:bg-blue-50">
                  <strong className="block text-xs text-slate-800">{station.name}</strong>
                  <span className="text-[11px] text-slate-500">{station.distance_km ?? '—'} km · {station.level}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
