CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_name VARCHAR(255) NOT NULL,
  rating TINYINT,
  content TEXT NOT NULL,
  source VARCHAR(50) DEFAULT 'website',
  is_approved BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  featured_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_reviews_featured ON reviews(is_featured, featured_order);
CREATE INDEX idx_reviews_approved ON reviews(is_approved, created_at);
