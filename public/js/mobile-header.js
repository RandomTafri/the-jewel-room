// Mobile Header & Scroll Logic
(function () {
    let lastScrollY = window.scrollY;
    const header = document.querySelector('header');

    // Add mobile classes dynamically if not present
    if (header) {
        header.classList.add('mobile-dynamic-header');
    }

    // Scroll Handler
    function handleScroll() {
        if (!header) return;

        const currentScrollY = window.scrollY;

        // Only apply if we have scrolled past a certain point
        if (currentScrollY > 100) {
            if (currentScrollY > lastScrollY) {
                // Scrolling DOWN -> Hide Header
                header.classList.add('header-hidden');
            } else {
                // Scrolling UP -> Show Header
                header.classList.remove('header-hidden');
            }
        } else {
            // At top -> Show Header
            header.classList.remove('header-hidden');
        }

        lastScrollY = currentScrollY;
    }

    // Throttled Scroll
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    });

    // Setup Mobile Menu Structure
    function setupMobileMenu() {
        const nav = document.querySelector('nav');
        if (!nav) return;

        // Create Hamburger Button
        const hamburgerBtn = document.createElement('button');
        hamburgerBtn.className = 'mobile-hamburger-btn';
        hamburgerBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        hamburgerBtn.onclick = toggleMobileMenu;

        // Create Mobile Sidebar
        const sidebar = document.createElement('div');
        sidebar.id = 'mobile-sidebar';
        sidebar.className = 'mobile-sidebar';

        // Clone links for sidebar
        const links = nav.querySelector('ul').cloneNode(true);
        links.className = 'mobile-nav-links';

        // Fix duplicate ID for auth links
        const authLi = links.querySelector('#auth-links');
        if (authLi) {
            authLi.id = 'mobile-auth-links';
        }

        // Sync cart count in sidebar
        const sidebarCartCount = links.querySelector('#cart-count');
        if (sidebarCartCount) {
            sidebarCartCount.id = 'mobile-sidebar-cart-count';
            const headerCartCount = document.getElementById('cart-count');
            if (headerCartCount) {
                // Initial sync
                sidebarCartCount.innerText = headerCartCount.innerText;
                // Observe changes
                const countObserver = new MutationObserver(() => {
                    sidebarCartCount.innerText = headerCartCount.innerText;
                });
                countObserver.observe(headerCartCount, { childList: true, characterData: true, subtree: true });
            }
        }

        // Add Close Button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'mobile-sidebar-close';
        closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        closeBtn.onclick = toggleMobileMenu;

        sidebar.appendChild(closeBtn);
        sidebar.appendChild(links);

        // Add Overlay
        const overlay = document.createElement('div');
        overlay.id = 'mobile-overlay';
        overlay.className = 'mobile-overlay';
        overlay.onclick = toggleMobileMenu;

        // Insert into DOM
        document.body.appendChild(sidebar);
        document.body.appendChild(overlay);

        // Insert Hamburger into Header (before Logo)
        const container = header.querySelector('.container');
        if (container) {
            container.insertBefore(hamburgerBtn, container.firstChild);

            // Extract Cart for Right Side
            const cartLinkOriginal = nav.querySelector('a[href="cart.html"]');
            if (cartLinkOriginal) {
                // Create a container for right icons if needed, or just append
                const rightIconContainer = document.createElement('div');
                rightIconContainer.className = 'mobile-right-icons';

                const cartBtnMobile = cartLinkOriginal.cloneNode(true);
                // Remove text, keep icon if possible or force icon
                cartBtnMobile.innerHTML = '<i class="fa-solid fa-cart-shopping"></i>';
                // Find cart count if it exists
                const originalCount = document.getElementById('cart-count');
                if (originalCount) {
                    const countSpan = document.createElement('span');
                    countSpan.id = 'mobile-cart-count';
                    countSpan.innerText = originalCount.innerText;
                    countSpan.className = 'mobile-cart-badge';
                    cartBtnMobile.appendChild(countSpan);

                    // Observe changes to original cart count
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            countSpan.innerText = mutation.target.innerText;
                        });
                    });
                    observer.observe(originalCount, { childList: true });
                }

                // FIX: Append cart button to container
                rightIconContainer.appendChild(cartBtnMobile);
                container.appendChild(rightIconContainer);
            }
        }

        // Trigger Auth UI Update now that mobile elements exist
        if (window.App && window.App.updateAuthUI) {
            window.App.updateAuthUI();
        }
    }

    function toggleMobileMenu() {
        const sidebar = document.getElementById('mobile-sidebar');
        const overlay = document.getElementById('mobile-overlay');

        if (sidebar && overlay) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
            document.body.classList.toggle('no-scroll');
        }
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupMobileMenu);
    } else {
        setupMobileMenu();
    }
})();
