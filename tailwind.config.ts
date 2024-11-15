import { fontFamily } from "tailwindcss/defaultTheme";
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import colors from "tailwindcss/colors";
const config: Config = {
    darkMode: ["class"],
    content: ["./src/**/*.{html,js,svelte,ts}"],
    safelist: ["dark"],
    theme: {
        // https://tailwindcss.com/docs/theme
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        // https://tailwindcss.com/docs/customizing-colors
        colors: {
            tahiti: {
                light: "#67e8f9",
                DEFAULT: "#06b6d4",
                dark: "#0e7490",
                100: "#cffafe",
                200: "#a5f3fc",
                300: "#67e8f9",
                400: "#22d3ee",
                500: "#06b6d4",
                600: "#0891b2",
                700: "#0e7490",
                800: "#155e75",
                900: "#164e63",
            },
            gray: {
                "50": "#f9fafb",
                "100": "#f3f4f6",
                "200": "#e5e7eb",
                "300": "#d1d5db",
                "400": "#9ca3af",
                "500": "#6b7280",
                "600": "#4b5563",
                "700": "#374151",
                "800": "#1f2937",
                "900": "#111827",
                "950": "#030712",
            },
            cyan: {
                "50": "#ecfeff",
                "100": "#cffafe",
                "200": "#a5f3fc",
                "300": "#67e8f9",
                "400": "#22d3ee",
                "500": "#06b6d4",
                "600": "#0891b2",
                "700": "#0e7490",
                "800": "#155e75",
                "900": "#164e63",
                "950": "#083344",
            },
            blue: {
                "50": "#eff6ff",
                "100": "#dbeafe",
                "200": "#bfdbfe",
                "300": "#93c5fd",
                "400": "#60a5fa",
                "500": "#3b82f6",
                "600": "#2563eb",
                "700": "#1d4ed8",
                "800": "#1e40af",
                "900": "#1e3a8a",
                "950": "#172554",
            },
            orange: {
                "50": "#fff7ed",
                "100": "#ffedd5",
                "200": "#fed7aa",
                "300": "#fdba74",
                "400": "#fb923c",
                "500": "#f97316",
                "600": "#ea580c",
                "700": "#c2410c",
                "800": "#9a3412",
                "900": "#7c2d12",
                "950": "#431407",
            },
        },
        extend: {
            colors: {
                border: "var(--border)",
                input: "var(--input)",
                ring: "var(--ring)",
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "var(--primary-foreground)",
                },
                secondary: {
                    DEFAULT: "var(--secondary)",
                    foreground: "var(--secondary-foreground)",
                },
                destructive: {
                    DEFAULT: "var(--destructive)",
                    foreground: "var(--destructive-foreground)",
                },
                muted: {
                    DEFAULT: "var(--muted)",
                    foreground: "var(--muted-foreground)",
                },
                accent: {
                    DEFAULT: "var(--accent)",
                    foreground: "var(--accent-foreground)",
                },
                popover: {
                    DEFAULT: "var(--popover)",
                    foreground: "var(--popover-foreground)",
                },
                card: {
                    DEFAULT: "var(--card)",
                    foreground: "var(--card-foreground)",
                },
                sidebar: {
                    DEFAULT: "var(--sidebar-background)",
                    foreground: "var(--sidebar-foreground)",
                    primary: "var(--sidebar-primary)",
                    "primary-foreground": "var(--sidebar-primary-foreground)",
                    accent: "var(--sidebar-accent)",
                    "accent-foreground": "var(--sidebar-accent-foreground)",
                    border: "var(--sidebar-border)",
                    ring: "var(--sidebar-ring)",
                },
                "chart-1": "var(--chart-1)",
                "chart-2": "var(--chart-2)",
                "chart-3": "var(--chart-3)",
                "chart-4": "var(--chart-4)",
                "chart-5": "var(--chart-5)",
            },
            borderRadius: {
                xl: "calc(var(--radius) + 4px)",
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            fontFamily: {
                sans: [...fontFamily.sans],
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--bits-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--bits-accordion-content-height)" },
                    to: { height: "0" },
                },
                "caret-blink": {
                    "0%,70%,100%": { opacity: "1" },
                    "20%,50%": { opacity: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "caret-blink": "caret-blink 1.25s ease-out infinite",
            },
        },
    },
    plugins: [tailwindcssAnimate],
};

export default config;
