const limits = {
  browser: {
    browserTimeSecondsLimit: 'unlimited',
    browserTimeSecondsIncluded: 36000,
    usedBrowserTimeSeconds: 15.654
  }
};
function formatSeconds(seconds) {
		if (seconds == null) return '0s';
		if (typeof seconds === 'string' && Number.isNaN(Number(seconds))) return seconds;
		const secs = Number(seconds);
		if (Number.isNaN(secs)) return '0s';
		const h = Math.floor(secs / 3600);
		const m = Math.floor((secs % 3600) / 60);
		const s = Math.floor(secs % 60);

		const parts = [];
		if (h > 0) parts.push(`${h}h`);
		if (m > 0) parts.push(`${m}m`);
		if (s > 0 || parts.length === 0) parts.push(`${s}s`);
		return parts.join(' ');
}
console.log(formatSeconds(limits.browser.usedBrowserTimeSeconds));
console.log(formatSeconds(0.4));
console.log(formatSeconds("unlimited"));
