import { placeFromFeature } from '../../services/geocoding';
﻿import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
export type Location = { latitude: number; longitude: number; label?: string; area?:string };
export type MapPoint = Location & { id: string; name: string };
export const defaultLocation: Location = { latitude: 12.9716, longitude: 77.5946 };
const cache = new Map<string, Location[]>();
export default function LocationMap({ value, onChange, points = [], selectedId, onSelect, routePath }: {
  value?: Location; onChange?: (value: Location) => void; points?: MapPoint[]; selectedId?: string; onSelect?: (id: string) => void; routePath?:Location[];
}) {
  const container = useRef<HTMLDivElement>(null), map = useRef<L.Map | null>(null);
  const callbacks = useRef({ onChange, onSelect }); callbacks.current = { onChange, onSelect };
  const [query, setQuery] = useState(''), [results, setResults] = useState<Location[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [tileError, setTileError] = useState(false);
  const [locating, setLocating] = useState(false);
  const searchVersion = useRef(0), lastSearch = useRef(0);
  useEffect(() => {
    const m = L.map(container.current!).setView([defaultLocation.latitude, defaultLocation.longitude], 14);
    map.current = m;
    L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).on('tileerror', () => setTileError(true)).addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => callbacks.current.onChange?.({ latitude: e.latlng.lat, longitude: e.latlng.lng }));
    const resize = new ResizeObserver(() => m.invalidateSize()); resize.observe(container.current!);
    return () => { searchVersion.current++; resize.disconnect(); m.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    const group = L.layerGroup().addTo(map.current);
    for (const p of points) {
      const label = document.createElement('span'); label.textContent = p.name;
      L.circleMarker([p.latitude, p.longitude], { bubblingMouseEvents:false, radius: p.id === selectedId ? 13 : 9, color: '#fff', weight: 3, fillColor: p.id === selectedId ? '#c27812' : '#17784a', fillOpacity: 1 })
        .bindTooltip(label).on('click', () => callbacks.current.onSelect?.(p.id)).addTo(group);
    }
    if (value) {
      const marker = L.marker([value.latitude, value.longitude], {
        draggable: !!onChange,
        icon: L.divIcon({ className: 'location-pin', html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 26] })
      }).addTo(group);
      marker.on('dragend', () => { const p = marker.getLatLng(); callbacks.current.onChange?.({ latitude: p.lat, longitude: p.lng }); });
    }
    return () => { group.remove(); };
  }, [value, points, selectedId, !!onChange]);
  useEffect(() => { if (value) map.current?.setView([value.latitude, value.longitude], 16); }, [value?.latitude, value?.longitude]);
  useEffect(() => { const p = points.find(p => p.id === selectedId); if (p) map.current?.setView([p.latitude, p.longitude], 17); }, [selectedId, points]);
  const routeKey=JSON.stringify(routePath||[]);
  const pointsKey=JSON.stringify(points.map(p=>[p.latitude,p.longitude]));
  useEffect(()=>{
    const m=map.current;if(!m)return;
    const coords=(routePath?.length?routePath:!value?points:[]).map(p=>[p.latitude,p.longitude] as L.LatLngTuple);
    if(!coords.length)return;
    m.fitBounds(L.latLngBounds(coords),{padding:[30,30],maxZoom:16});
    if(routePath?.length){const line=L.polyline(coords,{color:'#17784a',weight:4,dashArray:'8 8'}).addTo(m);return()=>{line.remove();};}
  },[routeKey,pointsKey]);
  async function search() {
    if (query.trim().length < 3 || busy || Date.now() - lastSearch.current < 1000) return;
    lastSearch.current = Date.now(); const version = ++searchVersion.current;
    setBusy(true); setError('');
    try {
      const key = query.trim().toLowerCase();
      let locations = cache.get(key);
      if (!locations) {
        const url = new URL(import.meta.env.VITE_GEOCODER_URL || 'https://photon.komoot.io/api/');
        url.searchParams.set('q', query.trim()); url.searchParams.set('limit', '5');
        const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!r.ok) throw new Error('Search unavailable. Try again or select a point on the map.');
        const data = await r.json();
        locations = data.features.map(placeFromFeature);
        cache.set(key, locations!);
      }
      if (version === searchVersion.current) { setResults(locations!); if (!locations!.length) setError('No places found. Try a nearby landmark or city.'); }
    } catch (e) { if (version === searchVersion.current) setError(e instanceof Error ? e.message : 'Search unavailable. Select a point on the map.'); }
    finally { if (version === searchVersion.current) setBusy(false); }
  }
  function locate() {
    if (!navigator.geolocation) { setError('Location is unavailable. Search or select a point instead.'); return; }
    setLocating(true); setError('');
    navigator.geolocation.getCurrentPosition(p => {
      setLocating(false); callbacks.current.onChange?.({ latitude: p.coords.latitude, longitude: p.coords.longitude });
    }, () => { setLocating(false); setError('Could not access your location. Allow location access, search, or select a point on the map.'); }, { timeout: 10000, enableHighAccuracy: true });
  }
  return <section className="location-map" aria-label="Location map">
    {onChange && <><div className="map-search"><input aria-label="Search for a place" placeholder="Search area, landmark or city" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }}/><button type="button" className="button" disabled={busy || query.trim().length < 3} onClick={search}>{busy ? 'Searching…' : 'Search'}</button></div>
      <button type="button" className="secondary" disabled={locating} onClick={locate}>{locating ? 'Locating…' : 'Use my location'}</button>
      {!!results.length && <ul className="map-results">{results.map((p, i) => <li key={i}><button type="button" onClick={() => { onChange(p); setResults([]); }}>{p.label}</button></li>)}</ul>}
      <p className="map-help">Search, click the map, or drag the pin to choose an exact location.</p></>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div ref={container} className="leaflet-map" />
    {tileError && <p role="status">Some map tiles could not load. Check your connection; search and coordinates are still available.</p>}
    {value && <p className="map-coordinates" aria-live="polite">Selected: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}</p>}
    {routePath&&<p className="map-help">Dashed line shows stop order. Use navigation for road directions.</p>}
    <small>Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>. Place search by Photon.</small>
  </section>;
}

