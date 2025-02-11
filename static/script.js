// ======================
// Authentication Handlers
// ======================

// Handle registration form submission
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = {
        username: e.target.username.value,
        email: e.target.email.value,
        password: e.target.password.value
    };

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        alert(result.message || result.error);
        if (response.ok) window.location.href = '/login';
    } catch (err) {
        alert('Registration failed. Please try again.');
    }
});

// Handle login form submission
// Login form handler
// Handle login form submission
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            // Store user info in sessionStorage
            sessionStorage.setItem('user_id', data.user_id);
            sessionStorage.setItem('username', data.username);
            sessionStorage.setItem('is_admin', data.is_admin);

            // Debug log to verify sessionStorage
            console.log("Session Storage after login:", sessionStorage);

            // Update UI
            updateAuthState();

            // Redirect to the appropriate page
            window.location.href = data.redirect;
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (err) {
        console.error('Login error:', err);
        alert('Login failed. Please try again.');
    }
});

// Update UI based on login status
function updateAuthState() {
    const username = sessionStorage.getItem('username');
    const isLoggedIn = !!sessionStorage.getItem('user_id');
    const isAdmin = sessionStorage.getItem('is_admin') === 'true'; // Ensure lowercase comparison
    document.getElementById('adminLink').style.display = isAdmin ? 'inline' : 'none'; 
    document.getElementById('usernameDisplay').textContent = username ? `Hi, ${username}` : '';
    document.getElementById('logoutLink').style.display = isLoggedIn ? 'inline' : 'none';
    document.getElementById('uploadLink').style.display = isLoggedIn ? 'inline' : 'none';
    document.getElementById('registerLink').style.display = isLoggedIn ? 'none' : 'inline';
    document.getElementById('loginLink').style.display = isLoggedIn ? 'none' : 'inline';
}

// Initialize when page loads
window.onload = () => {
    updateAuthState();
    if (window.location.pathname === '/') {
        loadVideos();
    }
};
// Video Functionality
// ====================

// Handle video upload
document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        alert(result.message || result.error);
        if (response.ok) e.target.reset();
    } catch (err) {
        alert('Upload failed. Please try again.');
    }
});

// Load and display videos
async function loadVideos() {
    try {
        const searchTerm = document.getElementById('searchInput')?.value || '';
        const response = await fetch(`/videos?q=${encodeURIComponent(searchTerm)}`);
        const videos = await response.json();
        
        const videoList = document.getElementById('videoList');
        if (!videoList) return;
        
        const isAdmin = sessionStorage.getItem('is_admin') === 'True';

        videoList.innerHTML = videos.map(video => `
            <div class="video-item">
                <h3>${video.title}</h3>
                <p>${video.description}</p>
                <video controls width="100%" preload="metadata">
                    <source src="/static/uploads/${video.file_path.split('/').pop()}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <p>Uploaded by: ${video.username}</p>
                ${isAdmin ? `<button onclick="deleteVideo(${video.id})">Delete</button>` : ''}
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading videos:', err);
    }
}

// Add search input listener
document.getElementById('searchInput')?.addEventListener('input', () => {
    loadVideos();
});

// Delete video (admin only)
async function deleteVideo(videoId) {
    if (!confirm('Are you sure you want to delete this video?')) return;
    
    try {
        const response = await fetch(`/videos/${videoId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        alert(result.message || result.error);
        if (response.ok) loadVideos();
    } catch (err) {
        alert('Delete failed. Please try again.');
    }
}

// ====================
// Session Management
// ====================

// Update UI based on login status
function updateAuthState() {
    const username = sessionStorage.getItem('username');
    const isLoggedIn = !!sessionStorage.getItem('user_id');
    const isAdmin = sessionStorage.getItem('is_admin') === 'true'; // Ensure lowercase comparison

    const adminLink = document.getElementById('adminLink');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const logoutLink = document.getElementById('logoutLink');
    const uploadLink = document.getElementById('uploadLink');
    const registerLink = document.getElementById('registerLink');
    const loginLink = document.getElementById('loginLink');

    console.log({ adminLink, usernameDisplay, logoutLink, uploadLink, registerLink, loginLink });

    if (adminLink) adminLink.style.display = isAdmin ? 'inline' : 'none';
    if (usernameDisplay) usernameDisplay.textContent = username ? `Hi, ${username}` : '';
    if (logoutLink) logoutLink.style.display = isLoggedIn ? 'inline' : 'none';
    if (uploadLink) uploadLink.style.display = isLoggedIn ? 'inline' : 'none';
    if (registerLink) registerLink.style.display = isLoggedIn ? 'none' : 'inline';
    if (loginLink) loginLink.style.display = isLoggedIn ? 'none' : 'inline';
}

// Handle logout
document.getElementById('logoutLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = '/';
});

// Initialize when page loads
window.onload = () => {
    updateAuthState();
    if (window.location.pathname === '/') {
        loadVideos();
    }
};
// Load Admin Dashboard Data
async function loadAdminData() {
    try {
        // Load users
        const usersResponse = await fetch('/admin/users');
        const users = await usersResponse.json();
        const usersList = document.getElementById('usersList');
        
        usersList.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Admin</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td>${user.is_admin ? '✅' : '❌'}</td>
                            <td class="admin-actions">
                                <button onclick="toggleAdmin(${user.id})">Toggle Admin</button>
                                <button onclick="deleteUser(${user.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Load videos
        const videosResponse = await fetch('/videos');
        const videos = await videosResponse.json();
        const videosList = document.getElementById('videosList');
        
        videosList.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Uploader</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${videos.map(video => `
                        <tr>
                            <td>${video.title}</td>
                            <td>${video.username}</td>
                            <td class="admin-actions">
                                <button onclick="deleteVideo(${video.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

    } catch (err) {
        console.error('Admin data load error:', err);
    }
}

// Admin Actions
async function deleteUser(userId) {
    if (!confirm('Delete this user and all their videos?')) return;
    
    try {
        const response = await fetch(`/admin/users/${userId}`, { method: 'DELETE' });
        const result = await response.json();
        alert(result.message || result.error);
        if (response.ok) loadAdminData();
    } catch (err) {
        alert('Delete failed');
    }
}

async function toggleAdmin(userId) {
    try {
        const response = await fetch(`/admin/users/${userId}/toggle-admin`, { method: 'POST' });
        const result = await response.json();
        alert(result.message || result.error);
        if (response.ok) loadAdminData();
    } catch (err) {
        alert('Action failed');
    }
}

// Initialize admin dashboard
if (window.location.pathname === '/admin') {
    loadAdminData();
}