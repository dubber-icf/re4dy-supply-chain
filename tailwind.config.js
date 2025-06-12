// tailwind.config.js
module.exports = {
  content: [
    "./index.html",                 // root HTML
    "./*.{js,jsx,ts,tsx}",          // App.jsx, main.jsx, etc. in root
    "./components/**/*.{js,jsx,ts,tsx}"  // everything in /components
  ],
  theme: {
    extend: {
      colors: {
        border: "#e5e7eb"
      }
    }
  },
  plugins: []
};