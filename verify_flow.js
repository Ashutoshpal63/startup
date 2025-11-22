
// import fetch from 'node-fetch'; // Using global fetch 
// If native fetch is available, this import might fail if not installed. 
// I'll use a try-catch or just rely on global fetch if I'm on Node 18+.
// Actually, to be safe, I'll use standard http or just assume global fetch.
// Let's assume global fetch (Node 18+).

const BASE_URL = 'http://127.0.0.1:5000/api';
const TIMESTAMP = Date.now();

// Users
const USERS = {
    customer: {
        name: 'Test Customer',
        email: `customer_${TIMESTAMP}@test.com`,
        password: 'password123',
        role: 'customer',
        address: { street: '123 Main St', city: 'Test City', pincode: '123456' }
    },
    shopkeeper: {
        name: 'Test Shopkeeper',
        email: `shopkeeper_${TIMESTAMP}@test.com`,
        password: 'password123',
        role: 'shopkeeper',
        shopName: `Test Shop ${TIMESTAMP}`,
        shopCategory: 'General',
        pincode: '123456'
    },
    delivery_agent: {
        name: 'Test Agent',
        email: `agent_${TIMESTAMP}@test.com`,
        password: 'password123',
        role: 'delivery_agent',
        phone: '9876543210'
    },
    admin: {
        name: 'Test Admin',
        email: `admin_${TIMESTAMP}@test.com`,
        password: 'password123',
        role: 'admin'
    }
};

let TOKENS = {};
let IDS = {};
let SHOP_ID = null;
let PRODUCT_ID = null;
let ORDER_ID = null;

async function request(method, endpoint, data = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined
        });

        const text = await res.text();
        try {
            return { status: res.status, data: JSON.parse(text) };
        } catch (e) {
            return { status: res.status, data: text };
        }
    } catch (err) {
        console.error(`Request failed: ${method} ${endpoint}`, err.message);
        return { status: 500, error: err.message };
    }
}

async function run() {
    console.log('🚀 Starting Verification Flow...');

    // Check API health
    const health = await request('GET', '/'); // This will be /api/ which might be 404, app.js has app.get('/', ...)
    // app.js has app.get('/', ...) which is at root, not /api/
    // My BASE_URL is http://localhost:5000/api
    // So I should check http://localhost:5000/

    try {
        const rootRes = await fetch('http://127.0.0.1:5000/');
        const rootText = await rootRes.text();
        console.log('Health Check:', rootRes.status, rootText);
    } catch (e) {
        console.error('Health Check Failed:', e.message);
    }

    // 1. Register Users
    console.log('\n--- 1. Registration ---');
    for (const [role, user] of Object.entries(USERS)) {
        console.log(`Registering ${role}...`);
        const res = await request('POST', '/auth/register', user);
        if (res.status === 201) {
            console.log(`✅ Registered ${role}: ${user.email}`);
            TOKENS[role] = res.data.data.token;
            IDS[role] = res.data.data.user._id;
            if (role === 'shopkeeper') {
                SHOP_ID = res.data.data.user.shop;
                console.log(`   Shop ID: ${SHOP_ID}`);
            }
        } else {
            console.error(`❌ Failed to register ${role}: Status ${res.status}`);
            console.error('Response:', JSON.stringify(res.data, null, 2));
        }
    }

    // 2. Create Product (Shopkeeper)
    console.log('\n--- 2. Product Creation ---');
    if (TOKENS.shopkeeper && SHOP_ID) {
        const productData = {
            name: 'Test Product',
            description: 'A great product',
            price: 100,
            category: 'Test',
            quantityAvailable: 50,
            shopId: SHOP_ID,
            imageUrl: 'https://via.placeholder.com/150' // Dummy image URL
        };
        // Check product routes to see if shopId is needed in body or inferred from user
        // Usually inferred or passed. Let's try passing it.
        // Wait, product creation usually requires multipart/form-data if images are involved.
        // Let's check product.controller.js later if this fails.
        // Assuming JSON for now as I didn't see multer middleware on createProduct in previous steps (I didn't check product routes deeply).
        // Actually, I should check product routes.
        // But let's try JSON first.

        const res = await request('POST', '/products', productData, TOKENS.shopkeeper);
        if (res.status === 201) {
            console.log('✅ Product Created');
            PRODUCT_ID = res.data.data._id;
        } else {
            console.error('❌ Failed to create product:', res.data);
        }
    }

    // 3. Add to Cart (Customer)
    console.log('\n--- 3. Add to Cart ---');
    if (TOKENS.customer && PRODUCT_ID) {
        const res = await request('POST', '/cart', { productId: PRODUCT_ID, quantity: 2 }, TOKENS.customer);
        if (res.status === 200) {
            console.log('✅ Added to Cart');
        } else {
            console.error('❌ Failed to add to cart:', res.data);
        }
    }

    // 4. Checkout (Customer)
    console.log('\n--- 4. Checkout ---');
    if (TOKENS.customer) {
        const res = await request('POST', '/orders/checkout-all', {}, TOKENS.customer);
        if (res.status === 201) {
            console.log('✅ Checkout Successful');
            ORDER_ID = res.data.data.createdOrderIds[0];
            console.log(`   Order ID: ${ORDER_ID}`);
        } else {
            console.error('❌ Checkout Failed:', res.data);
        }
    }

    // 5. Approve Order (Shopkeeper)
    console.log('\n--- 5. Approve Order ---');
    if (TOKENS.shopkeeper && ORDER_ID) {
        const res = await request('PATCH', `/orders/${ORDER_ID}/status`, { status: 'ACCEPTED' }, TOKENS.shopkeeper);
        if (res.status === 200) {
            console.log('✅ Order Approved (Status: PENDING_PAYMENT)');
        } else {
            console.error('❌ Failed to approve order:', res.data);
        }
    }

    // 6. Process Payment (Customer)
    console.log('\n--- 6. Process Payment ---');
    if (TOKENS.customer && ORDER_ID) {
        const res = await request('POST', '/payment/process-payment', { orderId: ORDER_ID }, TOKENS.customer);
        if (res.status === 200) {
            console.log('✅ Payment Initiated');
            // Wait for dummy payment to complete (2s)
            await new Promise(r => setTimeout(r, 3000));
        } else {
            console.error('❌ Payment Failed:', res.data);
        }
    }

    // 7. Verify Order Status (Customer)
    console.log('\n--- 7. Verify Payment Status ---');
    if (TOKENS.customer && ORDER_ID) {
        const res = await request('GET', `/orders/${ORDER_ID}/track`, null, TOKENS.customer);
        if (res.status === 200 && res.data.data.status === 'PROCESSING') {
            console.log('✅ Order Status is PROCESSING');
        } else {
            console.error('❌ Order Status Mismatch:', res.data.data.status);
        }
    }

    // 8. Claim Order (Delivery Agent)
    console.log('\n--- 8. Claim Order ---');
    if (TOKENS.delivery_agent && ORDER_ID) {
        // 8a. Try to claim while offline (default) - Should Fail
        console.log('   Attempting to claim while offline...');
        const failRes = await request('PATCH', `/orders/${ORDER_ID}/claim`, null, TOKENS.delivery_agent);
        if (failRes.status === 400) {
            console.log('✅ Correctly blocked claiming while offline.');
        } else {
            console.error('❌ Should have failed to claim while offline, but got:', failRes.status);
        }

        // 8b. Go Online
        console.log('   Going Online...');
        const onlineRes = await request('PATCH', '/users/availability', { isOnline: true }, TOKENS.delivery_agent);
        if (onlineRes.status === 200 && onlineRes.data.data.isOnline) {
            console.log('✅ Agent is now Online.');
        } else {
            console.error('❌ Failed to go online:', onlineRes.data);
        }

        // 8c. Claim Order - Should Succeed
        console.log('   Attempting to claim while online...');
        const res = await request('PATCH', `/orders/${ORDER_ID}/claim`, null, TOKENS.delivery_agent);
        if (res.status === 200) {
            console.log('✅ Order Claimed by Agent');
        } else {
            console.error('❌ Failed to claim order:', res.data);
        }
    }

    // 9. Update Status to OUT_FOR_DELIVERY (Agent)
    console.log('\n--- 9. Out for Delivery ---');
    if (TOKENS.delivery_agent && ORDER_ID) {
        const res = await request('PATCH', `/orders/${ORDER_ID}/status`, { status: 'OUT_FOR_DELIVERY' }, TOKENS.delivery_agent);
        if (res.status === 200) {
            console.log('✅ Status Updated to OUT_FOR_DELIVERY');
        } else {
            console.error('❌ Failed to update status:', res.data);
        }
    }

    // 10. Update Status to DELIVERED (Agent)
    console.log('\n--- 10. Delivered ---');
    if (TOKENS.delivery_agent && ORDER_ID) {
        const res = await request('PATCH', `/orders/${ORDER_ID}/status`, { status: 'DELIVERED' }, TOKENS.delivery_agent);
        if (res.status === 200) {
            console.log('✅ Status Updated to DELIVERED');
        } else {
            console.error('❌ Failed to update status:', res.data);
        }
    }

    console.log('\n🎉 Verification Complete!');
}

run();
