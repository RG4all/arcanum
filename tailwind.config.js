/** Arcanum · Tailwind-Konfiguration (Produktion, lokal gebaut)
 * Die Layout-Hilfsklassen (flex, grid, Abstände, ...) werden hieraus
 * in css/tailwind.css gebaut; das okkulte Designsystem lebt in css/arcanum.css.
 **/

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './arcanum_tarot_browsergame_codex.html',
    './js/*.js',
  ],
  theme: {
    extend: {
      colors: {
        // Layout-Farbe, die im HTML als Hilfsklasse genutzt wird
        // (arcanum.css definiert dieselben Werte als CSS-Variablen).
        gold: '#d8bd78',
        // Seiten-Hintergrund-Familie (Theme-Farbe #0b0710).
        occult: {
          950: '#0b0710',
        },
      },
    },
  },
  corePlugins: {
    preflight: true,
  },
  plugins: [],
};
