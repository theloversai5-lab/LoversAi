// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        loverai: {
          deep: "#0a0604",
          dark: "#0f0a07",
          base: "#1a100b",
          card: "#1c120c",
          surface: "#291e16",
          elevated: "#33251c",
          gold: "#e6c6b2",
          "gold-bright": "#e6c6b2",
        },
      },
      fontFamily: {
        heading: ["DM Serif Display", "Georgia", "serif"],
        body: ["Inter", "Poppins", "system-ui", "sans-serif"],
        display: ["Playfair Display", "serif"],
      },
      animation: {
        gradient: "gradient 3s ease infinite",
        fadeInUp: "fadeInUp 0.5s ease-out",
        fadeInDown: "fadeInDown 0.4s ease-out",
        slideInLeft: "slideInLeft 0.5s ease-out",
        slideInRight: "slideInRight 0.5s ease-out",
        scaleIn: "scaleIn 0.4s ease-out",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        gradient: {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center",
          },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { "background-position": "-200% 0" },
          "100%": { "background-position": "200% 0" },
        },
        pulseGlow: {
          "0%, 100%": { "box-shadow": "0 0 20px rgba(225,195,135,0.1)" },
          "50%": { "box-shadow": "0 0 40px rgba(225,195,135,0.2)" },
        },
      },
      backdropBlur: {
        glass: "20px",
        "glass-strong": "30px",
      },
    },
  },
  plugins: [],
};
// Trigger Tailwind rebuild 2
