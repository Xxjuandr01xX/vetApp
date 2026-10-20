import type { Config } from 'tailwindcss';
import flowbite from 'flowbite-react/tailwind';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    flowbite.content(),
  ],
  plugins: [flowbite.plugin()],
  theme: {
    extend: {
      colors: {
        vet: {
          primary: '#1E3A5F',
          'primary-light': '#3B82F6',
          accent: '#10B981',
          'accent-warm': '#F59E0B',
          danger: '#EF4444',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F3F4F6',
          subtle: '#F9FAFB',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
} satisfies Config;
