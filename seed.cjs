const { pool } = require('./dist/server.cjs');

async function run() {
  try {
    const banners = await pool.query("SELECT * FROM banners");
    if (banners.rows.length === 0) {
      await pool.query("INSERT INTO banners (title, subtitle, image_url, position, sort_order, is_active) VALUES ('Next-Gen Workstations', 'Up to 20% off on premium laptops for creators and professionals.', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=1200', 'hero', 1, 1)");
      await pool.query("INSERT INTO banners (title, subtitle, image_url, position, sort_order, is_active) VALUES ('The Latest Smartphones', 'Upgrade your mobile experience with our new flagship arrivals.', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=1200', 'hero', 2, 1)");
      await pool.query("INSERT INTO banners (title, subtitle, image_url, position, sort_order, is_active) VALUES ('Immersive Audio', 'Premium noise-canceling headphones for the ultimate sound.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1200', 'hero', 3, 1)");
      await pool.query("INSERT INTO banners (title, subtitle, image_url, position, sort_order, is_active) VALUES ('Premium Audio', 'Immersive sound experience.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=300', 'promotional', 4, 1)");
      await pool.query("INSERT INTO banners (title, subtitle, image_url, position, sort_order, is_active) VALUES ('Laptops & Workstations', 'Ultra-light laptops, productivity rigs & accessories.', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=300', 'promotional', 5, 1)");
      console.log("Seeded banners");
    }
    
    const sections = await pool.query("SELECT * FROM home_sections");
    if (sections.rows.length === 0) {
      await pool.query("INSERT INTO home_sections (title, type, limit_count, sort_order, is_active) VALUES ('Trending Now', 'trending', 6, 1, 1)");
      await pool.query("INSERT INTO home_sections (title, type, limit_count, sort_order, is_active) VALUES ('Best Sellers', 'best_selling', 6, 2, 1)");
      console.log("Seeded sections");
    }
  } catch (err) {
    console.error(err);
  }
}
run();
