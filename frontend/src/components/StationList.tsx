import type { Station } from "../types";

type Props = {
  stations: Station[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const priceLabel = (value: number | null) =>
  typeof value === "number" ? `${value.toFixed(3)} EUR` : "-";

export const StationList = ({ stations, selectedId, onSelect }: Props) => {
  if (stations.length === 0) {
    return <p className="state">Keine Treffer fuer diese Suche.</p>;
  }

  return (
    <ul className="station-list">
      {stations.map((station) => {
        const isSelected = station.id === selectedId;

        return (
          <li key={station.id}>
            <button
              className={`station-card ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(station.id)}
            >
              <div className="station-head">
                <strong>{station.name || station.brand || "Tankstelle"}</strong>
                <span className="price">
                  {priceLabel(station.prices.selected)}
                </span>
              </div>
              <div className="station-sub">
                {station.street} {station.houseNumber}, {station.postCode}{" "}
                {station.place}
              </div>
              <div className="station-meta">
                <span>{station.dist.toFixed(2)} km</span>
                <span>{station.isOpen ? "Offen" : "Geschlossen"}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
