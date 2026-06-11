import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // === VitaLog 品牌色（深浅主题通用）===
        night: "#1A1A1F",
        slate: "#2C2C32",
        amber: {
          DEFAULT: "#F2A65A",
          bright: "#FFB86C",
        },
        starlight: "#FFFFFF",
        forest: "#0F0F14",

        // === 主题感知色彩（基于 CSS 变量，随主题切换）===
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",

        // === 兼容旧 primary/accent 调色板（重定向到 VitaLog 琥珀色系）===
        // 让现有组件无缝接入 Stargazer 主题
        primary: {
          50: "#fdf7ee",
          100: "#fbeed7",
          200: "#f6dbae",
          300: "#f1c47d",
          400: "#edb056",
          500: "#F2A65A",   // 琥珀主色
          600: "#E08B3A",
          700: "#B86E2C",
          800: "#8E5523",
          900: "#5F3917",
          950: "#3a220e",
        },
        accent: {
          50: "#fff4e5",
          100: "#ffe5c2",
          200: "#ffcb85",
          300: "#ffb86c",   // 亮琥珀
          400: "#ffa64d",
          500: "#FFB86C",
          600: "#E89B4A",
          700: "#B87635",
          800: "#8C5A2A",
          900: "#5C3A1B",
          950: "#331e0e",
        },
      },
      scale: {
        "102": "1.02",
      },
      backgroundImage: {
        // 深色主题：深邃夜空渐变
        "night-sky":
          "linear-gradient(180deg, #0A0A0F 0%, #1A1A1F 32%, #23202B 58%, #2C2433 78%, #3D2E2A 100%)",
        // 浅色主题：暖白渐变
        "day-sky":
          "linear-gradient(180deg, #FAF8F4 0%, #F5F1E8 60%, #EFE9DA 100%)",
        // 银河光带（深色）
        "milky-way":
          "radial-gradient(ellipse 80% 40% at 50% 20%, rgba(180,150,200,0.18), transparent 70%)",
        // 城市光晕（深色，更柔和）
        "city-horizon":
          "linear-gradient(180deg, transparent 0%, rgba(242,166,90,0.10) 50%, rgba(255,184,108,0.22) 100%)",
        // 卡片暖色（深色专用）
        "card-warm":
          "linear-gradient(135deg, rgba(44,44,50,0.55), rgba(26,26,31,0.85))",
      },
      boxShadow: {
        amber: "0 8px 24px rgba(255, 184, 108, 0.35)",
        "amber-hover": "0 10px 28px rgba(255, 184, 108, 0.50)",
        glow: "0 0 40px rgba(255, 184, 108, 0.2)",
        soft: "0 2px 12px rgba(0, 0, 0, 0.06)",
        "soft-lg": "0 8px 32px rgba(0, 0, 0, 0.08)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "star-twinkle": "starTwinkle 3s ease-in-out infinite",
        "meteor-fall": "meteorFall 1.2s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        starTwinkle: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
        meteorFall: {
          "0%": {
            transform: "translate(0,0) rotate(var(--angle,45deg))",
            opacity: "1",
          },
          "100%": {
            transform: "translate(var(--dx,300px), var(--dy,300px)) rotate(var(--angle,45deg))",
            opacity: "0",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
