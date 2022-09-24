module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      staticDistDir: './out',
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'service-worker': 'off',
        // Awaiting support by Cloudflare for Pages
        // https://zhuhaow.me/deploy-full-nextjs-site-on-cloudflare-are-we-there-yet
        // https://github.com/vercel/next.js/discussions/34179
        'css-xss': 'off',
      },
    },
  },
};
