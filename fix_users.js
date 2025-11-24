
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './schema/user.js';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const agents = await User.find({ role: 'delivery_agent' });
        console.log(`Found ${agents.length} delivery agents.`);

        let fixedCount = 0;
        for (const agent of agents) {
            agent.isAvailable = true;
            // agent.isOnline = true; // Optional: force online too? No, let them toggle.
            await agent.save();
            console.log(`Reset agent ${agent._id} (${agent.email}) to Available.`);
            fixedCount++;
        }

        console.log(`Reset ${fixedCount} agents.`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
