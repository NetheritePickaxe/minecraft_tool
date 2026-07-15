import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,html,scss}"],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    // 明暗双主题，通过 <html data-theme="..."> 切换
    themes: ["light", "dark"],
    darkTheme: "dark",
  },
};
