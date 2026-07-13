import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "var(--bg-base)",
          alt: "var(--bg-base-alt)",
          "base-40": "var(--bg-base-40)",
          "base-56": "var(--bg-base-56)",
          "base-70": "var(--bg-base-70)",
          "base-86": "var(--bg-base-86)",
          "base-92": "var(--bg-base-92)"
        },
        accent: {
          gold: "var(--accent-gold)",
          "gold-bright": "var(--accent-gold-bright)",
          "gold-05": "var(--accent-gold-05)",
          "gold-10": "var(--accent-gold-10)",
          "gold-12": "var(--accent-gold-12)",
          "gold-30": "var(--accent-gold-30)",
          "gold-50": "var(--accent-gold-50)",
          "gold-60": "var(--accent-gold-60)",
          "gold-70": "var(--accent-gold-70)",
          blue: "var(--accent-blue)"
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)"
        },
        glass: {
          bg: "var(--glass-bg)",
          border: "var(--glass-border)",
          highlight: "var(--glass-highlight)"
        }
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)"
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)"
      },
      boxShadow: {
        "gold-glow": "var(--shadow-gold-glow)",
        "gold-soft": "var(--shadow-gold-soft)"
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-sc)", "system-ui", "sans-serif"],
        serif: ["var(--font-noto-serif-sc)", "serif"],
        cinzel: ["var(--font-cinzel)", "serif"]
      },
      backgroundImage: {
        "starfield-radial":
          "radial-gradient(circle at 20% 20%, var(--accent-blue-24), transparent 32%), radial-gradient(circle at 80% 12%, var(--accent-gold-10), transparent 26%), radial-gradient(circle at 50% 90%, var(--accent-blue-18), transparent 34%)"
      }
    }
  },
  plugins: []
};

export default config;
