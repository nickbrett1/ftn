module.exports = {
  ci: {
    collect: {
      url: 'http://localhost:8787',
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--no-sandbox',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'service-worker': 'off',
        // Awaiting support by Cloudflare for server side logic on Pages
        // Maybe try header addition in workers?
        // https://zhuhaow.me/deploy-full-nextjs-site-on-cloudflare-are-we-there-yet
        // https://github.com/vercel/next.js/discussions/34179
        'csp-xss': 'off',
      },
    },
  },
};
