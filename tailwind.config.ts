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
