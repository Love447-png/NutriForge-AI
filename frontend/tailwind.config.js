/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Avenir Next", "Trebuchet MS", "sans-serif"],
        body: ["Avenir", "Helvetica Neue", "sans-serif"],
      },
      colors: {
        shell: "#f4f7fb",
        ink: "#102033",
        mint: "#7ce7c4",
        coral: "#ff8b74",
        ocean: "#84b7ff",
      },
      boxShadow: {
        glass: "0 24px 80px rgba(16, 32, 51, 0.12)",
      },
      backdropBlur: {
        xl: "20px",
      },
    },
  },
  plugins: [],
};
