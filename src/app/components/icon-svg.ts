import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LucideIcon } from "lucide-react";

// Separado de highlights.ts para que react-dom/server só entre no pacote do mapa.
const svgCache = new Map<string, string>();

/** SVG do ícone como string, para uso em HTML do Leaflet */
export function iconSvg(icon: LucideIcon, size: number, color = "white"): string {
  const key = `${icon.displayName}-${size}-${color}`;
  let svg = svgCache.get(key);
  if (!svg) {
    svg = renderToStaticMarkup(createElement(icon, { size, color, strokeWidth: 2.5 }));
    svgCache.set(key, svg);
  }
  return svg;
}
