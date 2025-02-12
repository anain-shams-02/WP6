window.onload = () => {
    updateAuthState();
    if (window.location.pathname === '/') {
        loadVideos();
    } else if (window.location.pathname === '/admin') {
        loadAdminData();
    }
};

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
            sessionStorage.setItem('user_id', data.user_id);
            sessionStorage.setItem('username', data.username);
            sessionStorage.setItem('is_admin', data.is_admin);

            console.log("Session Storage after login:", sessionStorage);
            updateAuthState();
            window.location.href = data.redirect;
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (err) {
        console.error('Login error:', err);
        alert('Login failed. Please try again.');
    }
});

document.getElementById('logoutLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = '/';
});

function updateAuthState() {
    const username = sessionStorage.getItem('username');
    const isLoggedIn = !!sessionStorage.getItem('user_id');
    const isAdmin = sessionStorage.getItem('is_admin') === 'true';

    const elements = {
        adminLink: document.getElementById('adminLink'),
        usernameDisplay: document.getElementById('usernameDisplay'),
        logoutLink: document.getElementById('logoutLink'),
        uploadLink: document.getElementById('uploadLink'),
        registerLink: document.getElementById('registerLink'),
        loginLink: document.getElementById('loginLink')
    };

    if (elements.adminLink) elements.adminLink.style.display = isAdmin ? 'inline' : 'none';
    if (elements.usernameDisplay) elements.usernameDisplay.textContent = username ? `Hi, ${username}` : '';
    if (elements.logoutLink) elements.logoutLink.style.display = isLoggedIn ? 'inline' : 'none';
    if (elements.uploadLink) elements.uploadLink.style.display = isLoggedIn ? 'inline' : 'none';
    if (elements.registerLink) elements.registerLink.style.display = isLoggedIn ? 'none' : 'inline';
    if (elements.loginLink) elements.loginLink.style.display = isLoggedIn ? 'none' : 'inline';
}

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

document.getElementById('searchInput')?.addEventListener('input', () => {
    loadVideos();
});

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

async function loadAdminData() {
    try {
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