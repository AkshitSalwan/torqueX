// Add socket.io event handlers for real-time broadcasts to user dashboard
document.addEventListener('DOMContentLoaded', function() {
  // Only initialize if user is logged in
  if (document.querySelector('.broadcast-container')) {
    const socket = io();
    
    // Listen for new broadcasts
    socket.on('broadcast', function(data) {
      const container = document.querySelector('.broadcast-container');
      const noAnnouncementsMsg = document.querySelector('.no-announcements');
      
      if (noAnnouncementsMsg) {
        // Remove the "no announcements" message if it exists
        noAnnouncementsMsg.remove();
      }
      
      // Create a new broadcast element
      const newBroadcast = document.createElement('div');
      newBroadcast.className = 'bg-white p-4 rounded-md shadow-sm border-l-4 border-blue-500 animate-fade-in';
      
      // Add animation class
      newBroadcast.style.animation = 'fadeIn 0.5s ease-in-out';
      
      // Format timestamp
      const timestamp = new Date(data.timestamp).toLocaleString();
      
      // Set the content
      newBroadcast.innerHTML = `
        <p class="text-gray-800">${data.message}</p>
        <p class="text-sm text-gray-500 mt-2">${timestamp}</p>
      `;
      
      // Add to the beginning of the container
      container.insertBefore(newBroadcast, container.firstChild);
      
      // Show notification
      showNotification('New Announcement', data.message);
    });
    
    // Authenticate socket
    if (window.userData) {
      socket.emit('authenticate', window.userData);
    }
  }
});

function showNotification(title, message) {
  // Check if browser supports notifications
  if (!("Notification" in window)) {
    return;
  }
  
  // Check if permission is already granted
  if (Notification.permission === "granted") {
    new Notification(title, { 
      body: message,
      icon: '/images/logo.png'
    });
  }
  // Otherwise, ask for permission
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(function (permission) {
      if (permission === "granted") {
        new Notification(title, { 
          body: message,
          icon: '/images/logo.png'
        });
      }
    });
  }
}

// Add some CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.5s ease-in-out;
  }
`;
document.head.appendChild(style);