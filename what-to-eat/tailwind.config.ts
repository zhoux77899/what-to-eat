import forms from "@tailwindcss/forms";
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "./messages/**/*.json"],
  theme: {
    extend: {
      colors: {
        border: "var(--color-outline)",
        input: "var(--color-outline)",
        ring: "var(--color-focus)",
        background: "var(--color-kitchen)",
        foreground: "var(--color-ink)",
        muted: "var(--color-paper)",
        "muted-foreground": "var(--color-ink-muted)",
        primary: "var(--color-primary)",
        "primary-foreground": "var(--color-surface)",
        secondary: "var(--color-paper)",
        "secondary-foreground": "var(--color-ink)",
        accent: "var(--color-info)",
        "accent-foreground": "var(--color-ink)",
        destructive: "var(--color-danger)",
        "destructive-foreground": "var(--color-surface)",
        card: "var(--color-surface)",
        "card-foreground": "var(--color-ink)"
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem"
      }
    }
  },
  plugins: [forms]
};

export default config;
