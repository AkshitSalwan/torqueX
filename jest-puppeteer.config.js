module.exports = {
  launch: {
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.HEADLESS === 'false' ? 500 : 0,
    devtools: process.env.HEADLESS === 'false',
    args: [
      '--window-size=1280,800',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security', // Allow CORS for testing
      '--disable-features=IsolateOrigins,site-per-process'
    ],
    defaultViewport: null
  },
  browserContext: 'default',
  // Only start server if testing locally (no BASE_URL provided)
  ...(process.env.BASE_URL ? {} : {
    server: {
      command: 'npm start',
      port: 3000,
      launchTimeout: 60000,
      protocol: 'http',
      usedPortAction: 'kill'
    }
  })
};
