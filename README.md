# 🚍 MadridTransporte

> Plataforma y Progressive Web App (PWA) de movilidad en tiempo real para Madrid. Diseñada con arquitectura modular para integrar múltiples medios de transporte (Autobuses EMT, Metro de Madrid, Cercanías y BiciMAD).

![MadridTransporte](public/icons/icon-192.png)

---

## ⚡ Características Principales

* **Buscador Universal de Movilidad**: Búsqueda predictiva ultrarrápida sin necesidad de conocer el número de parada. Permite buscar por:
  * 🚏 Nombre de estación o parada (ej. *Estrella Polar*, *Cibeles*, *Moncloa*).
  * 📍 Nombre de calle o dirección (ej. *Princesa*, *Alcalá*, *Gran Vía*).
  * 🚌 Número de línea (ej. *32*, *147*, *C1*, *N5*).
  * 🔢 Código directo de poste/marquesina (ej. *2279*, *741*).
  * 📍 Geolocalización GPS *"Cerca de mí"* para encontrar las paradas más próximas.
* **Consumo 100% Frontend**: Peticiones directas desde el navegador al visor oficial de la EMT (`pmv.aspx`) aprovechando que cuenta con CORS abierto (`access-control-allow-origin: *`).
* **Visualización Dual de Mapas en Vivo**:
  * **Google Maps**: Integrado con `@vis.gl/react-google-maps` con `AdvancedMarkerElement`, vista satélite y de relieve, y marcadores en tiempo real con animación de llegada.
  * **OpenStreetMap / CartoDB**: Alternativa 100% libre y sin cuotas mediante Leaflet.
* **Auto-refresco Inteligente**: Temporizador visual de 30 segundos con opción de pausa y recarga manual.
* **Favoritos y Persistencia**: Guarda tus paradas habituales con un clic en `localStorage`.
* **PWA Instalable**: Service Worker (`sw.js`) y `manifest.json` para instalarla como app nativa en iOS, Android y escritorio.
* **Modo Oscuro / Claro**: Diseño adaptable con Tailwind CSS.

---

## 🛠️ Tecnologías Utilizadas

* **Framework**: React 19 + TypeScript
* **Herramienta de compilación**: Vite
* **Estilos**: Tailwind CSS
* **Mapas**: `@vis.gl/react-google-maps` (Google Maps Platform) + `leaflet` (OpenStreetMap)
* **Iconografía**: Lucide React
* **Gestor de Paquetes**: `pnpm`

---

## 🚀 Instalación y Uso Local

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev

# Compilar para producción
pnpm build

# Previsualizar el build de producción
pnpm preview
```

---

## 🌐 Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto para habilitar Google Maps:

```env
VITE_GOOGLE_MAPS_API_KEY=tu_clave_de_google_maps_platform
```

---

## 🗺️ Roadmap de Movilidad
- [x] EMT Madrid (Autobuses urbanos en tiempo real con GPS)
- [x] Catálogo oficial de 4.933 paradas indexado offline
- [x] Integración de Google Maps con marcadores en vivo
- [ ] Metro de Madrid (Llegadas y estado de líneas)
- [ ] Cercanías Madrid (Horarios y trenes en directo)
- [ ] BiciMAD (Disponibilidad de bicicletas y anclajes por estación)
