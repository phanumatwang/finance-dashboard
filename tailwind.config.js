import daisyui from "daisyui";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: "var(--color-primary)",
          secondary: "var(--color-secondary)",
          accent: "var(--color-nav-active)",
          neutral: "var(--color-bg)",
          "base-100": "var(--color-bg)",
          info: "#3ABFF8",
          success: "var(--color-success)",
          warning: "#FBBD23",
          error: "var(--color-danger)",
        },
      },
    ],
  },
};
