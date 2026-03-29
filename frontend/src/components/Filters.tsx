import type { FuelType } from "../types";

type Props = {
  fuel: FuelType;
  radius: number;
  sort: "price" | "dist";
  onFuelChange: (fuel: FuelType) => void;
  onRadiusChange: (radius: number) => void;
  onSortChange: (sort: "price" | "dist") => void;
  className?: string;
};

export const Filters = ({
  fuel,
  radius,
  sort,
  onFuelChange,
  onRadiusChange,
  onSortChange,
  className,
}: Props) => {
  return (
    <section className={className || "filters"} aria-label="Filter">
      <label>
        Kraftstoff
        <select
          value={fuel}
          onChange={(e) => onFuelChange(e.target.value as FuelType)}
        >
          <option value="e5">Super E5</option>
          <option value="e10">Super E10</option>
          <option value="diesel">Diesel</option>
        </select>
      </label>

      <label>
        Radius
        <select
          value={radius}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
        >
          <option value={3}>3 km</option>
          <option value={5}>5 km</option>
          <option value={10}>10 km</option>
          <option value={15}>15 km</option>
        </select>
      </label>

      <label>
        Sortierung
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as "price" | "dist")}
        >
          <option value="price">Preis</option>
          <option value="dist">Entfernung</option>
        </select>
      </label>
    </section>
  );
};
