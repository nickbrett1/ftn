export function load({ url }) {
	const redirectTo = url.searchParams.get('redirectTo') || '/';
	return {
		redirectTo
	};
}
