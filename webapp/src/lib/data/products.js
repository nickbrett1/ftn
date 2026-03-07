// webapp/src/lib/data/products.js
import bullStatue from '$lib/images/bull-statue.png?as=run';
import bearKit from '$lib/images/bear-kit.png?as=run';
import dipButton from '$lib/images/dip-button.png?as=run';
import tickerTape from '$lib/images/ticker-tape.png?as=run';
import qePress from '$lib/images/qe-press.png?as=run';
import bitcoinCoin from '$lib/images/bitcoin-coin.png?as=run';
import ethereumCert from '$lib/images/ethereum-cert.png?as=run';
import dogePlushie from '$lib/images/doge-plushie.png?as=run';
import hodlHoodie from '$lib/images/hodl-hoodie.png?as=run';
import pixelBullNft from '$lib/images/pixel-bull-nft.png?as=run';
import runesKeychain from '$lib/images/runes-keychain.png?as=run';
import agentBrain from '$lib/images/agent-brain.png?as=run';
import helloWorldNeon from '$lib/images/hello-world-neon.png?as=run';
import mechKeyboard from '$lib/images/mech-keyboard.png?as=run';
import satoshiFloppy from '$lib/images/satoshi-floppy.png?as=run';
import simulationService from '$lib/images/simulation-service.png?as=run';
import engineerMug from '$lib/images/engineer-mug.png?as=run';
import secretSauce from '$lib/images/secret-sauce.png?as=run';
import timeMachine from '$lib/images/time-machine.png?as=run';
import invisibleCloak from '$lib/images/invisible-cloak.png?as=run';
import magicMoney from '$lib/images/magic-money.png?as=run';
import liquidLiquidity from '$lib/images/liquid-liquidity.png?as=run';
import infiniteLoop from '$lib/images/infinite-loop.png?as=run';
import everythingApp from '$lib/images/everything-app.png?as=run';

export const products = [
	{
		id: 'bull-statue',
		name: 'Wall Street Charging Bull Statue (Replica)',
		description: 'A high-quality replica of the iconic Wall Street bull.',
		price: 250000, // In cents ($2,500.00)
		currency: 'usd',
		category: 'Finance',
		image: bullStatue
	},
	{
		id: 'bear-kit',
		name: 'Bear Market Survival Kit',
		description: 'Everything you need to survive a market downturn.',
		price: 4999,
		currency: 'usd',
		category: 'Finance',
		image: bearKit
	},
	{
		id: 'dip-button',
		name: 'Golden "Buy the Dip" Button',
		description: 'A literal golden button to remind you when to buy.',
		price: 1999,
		currency: 'usd',
		category: 'Finance',
		image: dipButton
	},
	{
		id: 'ticker-tape',
		name: 'Framed Stock Ticker Tape (1929 Crash)',
		description: 'A piece of history for your office wall.',
		price: 45000,
		currency: 'usd',
		category: 'Finance',
		image: tickerTape
	},
	{
		id: 'qe-press',
		name: 'Quantitative Easing Printing Press',
		description: 'Desktop model. Does not actually print legal tender.',
		price: 8800,
		currency: 'usd',
		category: 'Finance',
		image: qePress
	},
	{
		id: 'bitcoin-coin',
		name: '1 Bitcoin (Physical Commemorative Coin)',
		description: 'Looks like gold, worth much less. Physical coin only.',
		price: 1500,
		currency: 'usd',
		category: 'Crypto',
		image: bitcoinCoin
	},
	{
		id: 'ethereum-cert',
		name: '1 Ethereum (Digital Certificate)',
		description: 'Mock ownership certificate for one Ether.',
		price: 120000,
		currency: 'usd',
		category: 'Crypto',
		image: ethereumCert
	},
	{
		id: 'doge-plushie',
		name: 'Dogecoin Plushie',
		description: 'Much wow, very soft. To the moon!',
		price: 2499,
		currency: 'usd',
		category: 'Crypto',
		image: dogePlushie
	},
	{
		id: 'hodl-hoodie',
		name: 'HODL Hoodie',
		description: 'Stay warm while your portfolio freezes.',
		price: 5500,
		currency: 'usd',
		category: 'Crypto',
		image: hodlHoodie
	},
	{
		id: 'pixel-bull-nft',
		name: 'NFT of a Pixelated Bull',
		description: 'Extremely rare digital art (not really).',
		price: 1000000,
		currency: 'usd',
		category: 'Crypto',
		image: pixelBullNft
	},
	{
		id: 'runes-keychain',
		name: 'Svelte 5 "Runes" Keychain',
		description: 'Reactive keychain for the modern web dev.',
		price: 800,
		currency: 'usd',
		category: 'Tech',
		image: runesKeychain
	},
	{
		id: 'agent-brain',
		name: 'Autonomous Agent Brain',
		description: 'A circuit board model representing the future.',
		price: 12000,
		currency: 'usd',
		category: 'Tech',
		image: agentBrain
	},
	{
		id: 'hello-world-neon',
		name: '"Hello World" Neon Sign',
		description: 'The classic programmer greeting in glowing glass.',
		price: 7500,
		currency: 'usd',
		category: 'Tech',
		image: helloWorldNeon
	},
	{
		id: 'mech-keyboard',
		name: 'Mechanical Keyboard (Blue Switches)',
		description: 'Extremely loud typing for maximum productivity.',
		price: 13000,
		currency: 'usd',
		category: 'Tech',
		image: mechKeyboard
	},
	{
		id: 'satoshi-floppy',
		name: 'Vintage Floppy Disk (Signed)',
		description: 'Allegedly signed by Satoshi Nakamoto.',
		price: 100000000,
		currency: 'usd',
		category: 'Tech',
		image: satoshiFloppy
	},
	{
		id: 'simulation-service',
		name: '1 Hour Virtual Simulation Service (Mock)',
		description: 'Pick the brain of an agentic simulation.',
		price: 10000,
		currency: 'usd',
		category: 'Lifestyle',
		image: simulationService
	},
	{
		id: 'engineer-mug',
		name: '"Trust Me, I\'m an Engineer" Mug',
		description: 'Perfect for debugging or ignoring warnings.',
		price: 1400,
		currency: 'usd',
		category: 'Lifestyle',
		image: engineerMug
	},
	{
		id: 'secret-sauce',
		name: "Nick's Secret Sauce (Digital Guide)",
		description: 'The blueprint for fintech success.',
		price: 2900,
		currency: 'usd',
		category: 'Lifestyle',
		image: secretSauce
	},
	{
		id: 'time-machine',
		name: 'Time Machine (Beta)',
		description: 'Limited edition. Only travels forward at 1s/s.',
		price: 500000000,
		currency: 'usd',
		category: 'Imaginary',
		image: timeMachine
	},
	{
		id: 'invisible-cloak',
		name: 'Invisible Cloak (Clearance)',
		description: 'You literally cannot see it. That\'s the point.',
		price: 99900,
		currency: 'usd',
		category: 'Imaginary',
		image: invisibleCloak
	},
	{
		id: 'magic-money',
		name: 'Bag of Magic Internet Money',
		description: 'It comes and goes with the wind.',
		price: 100,
		currency: 'usd',
		category: 'Imaginary',
		image: magicMoney
	},
	{
		id: 'liquid-liquidity',
		name: 'Jar of Liquid Liquidity',
		description: 'For those moments when your assets are frozen.',
		price: 1250,
		currency: 'usd',
		category: 'Imaginary',
		image: liquidLiquidity
	},
	{
		id: 'infinite-loop',
		name: 'Infinite Loop',
		description: 'A physical representation of code that never ends.',
		price: 500,
		currency: 'usd',
		category: 'Imaginary',
		image: infiniteLoop
	},
	{
		id: 'everything-app',
		name: 'The "Everything" App Access Key',
		description: 'One key to rule them all.',
		price: 99,
		currency: 'usd',
		category: 'Imaginary',
		image: everythingApp
	}
];
