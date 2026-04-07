import L from "leaflet";
import { useEffect } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { Station } from "../types";

type Props = {
  stations: Station[];
  selectedId: string | null;
  position: { lat: number; lng: number };
  onSelect: (id: string) => void;
  isActive: boolean;
};

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const formatSelectedPrice = (value: number | null) =>
  typeof value === "number" ? `${value.toFixed(3)} EUR` : "-";

const formatFuelPrice = (value: number | null) =>
  typeof value === "number" ? `${value.toFixed(3)} EUR` : "-";

const Recenter = ({ center }: { center: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    const currentCenter = map.getCenter();
    const target = L.latLng(center[0], center[1]);
    const distance = currentCenter.distanceTo(target);

    if (distance > 30) {
      map.setView(center);
    }
  }, [map, center]);

  return null;
};

const InvalidateOnVisible = ({ isActive }: { isActive: boolean }) => {
  const map = useMap();

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      map.invalidateSize(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [map, isActive]);

  return null;
};

export const MapPanel = ({
  stations,
  selectedId,
  position,
  onSelect,
  isActive,
}: Props) => {
  const selected =
    stations.find((station) => station.id === selectedId) || stations[0];

  const center = [position.lat, position.lng] as [number, number];

  return (
    <section className="map-panel" aria-label="Karte">
      <div className="map-canvas-wrap">
        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom
          className="map-canvas"
        >
          <InvalidateOnVisible isActive={isActive} />
          <Recenter center={center} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {!stations.length ? (
            <Marker position={[position.lat, position.lng]} />
          ) : null}

          <MarkerClusterGroup chunkedLoading>
            {stations.map((station) => (
              <Marker
                key={station.id}
                position={[station.lat, station.lng]}
                eventHandlers={{
                  click: () => onSelect(station.id),
                }}
              >
                <Popup>
                  <strong>
                    {station.name || station.brand || "Tankstelle"}
                  </strong>
                  <br />
                  {formatSelectedPrice(station.prices.selected)}
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>

          {selected ? (
            <CircleMarker
              center={[selected.lat, selected.lng]}
              radius={18}
              pathOptions={{
                color: "#d62828",
                weight: 3,
                fillColor: "#ef233c",
                fillOpacity: 0.15,
              }}
              interactive={false}
            />
          ) : null}
        </MapContainer>
      </div>

      {selected ? (
        <div className="map-sheet">
          <strong>{selected.name || selected.brand || "Tankstelle"}</strong>
          <span>
            {selected.street} {selected.houseNumber}, {selected.postCode}{" "}
            {selected.place}
          </span>
          <span>
            Position: {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
          </span>

          <div className="price-grid" aria-label="Aktuelle Kraftstoffpreise">
            <span>Super E5</span>
            <strong>{formatFuelPrice(selected.prices.e5)}</strong>
            <span>Super E10</span>
            <strong>{formatFuelPrice(selected.prices.e10)}</strong>
            <span>Diesel</span>
            <strong>{formatFuelPrice(selected.prices.diesel)}</strong>
          </div>
        </div>
      ) : (
        <div className="map-sheet">
          Keine Treffer auf der Karte. Standort wird angezeigt.
        </div>
      )}
    </section>
  );
};
