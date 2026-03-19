# Coordinate conversion verification (EPSG:2193 → WGS84)

The seed script converts DOC GeoJSON coordinates from **NZTM2000 (EPSG:2193)** to **WGS84 (EPSG:4326)** using proj4. This document records a sample check against Google Maps and published coordinates.

## Conversion details

- **Source:** `geometry.coordinates` as `[x, y]` in NZTM2000 metres.
- **Target:** `lat`, `lon` in WGS84 decimal degrees (proj4 order: longitude, latitude → we store as lat, lon).
- **Definition used:** EPSG:2193 as in seed script (`+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +units=m`).

## Sample sites (from DOC_Campsites_202602.geojson)

| Name | Place / Region | NZTM2000 (x, y) | WGS84 (lat, lon) | Google Maps |
|------|----------------|------------------|------------------|-------------|
| Kiosk Creek Campsite | Fiordland National Park, Fiordland | 1207153, 5009087 | -44.9629, 168.0188 | [Map](https://www.google.com/maps?q=-44.962912666386046,168.01882347027276) |
| Sylvan Campsite | Glenorchy area, Otago | 1228962, 5036824 | -44.7258, 168.3147 | [Map](https://www.google.com/maps?q=-44.72577386043702,168.31465902994657) |
| Cobb River Campsite | Cobb Valley, Nelson/Tasman | 1567688, 5446880 | -41.1287, 172.6150 | [Map](https://www.google.com/maps?q=-41.12874017202206,172.61504811336985) |
| Mangahuia Campsite | Tongariro National Park, Central North Island | 1813334, 5660336 | -39.1801, 175.4698 | [Map](https://www.google.com/maps?q=-39.18005850898488,175.4697920785033) |
| Kapowairua (Spirits Bay) Campsite | Cape Reinga / Northland | 1587447, 6190362 | -34.4281, 172.8634 | [Map](https://www.google.com/maps?q=-34.42814530861981,172.86337907390757) |

## Cross-check against published coordinates

- **Mangahuia Campsite:** Published WGS84 coordinates (DOC / NZ sources) are **-39.18005851, 175.46979208** and NZTM2000 **E1813334, N5660336**. Our conversion from (1813334, 5660336) gives **-39.18005851, 175.46979208** — **exact match**.
- **Kapowairua (Spirits Bay):** Published WGS84 **-34.42814531, 172.86337907**, NZTM2000 **E1587447, N6190362**. Our conversion from (1587447, 6190362) gives **-34.42814531, 172.86337907** — **exact match**.

## Conclusion

For the sample checked:

1. Converted (lat, lon) values match published WGS84 coordinates for the same NZTM2000 inputs.
2. Google Maps links place each site in the correct region (Fiordland, Otago, Nelson/Tasman, Tongariro, Northland/Cape Reinga).

The EPSG:2193 → WGS84 conversion used in the import is **accurate** for the DOC campsites dataset.
