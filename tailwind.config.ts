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
					primary: '#ffffff', // White
					'primary-content': '#000000', // Black
					secondary: '#2a2a2a', // Dark Gray
					'secondary-content': '#ffffff', // White
					accent: '#555555', // Gray
					'accent-content': '#ffffff', // White
					neutral: '#1a1a1a', // Neutral Dark
					'neutral-content': '#a6adbb',
					'base-100': '#0f0f0f', // Very Dark Gray
					'base-200': '#050505', // Almost Black
					'base-300': '#000000', // Pure Black
					'base-content': '#ffffff', // White
					info: '#0000ff',
					'info-content': '#c6dbff',
					success: '#00ff00',
					'success-content': '#001600',
					warning: '#ffff00',
					'warning-content': '#161600',
					error: '#ff0000',
					'error-content': '#160000',

					// custom colours
					'--discord': '64.74% 0.1243 270.62' // discord blue
				}
			}
		]
	}
} satisfies Config;
