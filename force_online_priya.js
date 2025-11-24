
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './schema/user.js';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const agent = await User.findOne({ name: { $regex: 'Priya', $options: 'i' } });
        if (agent) {
            agent.isOnline = true;
            agent.isAvailable = true; // Ensure available too
            await agent.save();
            console.log(`Forced ${agent.name} (${agent._id}) to Online and Available.`);
        } else {
            console.log("User 'Priya' not found.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
