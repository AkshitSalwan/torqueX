/**
 * Socket.io handler for real-time communication
 */

module.exports = function(io) {
  // Store connected users
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('New client connected');
    
    // User authentication
    socket.on('authenticate', (userData) => {
      if (userData && userData.userId) {
        connectedUsers.set(socket.id, userData.userId);
        
        // Join user-specific room
        socket.join(`user-${userData.userId}`);
        
        // Join role-specific room
        if (userData.role === 'ADMIN') {
          socket.join('admins');
        } else {
          socket.join('users');
        }
        
        console.log(`User ${userData.userId} authenticated`);
      }
    });
    
    // Admin broadcast message to all users
    socket.on('admin-broadcast', (data) => {
      if (data && data.message) {
        // Save broadcast to database
        // This would typically be handled by a controller
        console.log(`Broadcasting: ${data.message}`);
        
        // Broadcast to all connected users
        io.to('users').emit('broadcast', {
          message: data.message,
          timestamp: new Date()
        });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      const userId = connectedUsers.get(socket.id);
      if (userId) {
        console.log(`User ${userId} disconnected`);
        connectedUsers.delete(socket.id);
      } else {
        console.log('Client disconnected');
      }
    });
  });

  return io;
};