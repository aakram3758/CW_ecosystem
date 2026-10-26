import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp, useStrings } from '../../lib/app-context';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { BRANCHES_STRINGS } from './strings';

/** Inside Saudi Arabia (with a margin) — catches swapped or mistyped coordinates. */
const inKsa = (lat: number, lng: number) => lat > 15 && lat < 33 && lng > 33 && lng < 56;

const PIN = L.divIcon({
  className: '',
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  html: '<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43s15-14.2 15-26A15 15 0 0 0 2 17c0 11.8 15 26 15 26z" fill="#C9A24A" stroke="#0B1B2E" stroke-width="2"/><circle cx="17" cy="17" r="5.5" fill="#0B1B2E"/></svg>',
});

/** Pick a branch's location on an OpenStreetMap map (tap or drag the pin), or type the coordinates. */
export function BranchMapDialog({
  open,
  title,
  place,
  initial,
  center,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  place: string;
  initial: [number, number] | null;
  /** Where the map opens when the branch has no location yet. */
  center: { center: [number, number]; known: boolean };
  busy: boolean;
  onClose: () => void;
  onSave: (lat: number, lng: number) => void;
}) {
  const s = useStrings(BRANCHES_STRINGS);
  const { t } = useApp();
  const [pos, setPos] = useState<[number, number] | null>(initial);
  const [typed, setTyped] = useState(initial ? `${initial[0].toFixed(5)}, ${initial[1].toFixed(5)}` : '');
  const [typedErr, setTypedErr] = useState('');
  const [tilesFailed, setTilesFailed] = useState(false);
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);

  const place_ = (lat: number, lng: number, pan = false) => {
    const m = map.current;
    if (!m) return;
    if (!marker.current) {
      marker.current = L.marker([lat, lng], { icon: PIN, draggable: true, keyboard: false }).addTo(m);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLatLng();
        setPos([p.lat, p.lng]);
        setTyped(`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`);
      });
    } else marker.current.setLatLng([lat, lng]);
    if (pan) m.setView([lat, lng], Math.max(m.getZoom(), 16));
    setPos([lat, lng]);
    setTyped(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setTypedErr('');
  };

  // The dialog content mounts after the open animation frame, so the map is created once its box exists.
  useEffect(() => {
    if (!box || map.current) return;
    const m = L.map(box, { attributionControl: true, zoomControl: true }).setView(initial ?? center.center, initial ? 17 : center.known ? 12 : 5);
    m.attributionControl.setPrefix(false);
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(m);
    let errors = 0;
    tiles.on('tileerror', () => ++errors > 4 && setTilesFailed(true));
    m.on('click', (e: L.LeafletMouseEvent) => place_(e.latlng.lat, e.latlng.lng));
    map.current = m;
    if (initial) place_(initial[0], initial[1]);
    setTimeout(() => m.invalidateSize(), 50);
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);

  const applyTyped = () => {
    const m = /^\s*(-?\d+(?:\.\d+)?)\s*[,،\s]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(typed);
    const lat = m ? Number(m[1]) : NaN;
    const lng = m ? Number(m[2]) : NaN;
    if (!m || !inKsa(lat, lng)) return setTypedErr(s.badCoords);
    place_(lat, lng, true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title={title} kicker={s.mapSub(place)} width={760}>
      <div className="relative overflow-hidden rounded-2xl border border-line">
        <div ref={setBox} dir="ltr" role="application" aria-label={s.mapLabel} className="h-[380px] w-full bg-surface-2" />
        {!pos && (
          <span className="pointer-events-none absolute inset-x-0 top-3 z-[500] mx-auto w-fit rounded-full bg-navy px-3.5 py-1.5 text-[13px] font-bold text-white shadow">
            {s.mapHint}
          </span>
        )}
      </div>
      {tilesFailed && (
        <div role="alert" className="text-sm font-bold text-danger-ink">
          {s.mapOffline}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-muted" htmlFor="branch-coords">
          {s.manualCoords}
        </label>
        <span className="flex gap-2">
          <Input
            id="branch-coords"
            dir="ltr"
            placeholder={s.coordsPh}
            value={typed}
            aria-invalid={!!typedErr}
            onChange={(e) => (setTyped(e.target.value), setTypedErr(''))}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyTyped())}
          />
          <Button onClick={applyTyped}>{s.applyCoords}</Button>
        </span>
        {typedErr && <span className="text-[13px] font-bold text-danger-ink">{typedErr}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="min-w-[200px] flex-1 text-sm text-muted">
          {s.coords}
          <strong dir="ltr" className="text-ink">
            {pos ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}` : '—'}
          </strong>
        </span>
        <Button variant="gold" size="lg" disabled={!pos || busy} onClick={() => pos && onSave(pos[0], pos[1])}>
          {s.saveLoc}
        </Button>
        <Button size="lg" onClick={onClose}>
          {t.cancel}
        </Button>
      </div>
    </Dialog>
  );
}
