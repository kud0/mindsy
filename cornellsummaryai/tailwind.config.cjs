/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'Roboto',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif',
  				'Apple Color Emoji',
  				'Segoe UI Emoji',
  				'Segoe UI Symbol',
  				'Noto Color Emoji'
  			],
  			excalifont: ['Excalifont', 'cursive']
  		},
  		typography: {
  			DEFAULT: {
  				css: {
  					maxWidth: 'none',
  					color: '#374151',
  					lineHeight: '1.75',
  					fontSize: '1.125rem',
  					h1: {
  						color: '#111827',
  						fontWeight: '800',
  						fontSize: '2.25rem',
  						marginTop: '2rem',
  						marginBottom: '1rem'
  					},
  					h2: {
  						color: '#111827',
  						fontWeight: '700',
  						fontSize: '1.875rem',
  						marginTop: '2rem',
  						marginBottom: '1rem'
  					},
  					h3: {
  						color: '#111827',
  						fontWeight: '600',
  						fontSize: '1.5rem',
  						marginTop: '1.5rem',
  						marginBottom: '0.75rem'
  					},
  					h4: {
  						color: '#111827',
  						fontWeight: '600',
  						fontSize: '1.25rem',
  						marginTop: '1.5rem',
  						marginBottom: '0.75rem'
  					},
  					p: {
  						marginTop: '1.25rem',
  						marginBottom: '1.25rem'
  					},
  					a: {
  						color: '#2563eb',
  						textDecoration: 'underline',
  						fontWeight: '500',
  						'&:hover': {
  							color: '#1d4ed8'
  						}
  					},
  					blockquote: {
  						fontWeight: '500',
  						fontStyle: 'italic',
  						color: '#374151',
  						borderLeftWidth: '0.25rem',
  						borderLeftColor: '#d1d5db',
  						quotes: '\\\\\\\\201C""\\\\\\\\201D""\\\\\\\\2018""\\\\\\\\2019"',
  						marginTop: '1.6rem',
  						marginBottom: '1.6rem',
  						paddingLeft: '1rem'
  					},
  					'blockquote p:first-of-type::before': {
  						content: 'open-quote'
  					},
  					'blockquote p:last-of-type::after': {
  						content: 'close-quote'
  					},
  					code: {
  						color: '#dc2626',
  						fontWeight: '600',
  						fontSize: '0.875rem',
  						backgroundColor: '#f3f4f6',
  						paddingLeft: '0.25rem',
  						paddingRight: '0.25rem',
  						paddingTop: '0.125rem',
  						paddingBottom: '0.125rem',
  						borderRadius: '0.25rem'
  					},
  					'code::before': {
  						content: ''
  					},
  					'code::after': {
  						content: ''
  					},
  					pre: {
  						color: '#e5e7eb',
  						backgroundColor: '#1f2937',
  						overflowX: 'auto',
  						fontSize: '0.875rem',
  						lineHeight: '1.7142857',
  						marginTop: '1.7142857em',
  						marginBottom: '1.7142857em',
  						borderRadius: '0.375rem',
  						paddingTop: '0.8571429em',
  						paddingRight: '1.1428571em',
  						paddingBottom: '0.8571429em',
  						paddingLeft: '1.1428571em'
  					},
  					'pre code': {
  						backgroundColor: 'transparent',
  						borderWidth: '0',
  						borderRadius: '0',
  						padding: '0',
  						fontWeight: '400',
  						color: 'inherit',
  						fontSize: 'inherit',
  						fontFamily: 'inherit',
  						lineHeight: 'inherit'
  					},
  					ul: {
  						listStyleType: 'disc',
  						paddingLeft: '1.625rem',
  						marginTop: '1.25rem',
  						marginBottom: '1.25rem'
  					},
  					ol: {
  						listStyleType: 'decimal',
  						paddingLeft: '1.625rem',
  						marginTop: '1.25rem',
  						marginBottom: '1.25rem'
  					},
  					'ul > li': {
  						paddingLeft: '0.375rem',
  						marginTop: '0.5rem',
  						marginBottom: '0.5rem'
  					},
  					'ol > li': {
  						paddingLeft: '0.375rem',
  						marginTop: '0.5rem',
  						marginBottom: '0.5rem'
  					},
  					'li > p': {
  						marginTop: '0.75rem',
  						marginBottom: '0.75rem'
  					},
  					table: {
  						width: '100%',
  						tableLayout: 'auto',
  						textAlign: 'left',
  						marginTop: '2rem',
  						marginBottom: '2rem',
  						fontSize: '0.875rem',
  						lineHeight: '1.7142857'
  					},
  					thead: {
  						borderBottomWidth: '1px',
  						borderBottomColor: '#d1d5db'
  					},
  					'thead th': {
  						color: '#111827',
  						fontWeight: '600',
  						verticalAlign: 'bottom',
  						paddingRight: '0.5714286em',
  						paddingBottom: '0.5714286em',
  						paddingLeft: '0.5714286em'
  					},
  					'tbody tr': {
  						borderBottomWidth: '1px',
  						borderBottomColor: '#e5e7eb'
  					},
  					'tbody td': {
  						verticalAlign: 'baseline',
  						paddingTop: '0.5714286em',
  						paddingRight: '0.5714286em',
  						paddingBottom: '0.5714286em',
  						paddingLeft: '0.5714286em'
  					},
  					hr: {
  						borderColor: '#d1d5db',
  						borderTopWidth: '1px',
  						marginTop: '3rem',
  						marginBottom: '3rem'
  					},
  					img: {
  						marginTop: '2rem',
  						marginBottom: '2rem',
  						borderRadius: '0.5rem'
  					}
  				}
  			},
  			lg: {
  				css: {
  					fontSize: '1.125rem',
  					lineHeight: '1.7777778',
  					h1: {
  						fontSize: '2.6666667em',
  						marginTop: '0',
  						marginBottom: '0.8333333em',
  						lineHeight: '1'
  					},
  					h2: {
  						fontSize: '2em',
  						marginTop: '1.5555556em',
  						marginBottom: '0.8888889em',
  						lineHeight: '1.1111111'
  					},
  					h3: {
  						fontSize: '1.5555556em',
  						marginTop: '1.6em',
  						marginBottom: '0.6666667em',
  						lineHeight: '1.2222222'
  					},
  					h4: {
  						marginTop: '1.7777778em',
  						marginBottom: '0.4444444em',
  						lineHeight: '1.5555556'
  					},
  					p: {
  						marginTop: '1.3333333em',
  						marginBottom: '1.3333333em'
  					},
  					blockquote: {
  						marginTop: '1.7777778em',
  						marginBottom: '1.7777778em',
  						paddingLeft: '1.1111111em'
  					},
  					pre: {
  						fontSize: '0.8888889em',
  						lineHeight: '1.75',
  						marginTop: '2em',
  						marginBottom: '2em',
  						borderRadius: '0.375rem',
  						paddingTop: '1em',
  						paddingRight: '1.5em',
  						paddingBottom: '1em',
  						paddingLeft: '1.5em'
  					}
  				}
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
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
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
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
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		}
  	}
  },
  plugins: [
    require('@tailwindcss/typography'),
      require("tailwindcss-animate")
],
} 