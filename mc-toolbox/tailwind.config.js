import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,html,scss}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Roboto",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    // MD3 风格主题：Minecraft 绿色 seed 生成 tonal palette
    // 颜色 token 对应 Material Design 3 规范
    themes: [
      {
        light: {
          primary: "#386A20",
          "primary-content": "#FFFFFF",
          secondary: "#B7F597",
          "secondary-content": "#042100",
          accent: "#386666",
          "accent-content": "#FFFFFF",
          neutral: "#181D17",
          "neutral-content": "#F7FBF0",
          "base-100": "#F7FBF0",
          "base-200": "#DFE4D5",
          "base-300": "#C3C8BB",
          info: "#386666",
          "info-content": "#FFFFFF",
          success: "#386A20",
          "success-content": "#FFFFFF",
          warning: "#835400",
          "warning-content": "#FFFFFF",
          error: "#BA1A1A",
          "error-content": "#FFFFFF",
          "--radius-box": "0.75rem",
          "--radius-field": "0.25rem",
          "--radius-selector": "0.25rem",
        },
      },
      {
        dark: {
          primary: "#9CD87E",
          "primary-content": "#0E3900",
          secondary: "#1F5109",
          "secondary-content": "#B7F597",
          accent: "#A0CFCF",
          "accent-content": "#003737",
          neutral: "#E0E4D8",
          "neutral-content": "#10140E",
          "base-100": "#10140E",
          "base-200": "#1A1F16",
          "base-300": "#2A2F25",
          info: "#A0CFCF",
          "info-content": "#003737",
          success: "#9CD87E",
          "success-content": "#0E3900",
          warning: "#FFB87C",
          "warning-content": "#4A2800",
          error: "#FFB4AB",
          "error-content": "#690005",
          "--radius-box": "0.75rem",
          "--radius-field": "0.25rem",
          "--radius-selector": "0.25rem",
        },
      },
    ],
    darkTheme: "dark",
  },
};
