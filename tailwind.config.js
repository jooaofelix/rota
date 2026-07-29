/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefaf6",
          100: "#d4f1e7",
          200: "#a9e3cf",
          300: "#78cfb3",
          400: "#4bb595",
          500: "#2f9a7c",
          600: "#217c64",
          700: "#1c6352",
          800: "#194f43",
          900: "#154238",
        },
        cream: {
          50: "#fffdf9",
          100: "#fff7eb",
          200: "#ffedd0",
        },
        feeling: {
          great: "#4bb595",
          good: "#7fc9e0",
          neutral: "#c9c2e8",
          tired: "#f4c86b",
          anxious: "#f0a35d",
          sad: "#8fa3c9",
          angry: "#e08a8a",
        },
      },
      fontFamily: {
        sans: ["Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 2px 12px rgba(20, 60, 50, 0.08)",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease-out both",
        "fade-in": "fadeIn 0.7s ease-out both",
      },
    },
  },
  plugins: [],
};
