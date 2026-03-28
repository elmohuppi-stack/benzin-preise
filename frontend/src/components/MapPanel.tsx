import L from "leaflet";
import { useEffect } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Station } from "../types";

type Props = {
  stations: Station[];
  selectedId: string | null;
  position: { lat: number; lng: number };
  onSelect: (id: string) => void;
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

const Recenter = ({ center }: { center: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [map, center]);

  return null;
};

export const MapPanel = ({
  stations,
  selectedId,
  position,
  onSelect,
}: Props) => {
  const selected =
    stations.find((station) => station.id === selectedId) || stations[0];

  const center = selected
    ? ([selected.lat, selected.lng] as [number, number])
    : ([position.lat, position.lng] as [number, number]);

  return (
    <section className="map-panel" aria-label="Karte">
      <div className="map-canvas-wrap">
        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom
          className="map-canvas"
        >
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
                  click: () => onSelect(station.id)
                }}
              >
                <Popup>
                  <strong>{station.name || station.brand || "Tankstelle"}</strong>
                  <br />
                  {formatSelectedPrice(station.prices.selected)}
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
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
        </div>
      ) : (
        <div className="map-sheet">
          Keine Treffer auf der Karte. Standort wird angezeigt.
        </div>
      )}
    </section>
  );
};
