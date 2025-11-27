// Shared utility functions
const API_BASE_URL = window.location.origin;

// Get auth token
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getAuthToken();
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Show message
function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) {
        console.log(`[${type.toUpperCase()}]`, message);
        return;
    }

    messageDiv.innerHTML = `<div class="message ${type}">${message}</div>`;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (messageDiv.innerHTML.includes(message)) {
            messageDiv.innerHTML = '';
        }
    }, 5000);
}

// Clear messages
function clearMessage() {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.innerHTML = '';
    }
}

// API request helper with error handling
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();

    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    if (token && options.requireAuth !== false) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('authToken');
            showMessage('Your session has expired. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            throw new Error('Session expired');
        }

        if (!response.ok) {
            throw new Error(data.error || `Request failed with status ${response.status}`);
        }

        return { success: true, data };
    } catch (error) {
        console.error('API request error:', error);
        return { success: false, error: error.message };
    }
}

// Load user profile
async function loadUserProfile() {
    if (!isAuthenticated()) {
        return null;
    }

    const result = await apiRequest('/api/auth/profile', {
        method: 'GET'
    });

    if (result.success) {
        return result.data;
    }

    return null;
}

// Update navbar with user info
async function updateNavbar() {
    const userInfoDiv = document.getElementById('navUserInfo');
    if (!userInfoDiv) return;

    if (!isAuthenticated()) {
        userInfoDiv.innerHTML = `
            <a href="login.html" class="btn btn-primary">Login</a>
        `;
        return;
    }

    const profile = await loadUserProfile();
    if (profile) {
        userInfoDiv.innerHTML = `
            <div class="user-info">
                <span><strong>${profile.firstName} ${profile.lastName}</strong></span>
                <button onclick="logout()" class="btn btn-danger">Logout</button>
            </div>
        `;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    // Clear any other cached data
    localStorage.removeItem('userProfile');
    showMessage('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// Clear all cached data (useful for troubleshooting)
function clearAllData() {
    localStorage.clear();
    sessionStorage.clear();
    showMessage('All cached data cleared', 'info');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// Format currency (cents to dollars)
function formatCurrency(cents) {
    return `$${(cents / 100).toFixed(2)}`;
}

// Format duration (seconds to MM:SS)
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show loading state
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="flex-center" style="padding: 40px;">
                <div class="loading"></div>
                <span style="margin-left: 10px;">Loading...</span>
            </div>
        `;
    }
}

// Hide element
function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('hidden');
    }
}

// Show element
function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('hidden');
    }
}

// Toggle element
function toggleElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.toggle('hidden');
    }
}

// Set active nav link
function setActiveNavLink(pageName) {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === pageName) {
            link.classList.add('active');
        }
    });
}

// Initialize page
function initPage(pageName, requiresAuth = true) {
    if (requiresAuth && !requireAuth()) {
        return;
    }

    updateNavbar();
    setActiveNavLink(pageName);
}

// Export functions for use in other scripts
window.apiUtils = {
    getAuthToken,
    isAuthenticated,
    requireAuth,
    showMessage,
    clearMessage,
    apiRequest,
    loadUserProfile,
    updateNavbar,
    logout,
    formatCurrency,
    formatDuration,
    formatDate,
    debounce,
    showLoading,
    hideElement,
    showElement,
    toggleElement,
    setActiveNavLink,
    initPage
};
