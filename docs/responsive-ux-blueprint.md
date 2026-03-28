# Responsive UX Blueprint (Handy + Desktop)

## 1) Ziel

Die App soll unterwegs auf dem Handy maximal schnell bedienbar sein und auf Desktop fuer Vergleich und Planung mehr Kontext zeigen.

## 2) Breakpoints

- Handy: `0-767px`
- Tablet: `768-1023px`
- Desktop: `>=1024px`

## 3) Informationsarchitektur

- Kernobjekt: Tankstelle
- Kernattribute:
  - Name, Marke
  - Adresse
  - Preise: E5, E10, Diesel
  - Entfernung
  - letzte Preisaktualisierung
  - Oeffnungsstatus (falls verfuegbar)

## 4) Mobile-Layout (Default unterwegs)

## 4.1 Screen-Aufbau

1. Top Bar: Standort + Aendern Button
2. Filterleiste: Kraftstoff, Radius, Sortierung
3. Hauptbereich mit Toggle:
   - Tab A: Liste
   - Tab B: Karte
4. Sticky CTA: "Aktualisieren" oder "In meiner Naehe"

## 4.2 Interaktion

1. Liste ist Standardansicht (schneller Preisvergleich).
2. Karte als fokussierter Modus in Vollflaeche.
3. Marker-Tap oeffnet Bottom Sheet mit:
   - Preisvergleich
   - Adresse
   - Route in Maps
4. Touch Targets mindestens 44px.

## 4.3 Mobile Performance

1. Karten-Komponente lazy laden.
2. Marker clustern ab 30+ Treffern.
3. Debounce fuer Filter-Updates (z. B. 250 ms).
4. Skeleton-Loading fuer Liste und Karte.

## 5) Desktop-Layout (Vergleichsmodus)

## 5.1 Split View

- Links: Ergebnisliste (35-45% Breite)
- Rechts: Karte (55-65% Breite)

## 5.2 Verhalten

1. Hover auf Listenelement hebt Marker hervor.
2. Klick auf Marker scrollt zur Kartenkarte in Liste.
3. Filterleiste dauerhaft sichtbar am oberen Rand.
4. Zusatzzustand: kompakter Tabellenmodus (optional spaeter).

## 6) Gemeinsame UX-Regeln

1. Bester Preis wird farblich klar hervorgehoben.
2. Preisaktualitaet immer sichtbar (z. B. "vor 3 min").
3. Leere Zustaende mit Handlungsoption:
   - Radius vergroessern
   - Standort aendern
4. Fehlerzustaende mit Retry-Button.

## 7) Accessibility

1. Kontrast mindestens WCAG AA.
2. Vollstaendige Tastaturbedienung auf Desktop.
3. ARIA-Labels fuer Kartensteuerung und Filter.
4. Fokus-Indikatoren klar sichtbar.

## 8) UI-Designrichtung

1. Klare, hohe Lesbarkeit im Sonnenlicht (mobile first).
2. Preiswerte visuell dominant (Typografie + Badge).
3. Keine ueberladenen Panels; pro Karte nur relevante Daten.
4. Subtile, kurze Animationen fuer Zustandswechsel.

## 9) Messbare UX-Ziele

1. Zeit bis erste Ergebnisse < 2.5 s bei warmem Cache.
2. Nutzer findet guenstigste Tankstelle im Umkreis in < 10 s.
3. Lighthouse Mobile Performance >= 80.
4. Lighthouse Desktop Performance >= 90.
