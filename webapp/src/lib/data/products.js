// webapp/src/lib/data/products.js

export const products = [
	{
		id: 'bull-statue',
		name: 'Wall Street Charging Bull Statue (Replica)',
		description: 'A high-quality replica of the iconic Wall Street bull.',
		price: 250000, // In cents ($2,500.00)
		currency: 'usd',
		category: 'Finance',
		image: 'https://images.unsplash.com/photo-1635350736475-c8cef4b21906?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'bear-kit',
		name: 'Bear Market Survival Kit',
		description: 'Everything you need to survive a market downturn.',
		price: 4999,
		currency: 'usd',
		category: 'Finance',
		image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'dip-button',
		name: 'Golden "Buy the Dip" Button',
		description: 'A literal golden button to remind you when to buy.',
		price: 1999,
		currency: 'usd',
		category: 'Finance',
		image: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'ticker-tape',
		name: 'Framed Stock Ticker Tape (1929 Crash)',
		description: 'A piece of history for your office wall.',
		price: 45000,
		currency: 'usd',
		category: 'Finance',
		image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'qe-press',
		name: 'Quantitative Easing Printing Press',
		description: 'Desktop model. Does not actually print legal tender.',
		price: 8800,
		currency: 'usd',
		category: 'Finance',
		image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'bitcoin-coin',
		name: '1 Bitcoin (Physical Commemorative Coin)',
		description: 'Looks like gold, worth much less. Physical coin only.',
		price: 1500,
		currency: 'usd',
		category: 'Crypto',
		image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'ethereum-cert',
		name: '1 Ethereum (Digital Certificate)',
		description: 'Mock ownership certificate for one Ether.',
		price: 120000,
		currency: 'usd',
		category: 'Crypto',
		image: 'https://images.unsplash.com/photo-1622790698141-94e30457ef12?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'doge-plushie',
		name: 'Dogecoin Plushie',
		description: 'Much wow, very soft. To the moon!',
		price: 2499,
		currency: 'usd',
		category: 'Crypto',
		image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'hodl-hoodie',
		name: 'HODL Hoodie',
		description: 'Stay warm while your portfolio freezes.',
		price: 5500,
		currency: 'usd',
		category: 'Crypto',
		image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'pixel-bull-nft',
		name: 'NFT of a Pixelated Bull',
		description: 'Extremely rare digital art (not really).',
		price: 1000000,
		currency: 'usd',
		category: 'Crypto',
		image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'runes-keychain',
		name: 'Svelte 5 "Runes" Keychain',
		description: 'Reactive keychain for the modern web dev.',
		price: 800,
		currency: 'usd',
		category: 'Tech',
		image: 'https://images.unsplash.com/photo-1584931423298-c576fda54bd2?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'agent-brain',
		name: 'Autonomous Agent Brain',
		description: 'A circuit board model representing the future.',
		price: 12000,
		currency: 'usd',
		category: 'Tech',
		image: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'hello-world-neon',
		name: '"Hello World" Neon Sign',
		description: 'The classic programmer greeting in glowing glass.',
		price: 7500,
		currency: 'usd',
		category: 'Tech',
		image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'mech-keyboard',
		name: 'Mechanical Keyboard (Blue Switches)',
		description: 'Extremely loud typing for maximum productivity.',
		price: 13000,
		currency: 'usd',
		category: 'Tech',
		image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'satoshi-floppy',
		name: 'Vintage Floppy Disk (Signed)',
		description: 'Allegedly signed by Satoshi Nakamoto.',
		price: 100000000,
		currency: 'usd',
		category: 'Tech',
		image: 'https://images.unsplash.com/photo-1591405351990-4726e331f141?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'simulation-service',
		name: '1 Hour Virtual Simulation Service (Mock)',
		description: 'Pick the brain of an agentic simulation.',
		price: 10000,
		currency: 'usd',
		category: 'Lifestyle',
		image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'engineer-mug',
		name: '"Trust Me, I\'m an Engineer" Mug',
		description: 'Perfect for debugging or ignoring warnings.',
		price: 1400,
		currency: 'usd',
		category: 'Lifestyle',
		image: 'https://images.unsplash.com/photo-1517256673644-36ad11246d21?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'secret-sauce',
		name: "Nick's Secret Sauce (Digital Guide)",
		description: 'The blueprint for fintech success.',
		price: 2900,
		currency: 'usd',
		category: 'Lifestyle',
		image: 'https://images.unsplash.com/photo-1471897488648-5eae4ac6686b?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'time-machine',
		name: 'Time Machine (Beta)',
		description: 'Limited edition. Only travels forward at 1s/s.',
		price: 500000000,
		currency: 'usd',
		category: 'Imaginary',
		image: 'https://images.unsplash.com/photo-1501139083538-0139583c060f?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'invisible-cloak',
		name: 'Invisible Cloak (Clearance)',
		description: 'You literally cannot see it. That\'s the point.',
		price: 99900,
		currency: 'usd',
		category: 'Imaginary',
		image: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'magic-money',
		name: 'Bag of Magic Internet Money',
		description: 'It comes and goes with the wind.',
		price: 100,
		currency: 'usd',
		category: 'Imaginary',
		image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'liquid-liquidity',
		name: 'Jar of Liquid Liquidity',
		description: 'For those moments when your assets are frozen.',
		price: 1250,
		currency: 'usd',
		category: 'Imaginary',
		image: 'https://images.unsplash.com/photo-1555529669-2269763671c0?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'infinite-loop',
		name: 'Infinite Loop',
		description: 'A physical representation of code that never ends.',
		price: 500,
		currency: 'usd',
		category: 'Imaginary',
		image: 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?auto=format&fit=crop&q=80&w=600&h=400'
	},
	{
		id: 'everything-app',
		name: 'The "Everything" App Access Key',
		description: 'One key to rule them all.',
		price: 99,
		currency: 'usd',
		category: 'Imaginary',
		image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&q=80&w=600&h=400'
	}
];
