#!/usr/bin/env node
/**
 * Simple Test: Auto-Delivery Time Calculation
 */

import http from 'http';

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      hostname: 'localhost',
      port: 5000,
      path,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch {
          resolve({
            status: res.statusCode,
            data: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('\n🧪 TEST: Auto-Delivery Time Calculation\n');
  console.log('═'.repeat(70));

  const now = new Date();
  const currentHour = String(now.getHours()).padStart(2, '0');
  const currentMinute = String(now.getMinutes()).padStart(2, '0');
  const expectedHour = String((now.getHours() + 1) % 24).padStart(2, '0');

  console.log(`\n⏰ Current Time: ${currentHour}:${currentMinute}`);
  console.log(`📦 Expected Delivery Time (1 hour later): ${expectedHour}:${currentMinute}\n`);

  const testPayload = {
    chefId: 'chef-test-' + Date.now(),
    phoneNumber: '+919876543210',
    items: [
      {
        productId: 'roti-001',
        quantity: 2,
        price: 50,
        categoryName: 'roti',
      },
    ],
    totalPrice: 100,
    categoryName: 'roti',
    orderType: 'scheduled_delivery',
    // NO deliverySlotId - should trigger auto-calculation
  };

  try {
    console.log('📤 Sending order request (NO slot selected)...\n');
    const response = await makeRequest('POST', '/api/orders', testPayload);

    console.log(`Response Status: ${response.status}`);
    console.log(`Response:\n${JSON.stringify(response.data, null, 2)}\n`);

    if (response.status === 200 || response.status === 201) {
      const order = response.data.order;
      if (order && order.deliveryTime) {
        console.log('═'.repeat(70));
        console.log('✅ TEST PASSED\n');
        console.log(`📋 Order Details:`);
        console.log(`   Order ID: ${order.id}`);
        console.log(`   Category: ${order.categoryName}`);
        console.log(`   Delivery Time: ${order.deliveryTime}`);
        console.log(`   Expected: ${expectedHour}:${currentMinute}`);
        console.log(`\n🎉 Auto-calculation is WORKING!\n`);
      } else {
        console.log('═'.repeat(70));
        console.log('❌ TEST FAILED\n');
        console.log('Order created but NO deliveryTime was auto-calculated!\n');
      }
    } else {
      console.log('═'.repeat(70));
      console.log(`❌ TEST FAILED\n`);
      console.log(`Request failed with status ${response.status}\n`);
    }
  } catch (error) {
    console.log('═'.repeat(70));
    console.log('❌ ERROR\n');
    console.log(`Connection Error: ${error.message}\n`);
    console.log('Make sure the server is running on port 5000\n');
  }

  process.exit(0);
})();
