// Create new folder: socket
// Create new file: socket/location.handler.js

import User from '../schema/user.js';

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // Agent joins a room specific to an order
    socket.on('joinOrderRoom', (orderId) => {
      socket.join(orderId);
      console.log(`Agent ${socket.id} joined room for order ${orderId}`);
    });

    // Agent sends a location update
    socket.on('updateLocation', async ({ orderId, agentId, location }) => {
      // location should be { lat: Number, lng: Number }
      console.log(`Received location for order ${orderId}:`, location);
      
      // 1. Update the agent's location in the database (optional but good practice)
      try {
        await User.findByIdAndUpdate(agentId, {
          currentLocation: {
            type: 'Point',
            coordinates: [location.lng, location.lat] // [longitude, latitude]
          }
        });
      } catch (err) {
        console.error('Error updating agent location in DB:', err);
      }
      
      // 2. Broadcast the new location to the customer in the same order room
      socket.to(orderId).emit('locationUpdated', { agentId, location });
    });

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });
};

export default initializeSocket;