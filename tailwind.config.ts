import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── shadcn/ui color tokens ── */
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          /* ── Flup Primary Scale (Indigo) ── */
          "50":  "var(--color-primary-50)",
          "100": "var(--color-primary-100)",
          "200": "var(--color-primary-200)",
          "300": "var(--color-primary-300)",
          "400": "var(--color-primary-400)",
          "500": "var(--color-primary-500)",
          "600": "var(--color-primary-600)",
          "700": "var(--color-primary-700)",
          "800": "var(--color-primary-800)",
          "900": "var(--color-primary-900)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        /* ── Flup Surface Scale (Slate) ── */
        surface: {
          "50":  "var(--color-surface-50)",
          "100": "var(--color-surface-100)",
          "200": "var(--color-surface-200)",
          "300": "var(--color-surface-300)",
          "400": "var(--color-surface-400)",
          "500": "var(--color-surface-500)",
          "600": "var(--color-surface-600)",
          "700": "var(--color-surface-700)",
          "800": "var(--color-surface-800)",
          "900": "var(--color-surface-900)",
        },

        /* ── Flup Semantic Colors ── */
        success: {
          "50":  "var(--color-success-50)",
          "500": "var(--color-success-500)",
          "600": "var(--color-success-600)",
          "700": "var(--color-success-700)",
          DEFAULT: "var(--color-success-500)",
        },
        warning: {
          "50":  "var(--color-warning-50)",
          "500": "var(--color-warning-500)",
          "600": "var(--color-warning-600)",
          DEFAULT: "var(--color-warning-500)",
        },
        danger: {
          "50":  "var(--color-danger-50)",
          "500": "var(--color-danger-500)",
          "600": "var(--color-danger-600)",
          DEFAULT: "var(--color-danger-500)",
        },
        info: {
          "50":  "var(--color-info-50)",
          "500": "var(--color-info-500)",
          "600": "var(--color-info-600)",
          DEFAULT: "var(--color-info-500)",
        },

        /* ── App alias tokens ── */
        "bg-primary":    "var(--bg-primary)",
        "bg-card":       "var(--bg-card)",
        "bg-card-hover": "var(--bg-card-hover)",
        "text-primary":  "var(--text-primary)",
        "text-secondary":"var(--text-secondary)",
        "accent-green":  "var(--accent-green)",
        "accent-red":    "var(--accent-red)",
        "accent-amber":  "var(--accent-amber)",
        "accent-blue":   "var(--accent-blue)",
        "accent-purple": "var(--accent-purple)",

        sidebar: {
          DEFAULT:              "var(--sidebar)",
          foreground:           "var(--sidebar-foreground)",
          primary:              "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent:               "var(--sidebar-accent)",
          "accent-foreground":  "var(--sidebar-accent-foreground)",
          border:               "var(--sidebar-border)",
          ring:                 "var(--sidebar-ring)",
        },
      },

      borderRadius: {
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        xl:   "var(--radius-xl)",
        "2xl":"var(--radius-2xl)",
      },

      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },

      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
