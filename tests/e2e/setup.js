/**
 * E2E Test Setup for Puppeteer
 * This file configures the browser environment for end-to-end tests
 */

// Set default timeout for E2E tests (they take longer)
jest.setTimeout(30000);

// Global setup before all E2E tests
beforeAll(async () => {
  // Browser and page are automatically launched by jest-puppeteer
  console.log('🚀 Starting E2E test suite...');
});

// Global teardown after all E2E tests
afterAll(async () => {
  console.log('✅ E2E test suite completed');
  
  // In headed mode, wait 3 seconds before closing so you can see the final state
  if (process.env.HEADLESS === 'false') {
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
});

// Setup before each test
beforeEach(async () => {
  // jest-puppeteer provides global page and browser
  // Set viewport size for consistency
  await page.setViewport({ width: 1280, height: 720 });
  
  // Enable console logs from the browser in test output (filter out expected errors)
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    // Skip expected 401 and CSP errors - these are normal for testing protected routes
    if (text.includes('401') || text.includes('Unauthorized') || text.includes('Content Security Policy')) {
      return;
    }
    
    if (type === 'error') {
      console.error('Browser Error:', text);
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.error('Page Error:', error.message);
  });
});

// Helper functions for E2E tests
global.waitForSelector = async (selector, timeout = 5000) => {
  return await page.waitForSelector(selector, { timeout });
};

global.clickAndWait = async (selector, waitTime = 1000) => {
  await page.click(selector);
  await page.waitForTimeout(waitTime);
};

global.typeAndSubmit = async (inputSelector, value, submitSelector) => {
  await page.type(inputSelector, value);
  await page.click(submitSelector);
};

global.getInnerText = async (selector) => {
  return await page.$eval(selector, el => el.innerText);
};
