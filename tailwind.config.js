// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'minecraft-green': '#55FF55',
        'minecraft-blue': '#5555FF',
        'minecraft-red': '#FF5555',
        'minecraft-dark': '#2D2D2D',
        'minecraft-dirt': '#8B6B4D',
        'minecraft-grass': '#5AAB5A',
        'ndiicloud': {
          primary: '#55FF55',
          dark: '#1A1A1A',
          accent: '#FFAA00'
        }
      },
      fontFamily: {
        'minecraft': ['Minecraftia', 'monospace'],
        'pixel': ['"Press Start 2P"', 'cursive']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
