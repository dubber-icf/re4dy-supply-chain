// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // define a 'border' color so 'border-border' works
        border: '#e5e7eb'  // or whatever light grey you prefer
      }
    }
  },
  plugins: [],
}