# Shop Update Testing Guide

## Issue
Shopkeeper cannot update shop name and upload images.

## Root Cause Found
The `updateShop` function in `shop.controller.js` was missing the `next` parameter, which caused errors to not be properly handled.

## Fix Applied
✅ Added `next` parameter to `updateShop` function signature

## How to Test Shop Update

### Using Postman or Thunder Client:

1. **Register as Shopkeeper**
   ```
   POST http://localhost:5000/api/auth/register
   Content-Type: application/json
   
   {
     "name": "Test Shopkeeper",
     "email": "shopkeeper@test.com",
     "password": "password123",
     "role": "shopkeeper",
     "shopName": "My Test Shop",
     "shopCategory": "General",
     "pincode": "123456"
   }
   ```
   
   Save the `token` and `shop` ID from the response.

2. **Update Shop Name (JSON)**
   ```
   PUT http://localhost:5000/api/shops/{shopId}
   Authorization: Bearer {token}
   Content-Type: application/json
   
   {
     "name": "Updated Shop Name",
     "description": "New description"
   }
   ```

3. **Update Shop with Images (Form-Data)**
   ```
   PUT http://localhost:5000/api/shops/{shopId}
   Authorization: Bearer {token}
   Content-Type: multipart/form-data
   
   Fields:
   - name: "Updated Shop Name"
   - description: "New description"
   - logo: [select image file]
   - coverImage: [select image file]
   ```

## Expected Behavior
- ✅ Shop name should update successfully
- ✅ Images should upload to Cloudinary
- ✅ Response should return updated shop data

## Frontend Integration
The frontend should send a PUT request to `/api/shops/{shopId}` with either:
- JSON body for text-only updates
- FormData for updates with file uploads
