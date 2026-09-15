/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#10182B', 800: '#161F36', 700: '#1C2740' },
        canvas: '#F6F4EF',
        line: '#E3DFD3',
        teal: { 50: '#EAF3F1', 100: '#CFE4DF', 500: '#2A7A6C', 600: '#1F6F63', 700: '#175650' },
        ochre: { 50: '#FBF1E3', 500: '#C98A3E', 600: '#AD7130' },
        critical: { 50: '#FBEAE6', 500: '#B4432F', 600: '#93341F' },
        success: { 50: '#E9F3EE', 500: '#2F7D5C', 600: '#256349' },
        ink2: '#1A1F2B',
        muted: '#5B6472',
      },
      fontFamily: {
        serif: ['"Newsreader"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(16,24,43,0.06)',
      },
      borderRadius: {
        sm: '4px',
      },
    },
  },
  plugins: [],
};
