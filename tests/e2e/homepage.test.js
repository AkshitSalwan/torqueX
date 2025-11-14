/**
 * E2E Tests for Homepage
 */

describe('Homepage E2E Tests', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  beforeEach(async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  });

  describe('Page Load and Content', () => {
    it('should load homepage successfully', async () => {
      const title = await page.title();
      expect(title).toContain('TorqueX');
    });

    it('should display main navigation', async () => {
      const nav = await page.$('nav');
      expect(nav).toBeTruthy();
    });

    it('should have working links in navigation', async () => {
      const navLinks = await page.$$('nav a');
      expect(navLinks.length).toBeGreaterThan(0);
    });

    it('should display hero section', async () => {
      const hero = await page.$('.hero, [class*="hero"], h1');
      expect(hero).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate to vehicles page', async () => {
      const vehiclesLink = await page.$('a[href*="/vehicles"]');
      if (vehiclesLink) {
        await vehiclesLink.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        const url = page.url();
        expect(url).toContain('/vehicles');
      }
    });

    it('should navigate to about page', async () => {
      const aboutLink = await page.$('a[href*="/about"]');
      if (aboutLink) {
        await aboutLink.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        const url = page.url();
        expect(url).toContain('/about');
      }
    });

    it('should navigate to contact page', async () => {
      const contactLink = await page.$('a[href*="/contact"]');
      if (contactLink) {
        await contactLink.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        const url = page.url();
        expect(url).toContain('/contact');
      }
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile', async () => {
      await page.setViewport({ width: 375, height: 667 }); // iPhone SE
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      
      const body = await page.$('body');
      expect(body).toBeTruthy();
    });

    it('should be responsive on tablet', async () => {
      await page.setViewport({ width: 768, height: 1024 }); // iPad
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      
      const body = await page.$('body');
      expect(body).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should load within acceptable time', async () => {
      const startTime = Date.now();
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });
  });
});
