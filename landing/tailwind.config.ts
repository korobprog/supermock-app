import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f1ff',
          100: '#dcd8ff',
          200: '#b4aaff',
          300: '#8c7dff',
          400: '#6450ff',
          500: '#3d23ff',
          600: '#301bcc',
          700: '#231399',
          800: '#170c66',
          900: '#0a0433'
        }
      }
    }
  },
  plugins: []
};

export default config;
