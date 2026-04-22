/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00488d",
        "primary-container": "#005fb8",
        tertiary: "#005338",
        surface: "#f8f9fa",
        "surface-container-low": "#f3f4f5",
        "surface-container-highest": "#e1e3e4",
        "surface-container-lowest": "#ffffff",
        on_surface: "#191c1d",
        on_secondary_container: "#586579",
        outline_variant: "#c2c6d4"
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'ambient': '0 -4px 40px 0px rgba(88, 101, 121, 0.08)',
        'inner-vault': 'inset 0 2px 10px rgba(0, 72, 141, 0.1)', // Subtle 10% opacity primary inner-shadow
      }
    },
  },
  plugins: [],
}
