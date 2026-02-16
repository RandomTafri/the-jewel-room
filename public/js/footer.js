// Shared Footer Component
(function () {
    async function loadFooter() {
        try {
            console.log('Initializing footer...');

            // Wait for API to be available if needed
            if (!window.API) {
                console.warn('API not found, retrying in 100ms...');
                await new Promise(resolve => setTimeout(resolve, 100));
                if (!window.API) throw new Error('API client not available');
            }

            // Fetch categories
            const categories = await API.get('/categories').catch(err => {
                console.error('Failed to load categories for footer:', err);
                return [];
            });

            console.log('Footer data loaded:', { categories });

            // Chunk categories for desktop view (5 per column)
            const chunkSize = 5;
            const categoryChunks = [];
            if (categories.length > 0) {
                for (let i = 0; i < categories.length; i += chunkSize) {
                    categoryChunks.push(categories.slice(i, i + chunkSize));
                }
            } else {
                categoryChunks.push([]); // Empty fallback
            }

            const footerHTML = `
                <div class="footer-container">
                    <div class="footer-content">
                        <!-- Brand Section -->
                        <div class="footer-brand">
                            <h2 class="footer-logo">Shree Roop Creative</h2>
                            <div class="footer-social">
                                <a href="https://www.instagram.com/shree_roop_creative?utm_source=qr&igsh=MXZkbXJkaXF1Ynpkdw==" target="_blank" aria-label="Instagram">
                                    <i class="fa-brands fa-instagram"></i>
                                </a>
                                <a href="#" onclick="openWhatsAppContact(); return false;" aria-label="WhatsApp">
                                    <i class="fa-brands fa-whatsapp"></i>
                                </a>
                                <a href="https://www.facebook.com/share/1FupbTtCm7/" target="_blank" aria-label="Facebook">
                                    <i class="fa-brands fa-facebook"></i>
                                </a>
                            </div>
                            <div class="footer-contact">
                                <p>Contact Us</p>
                                <p>Email: <span id="footer-email">...</span></p>
                                <p>Phone: <span id="footer-phone">...</span></p>
                            </div>
                        </div>

                        <!-- Shop Section (Dynamic Columns) -->
                        <div class="footer-links-section shop-section-dynamic">
                            <h3>SHOP</h3>
                            <div class="shop-columns">
                                ${categoryChunks.map(chunk => `
                                    <ul class="footer-column">
                                        ${chunk.map(cat => `
                                            <li><a href="shop.html?cat=${encodeURIComponent(cat.name)}">${cat.name}</a></li>
                                        `).join('')}
                                    </ul>
                                `).join('')}
                            </div>
                            <!-- Mobile: Single scrollable list -->
                            <ul class="shop-mobile-list">
                                ${categories.map(cat => `
                                    <li><a href="shop.html?cat=${encodeURIComponent(cat.name)}">${cat.name}</a></li>
                                `).join('')}
                            </ul>
                        </div>

                        <!-- Info Section -->
                        <div class="footer-links-section">
                            <h3>INFO</h3>
                            <ul>
                                <li><a href="info-page.html?page=about-us">About Us</a></li>
                                <li><a href="info-page.html?page=contact-us">Contact Us</a></li>
                                <li><a href="info-page.html?page=privacy-policy">Privacy Policy</a></li>
                                <li><a href="info-page.html?page=terms-conditions">Terms & Conditions</a></li>
                                <li><a href="info-page.html?page=shipping-returns">Shipping & Returns</a></li>
                            </ul>
                        </div>
                    </div>

                    <!-- Copyright Bar -->
                    <div class="footer-bottom">
                        <p>&copy; ${new Date().getFullYear()} Shree Roop Creative. All rights reserved.</p>
                    </div>
                </div>
            `;

            const footerElement = document.getElementById('site-footer');
            if (footerElement) {
                footerElement.innerHTML = footerHTML;

                // Update email and phone from config (Retry mechanism)
                const updateConfigData = () => {
                    const email = (State.config && State.config.supportEmail) || 'support@shreeroop.com';
                    const phone = (State.config && State.config.supportPhone) || '+91 8397803333';

                    const emailEl = document.getElementById('footer-email');
                    if (emailEl) {
                        emailEl.innerHTML = `<a href="mailto:${email}">${email}</a>`;
                    }
                    const phoneEl = document.getElementById('footer-phone');
                    if (phoneEl) {
                        phoneEl.textContent = phone;
                    }
                    return true;
                };

                // Try immediately
                if (!updateConfigData()) {
                    // Retry every 500ms max 10 times
                    let attempts = 0;
                    const interval = setInterval(() => {
                        attempts++;
                        if (updateConfigData() || attempts > 10) {
                            clearInterval(interval);
                        }
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Error loading footer:', error);
        }
    }

    // Load footer when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadFooter);
    } else {
        loadFooter();
    }

    // Helper function for WhatsApp
    window.openWhatsAppContact = function () {
        if (State.config && State.config.whatsappNumber) {
            const url = `https://wa.me/${State.config.whatsappNumber}?text=${encodeURIComponent("Hi, I would like to know more about your products.")}`;
            window.open(url, '_blank');
        }
    };
})();
