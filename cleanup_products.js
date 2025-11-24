
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './schema/product.js';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const result = await Product.deleteMany({ name: { $regex: 'Test Product', $options: 'i' } });
        console.log(`Deleted ${result.deletedCount} test products.`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
