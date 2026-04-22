export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        soc: {
          bg: "#0a0e1a",
          panel: "#111827",
          border: "#1f2937",
          cyan: "#06b6d4",
          red: "#ef4444",
          yellow: "#f59e0b",
          purple: "#8b5cf6"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(6, 182, 212, 0.25), 0 24px 80px rgba(2, 132, 199, 0.18)"
      },
      animation: {
        "blocked-shake": "blocked-shake 0.3s ease-in-out",
        pulseDot: "pulseDot 1.2s infinite",
        "grid-pan": "grid-pan 16s linear infinite"
      },
      keyframes: {
        "blocked-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" }
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.92)" }
        },
        "grid-pan": {
          "0%": { transform: "translate3d(0,0,0)" },
          "100%": { transform: "translate3d(-120px,-120px,0)" }
        }
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "ui-sans-serif", "system-ui"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular"]
      }
    }
  },
  plugins: []
};

