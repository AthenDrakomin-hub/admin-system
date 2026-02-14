/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0052D9',
          50: '#E6F0FF',
          100: '#CCE1FF',
          200: '#99C3FF',
          300: '#66A5FF',
          400: '#3387FF',
          500: '#0052D9',
          600: '#0042AD',
          700: '#003182',
          800: '#002156',
          900: '#00112B',
        },
        success: '#52c41a',
        warning: '#faad14',
        error: '#f5222d',
      },
    },
  },
  plugins: [],
};
