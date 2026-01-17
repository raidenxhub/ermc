import type { Config } from 'tailwindcss';
import daisyui from 'daisyui';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		container: {
			center: true,
			padding: '2rem'
		},
		extend: {
			fontFamily: {
				quicksand: ['Quicksand', 'sans-serif']
			},
			colors: {
				discord: 'oklch(var(--discord) / <alpha-value>)' // discord blue
			}
		}
	},

	plugins: [daisyui],

	daisyui: {
		themes: [
			{
				ermc: {
					primary: '#003366',
					'primary-content': '#ffffff', // white (placeholder)
					secondary: '#d8c8a0',
					'secondary-content': '#ffffff', // white (placeholder)
					accent: '#d8c8a0', // levant gold
					'accent-content': '#ffffff', // white
					neutral: '#191e24', // light gray
					'neutral-content': '#a6adbb',
					'base-100': '#191e24', // light gray
					'base-200': '#15191e', // gray
					'base-300': '#000000', // black
					'base-content': '#ffffff', // white (placeholder)
					info: '#0000ff',
					'info-content': '#c6dbff',
					success: '#00ff00',
					'success-content': '#001600',
					warning: '#00ff00',
					'warning-content': '#001600',
					error: '#ff0000',
					'error-content': '#160000',

					// custom colours
					'--discord': '64.74% 0.1243 270.62' // discord blue
				}
			}
		]
	}
} satisfies Config;
