module.exports = {
  launch: {
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.HEADLESS === 'false' ? 500 : 0,
    devtools: process.env.HEADLESS === 'false',
    args: [
      '--window-size=1280,800',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
    defaultViewport: null
  },
  browserContext: 'default',
  server: {
    command: 'npm start',
    port: 3000,
    launchTimeout: 60000,
    protocol: 'http',
    usedPortAction: 'kill'
  }
};
