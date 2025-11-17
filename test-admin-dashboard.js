#!/usr/bin/env node
/**
 * Test admin dashboard functionality
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function main() {
  try {
    const client = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
      validateStatus: () => true
    });

    // 1. Login
    console.log('🔐 Logging in as admin...');
    const loginPageResp = await client.get('/auth/login');
    const csrfMatch = loginPageResp.data.match(/name="_csrf"\s+value="([^"]*)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : null;
    const cookies = loginPageResp.headers['set-cookie'];
    
    const loginResp = await client.post('/auth/login', 
      `email=admin@torquex.com&password=admin123&_csrf=${csrfToken}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies.join('; ')
        },
        maxRedirects: 0
      }
    );

    if (loginResp.status !== 302) {
      console.log('❌ Login failed:', loginResp.status);
      return;
    }

    const sessionCookies = loginResp.headers['set-cookie'] || cookies;
    console.log('✅ Logged in successfully');

    // 2. Test dashboard
    console.log('\n📊 Testing admin dashboard...');
    const dashboardResp = await client.get('/admin/dashboard', {
      headers: {
        'Cookie': sessionCookies.join('; ')
      }
    });

    console.log('   Status:', dashboardResp.status, dashboardResp.statusText);
    
    if (dashboardResp.status === 200) {
      console.log('   ✅ Dashboard loaded successfully!');
      
      // Check for key elements
      const hasStats = dashboardResp.data.includes('Total Vehicles') || 
                       dashboardResp.data.includes('Total Bookings') ||
                       dashboardResp.data.includes('Total Users');
      const hasTitle = dashboardResp.data.includes('Admin Dashboard') ||
                       dashboardResp.data.includes('Dashboard');
      
      console.log('   Contains stats:', hasStats ? '✅' : '❌');
      console.log('   Contains title:', hasTitle ? '✅' : '❌');
      
      if (!hasStats && !hasTitle) {
        console.log('\n   ⚠️  Page content preview:');
        console.log('   ', dashboardResp.data.substring(0, 500).replace(/\s+/g, ' '));
      }
    } else if (dashboardResp.status === 500) {
      console.log('   ❌ Server error!');
      console.log('   Error preview:', dashboardResp.data.substring(0, 300));
    } else {
      console.log('   ⚠️  Unexpected response');
    }

    // 3. Test stats API
    console.log('\n📈 Testing admin stats API...');
    const statsResp = await client.get('/admin/stats', {
      headers: {
        'Cookie': sessionCookies.join('; ')
      }
    });

    console.log('   Status:', statsResp.status, statsResp.statusText);
    
    if (statsResp.status === 200) {
      console.log('   ✅ Stats API working!');
      console.log('   Data:', JSON.stringify(statsResp.data, null, 2));
    } else {
      console.log('   ❌ Stats API failed');
    }

    // 4. Test Redis status
    console.log('\n🔴 Testing Redis status...');
    const redisResp = await client.get('/admin/redis-status', {
      headers: {
        'Cookie': sessionCookies.join('; ')
      }
    });

    console.log('   Status:', redisResp.status, redisResp.statusText);
    
    if (redisResp.status === 200) {
      console.log('   ✅ Redis endpoint working!');
      console.log('   Data:', JSON.stringify(redisResp.data, null, 2));
    }

    console.log('\n✅ All tests complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
    }
  }
}

main();
