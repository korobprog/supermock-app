import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C5CE7',
          foreground: '#FFFFFF'
        },
        secondary: {
          DEFAULT: '#00CEC9',
          foreground: '#031A1A'
        }
      }
    }
  },
  plugins: []
};

export default config;
