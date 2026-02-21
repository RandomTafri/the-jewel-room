-- Create info_pages table for CMS
CREATE TABLE IF NOT EXISTS info_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT DEFAULT '',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert default INFO pages
INSERT INTO info_pages (slug, title, content, display_order) VALUES
('about-us', 'About Us', '<h2>About Shree Roop Creative</h2><p>Welcome to Shree Roop Creative, your trusted destination for exquisite artificial jewelry.</p>', 1),
('contact-us', 'Contact Us', '<h2>Get In Touch</h2><p>We''d love to hear from you!</p><p><strong>Phone:</strong> 8397803333</p><p><strong>Email:</strong> shreeroopcreative@gmail.com</p>', 2),
('privacy-policy', 'Privacy Policy', '<h2>Privacy Policy</h2><p>Your privacy is important to us. This policy outlines how we collect and use your information.</p>', 3),
('terms-conditions', 'Terms & Conditions', '<h2>Terms & Conditions</h2><p>Please read these terms carefully before using our services.</p>', 4),
('shipping-returns', 'Shipping & Returns', '<h2>Shipping & Returns</h2><p>Information about our shipping policy and return process.</p>', 5)
ON DUPLICATE KEY UPDATE slug = slug;
