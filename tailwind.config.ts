import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			// RDY Design System - Warm beige theme with orange accent
  			rdy: {
  				white: '#F0EAE0', // warm cream background
  				black: '#1A1A1A',
  				gray: {
  					'100': '#E6E0D5', // warm light beige (cards, secondary surfaces)
  					'200': '#D5CEC2', // warm border color
  					'300': '#BDB5A8', // warm medium gray
  					'400': '#9C9085', // warm muted text
  					'500': '#6E6560', // warm body text
  					'600': '#4D4540', // warm dark text
  					'900': '#2A2520'  // warm near-black
  				},
  				orange: {
  					'400': '#FFA766',
  					'500': '#FF8C42',
  					'600': '#E67A35'
  				},
  				success: '#4CAF50',
  				error: '#F44336'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-montserrat)',
  				'var(--font-geist-sans)',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-geist-mono)',
  				'monospace'
  			]
  		},
  		fontSize: {
  			'rdy-xs': ['12px', { lineHeight: '16px', letterSpacing: '0.05em' }],
  			'rdy-sm': ['14px', { lineHeight: '20px', letterSpacing: '0.05em' }],
  			'rdy-base': ['16px', { lineHeight: '24px' }],
  			'rdy-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em' }],
  			'rdy-xl': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
  			'rdy-2xl': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em' }]
  		},
  		spacing: {
  			'rdy-xs': '8px',
  			'rdy-sm': '16px',
  			'rdy-md': '24px',
  			'rdy-lg': '32px',
  			'rdy-xl': '48px',
  			'rdy-2xl': '64px'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
