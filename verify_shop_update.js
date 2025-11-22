
// import fetch from 'node-fetch';
// Using global fetch if available, or node-fetch

const BASE_URL = 'http://127.0.0.1:5000/api';
const TIMESTAMP = Date.now();

async function request(method, endpoint, data = null, token = null, isMultipart = false) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
    }

    const options = {
        method,
        headers,
    };

    if (data) {
        options.body = isMultipart ? data : JSON.stringify(data);
    }

    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, options);
        const text = await res.text();
        try {
            return { status: res.status, data: JSON.parse(text) };
        } catch (e) {
            return { status: res.status, data: text };
        }
    } catch (err) {
        return { status: 500, error: err.message };
    }
}

async function run() {
    console.log('🚀 Starting Shop Update Verification...');

    // 1. Register Shopkeeper
    const shopkeeper = {
        name: 'Update Test Shopkeeper',
        email: `shopkeeper_update_${TIMESTAMP}@test.com`,
        password: 'password123',
        role: 'shopkeeper',
        shopName: `Update Test Shop ${TIMESTAMP}`,
        shopCategory: 'General',
        pincode: '123456'
    };

    console.log('Registering Shopkeeper...');
    const regRes = await request('POST', '/auth/register', shopkeeper);

    if (regRes.status !== 201) {
        console.error('❌ Registration failed:', regRes.data);
        return;
    }

    const token = regRes.data.data.token;
    const shopId = regRes.data.data.user.shop;
    console.log(`✅ Registered. Shop ID: ${shopId}`);

    // 2. Update Shop Name (JSON)
    console.log('\n--- Attempting Update (Name only) ---');
    const updateData = {
        name: `Updated Shop Name ${TIMESTAMP}`,
        description: 'Updated description'
    };

    // Note: The route expects multipart/form-data if files are included, 
    // but should handle JSON if no files are sent, UNLESS multer middleware interferes.
    // Multer .fields() usually allows non-file fields to pass through.
    // However, if the client sends JSON with Content-Type: application/json, 
    // multer might not parse the body if it expects multipart.
    // But express.json() is global. Let's see.

    const updateRes = await request('PUT', `/shops/${shopId}`, updateData, token);

    if (updateRes.status === 200) {
        console.log('✅ Shop Name Update Success:', updateRes.data.data.name);
    } else {
        console.error('❌ Shop Name Update Failed:', updateRes.status, updateRes.data);
    }

    // 3. Update with Image (Simulated)
    // Since we can't easily simulate multipart/form-data with files in this script without extra libs (form-data),
    // we will skip the actual file upload test here unless we use 'form-data' package.
    // But the user's issue might be just the name update if they are sending JSON.

}

run();
