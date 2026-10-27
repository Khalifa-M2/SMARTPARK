/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10213a",
        brand: "#2563eb",
        mint: "#10b981"
      },
      boxShadow: {
        panel: "0 16px 50px rgba(15, 23, 42, .07)"
      }
    }
  },
  plugins: []
};
