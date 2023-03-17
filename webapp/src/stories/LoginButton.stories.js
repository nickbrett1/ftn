import LoginButton from '$lib/components/LoginButton.svelte';

export default {
	title: 'LoginButton',
	component: LoginButton
};

export const LoggedIn = {
	render: (args) => ({
		Component: LoginButton,
		props: args
	}),
	args: {
		label: 'Home'
	}
};

export const LoggedOut = {
	render: (args) => ({
		Component: LoginButton,
		props: args
	}),
	args: {
		label: 'Login'
	}
};
