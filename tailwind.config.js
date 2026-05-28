/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      // LibreVS theme layer: custom industrial open-source palette overrides.
      colors: {
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#121820",
        },
        emerald: {
          50: "#e6fcf4",
          100: "#c2f7e4",
          500: "#2ee59d",
          700: "#1fc282",
          800: "#179c68",
          900: "#0f6e4a",
        },
        violet: {
          50: "#f0f7f7",
          100: "#d9eae9",
          200: "#b2d5d3",
          300: "#80b8b6",
          800: "#0a6e6b",
          900: "#074f4d",
        },
        indigo: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          200: "#bcccdc",
          900: "#102a43",
        },
        blue: {
          50: "#f5f7fa",
          200: "#e4e7eb",
          700: "#0284c7",
          800: "#2ee59d",
          900: "#0c4a6e",
        },
      },
    },
  },
};
