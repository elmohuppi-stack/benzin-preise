import type { Station } from "../types";

type Props = {
  stations: Station[];
  selectedId: string | null;
};

export const MapPanel = ({ stations, selectedId }: Props) => {
  const selected =
    stations.find((station) => station.id === selectedId) || stations[0];

  return (
    <section className="map-panel" aria-label="Karte">
      <div className="map-placeholder">
        Kartenansicht (Leaflet oder MapLibre hier einhaengen)
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
        <div className="map-sheet">Keine Daten vorhanden.</div>
      )}
    </section>
  );
};
