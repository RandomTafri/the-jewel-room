const API_URL = '/api';

// State Management
const State = {
    user: null,
    cart: { items: [], total: 0 },
    config: {},
    token: localStorage.getItem('token') || null
};

// API Wrapper
const API = {
    async request(endpoint, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (State.token) {
            headers['Authorization'] = `Bearer ${State.token}`;
        }
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
            headers['x-session-id'] = sessionId;
        }

        const options = { method, headers };
        if (data) options.body = JSON.stringify(data);

        try {
            const res = await fetch(`${API_URL}${endpoint}`, options);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Request failed');
            return json;
        } catch (err) {
            console.error(err);
            throw err;
        }
    },

    get(endpoint) { return this.request(endpoint, 'GET'); },
    post(endpoint, data) { return this.request(endpoint, 'POST', data); },
    put(endpoint, data) { return this.request(endpoint, 'PUT', data); },
    delete(endpoint) { return this.request(endpoint, 'DELETE'); }
};

// Core Logic
const App = {
    async init() {
        // Generates session ID if not exists
        if (!localStorage.getItem('sessionId')) {
            localStorage.setItem('sessionId', 'sess_' + Math.random().toString(36).substr(2, 9));
        }

        // Fetch Config
        try {
            State.config = await API.get('/config');
            this.applyTheme();
        } catch (e) { console.error('Config load failed', e); }

        // Check Auth
        if (State.token) {
            try {
                const res = await API.get('/auth/me');
                State.user = res.user;
                this.updateAuthUI();
            } catch (e) {
                // Token invalid
                this.logout();
            }
        } else {
            this.updateAuthUI();
        }

        // Update Cart Count
        this.refreshCart();
    },

    applyTheme() {
        const root = document.documentElement;
        if (State.config.theme) {
            root.style.setProperty('--primary-color', State.config.theme.primary);
            root.style.setProperty('--secondary-color', State.config.theme.secondary);
            root.style.setProperty('--text-color', State.config.theme.text);
            root.style.setProperty('--accent-color', State.config.theme.accent);
        }
    },

    async login(email, password) {
        const res = await API.post('/auth/login', { email, password });
        localStorage.setItem('token', res.token);
        State.token = res.token;
        State.user = res.user;

        // Merge carts
        await API.post('/cart/merge', { sessionId: localStorage.getItem('sessionId') });

        this.updateAuthUI();
        window.location.href = 'index.html';
    },

    logout() {
        localStorage.removeItem('token');
        State.token = null;
        State.user = null;
        window.location.href = 'index.html';
    },

    updateAuthUI() {
        const authLinks = document.getElementById('auth-links');
        if (authLinks) {
            if (State.user) {
                authLinks.innerHTML = `
                    <div class="auth-dropdown">
                        <button class="auth-icon-btn">
                            <i class="fa-solid fa-bars"></i>
                        </button>
                        <div class="auth-dropdown-content">
                            <div class="auth-user-header">Hi, ${State.user.name.split(' ')[0]}</div>
                            <a href="account.html"><i class="fa-regular fa-user"></i> &nbsp; My Account</a>
                            <a href="wishlist.html"><i class="fa-solid fa-heart"></i> &nbsp; Wishlist</a>
                            ${State.user.role === 'admin' ? '<a href="admin.html"><i class="fa-solid fa-lock"></i> &nbsp; Admin Panel</a>' : ''}
                            <a href="#" onclick="App.logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> &nbsp; Logout</a>
                        </div>
                    </div>
                `;
            } else {
                authLinks.innerHTML = `
                    <a href="account.html">Login</a>
                `;
            }
        }
    },

    async refreshCart() {
        try {
            const res = await API.get('/cart');
            State.cart.items = res.items;
            const count = res.items.reduce((acc, item) => acc + item.quantity, 0);

            const cartCountEl = document.getElementById('cart-count');
            if (cartCountEl) cartCountEl.innerText = count;
        } catch (e) {
            console.log('Cart empty or error');
        }
    }
};

// Utils
function formatPrice(price) {
    return (State.config.currencySymbol || '₹') + price;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
