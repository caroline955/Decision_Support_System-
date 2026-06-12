/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(15,23,42,0.04)",
        card: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "scale(.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        fadeIn: "fadeIn .15s ease-out",
      },
    },
  },
  safelist: [
    // dynamic accent classes
    { pattern: /(bg|text|border|from|to|via)-(brand|emerald|rose|amber|violet|sky|indigo)-(50|100|200|300|400|500|600|700|800|900)/ },
  ],
  plugins: [],
};
