#!/usr/bin/env node

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
  console.log('Testing non-Roti order first...\n');

  const testPayload = {
    chefId: 'chef-test-' + Date.now(),
    phoneNumber: '+919876543210',
    items: [
      {
        productId: 'biryani-001',
        quantity: 1,
        price: 150,
        categoryName: 'biryani',  // NOT roti
      },
    ],
    totalPrice: 150,
    categoryName: 'biryani',  // NOT roti
    orderType: 'standard',
  };

  try {
    console.log('Creating non-Roti order...');
    const response = await makeRequest('POST', '/api/orders', testPayload);
    console.log(`Status: ${response.status}`);
    if (response.status === 200 || response.status === 201) {
      console.log('✅ Non-Roti order successful!');
      console.log(`Order ID: ${response.data.order?.id}`);
    } else {
      console.log('❌ Request failed');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  process.exit(0);
})();
