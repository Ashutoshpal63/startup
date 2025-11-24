
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './schema/user.js';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const agents = await User.find({ name: { $regex: 'Priya', $options: 'i' } });
        console.log(`Found ${agents.length} users matching 'Priya'.`);

        agents.forEach(agent => {
            console.log(`- ID: ${agent._id}`);
            console.log(`  Name: ${agent.name}`);
            console.log(`  Email: ${agent.email}`);
            console.log(`  Role: ${agent.role}`);
            console.log(`  isOnline: ${agent.isOnline} (${typeof agent.isOnline})`);
            console.log(`  isAvailable: ${agent.isAvailable} (${typeof agent.isAvailable})`);
            console.log('---');
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
