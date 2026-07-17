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
    // 启用 DaisyUI 全部内置主题（自定义主题通过 CSS 变量运行时注入）
    themes: [
      "light",
      "dark",
      "cupcake",
      "bumblebee",
      "emerald",
      "corporate",
      "synthwave",
      "retro",
      "cyberpunk",
      "valentine",
      "halloween",
      "garden",
      "forest",
      "aqua",
      "lofi",
      "pastel",
      "fantasy",
      "wireframe",
      "black",
      "luxury",
      "dracula",
      "cmyk",
      "autumn",
      "business",
      "acid",
      "lemonade",
      "night",
      "coffee",
      "winter",
      "dim",
      "nord",
      "sunset",
    ],
    darkTheme: "dark",
  },
};
