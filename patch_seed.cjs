const fs = require('fs');
let code = fs.readFileSync('src/server/db.ts', 'utf8');

const seedCode = `
    // Seed Banners if empty
    const bannerCheck = await this.query('SELECT COUNT(*) as count FROM banners');
    if (parseInt(bannerCheck.rows[0].count) === 0) {
      await this.query(\`
        INSERT INTO banners (title, subtitle, image_url, position, sort_order, is_active) VALUES 
        ('Next-Gen Workstations', 'Up to 20% off on premium laptops for creators and professionals.', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=1200', 'hero', 1, 1),
        ('The Latest Smartphones', 'Upgrade your mobile experience with our new flagship arrivals.', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=1200', 'hero', 2, 1),
        ('Immersive Audio', 'Premium noise-canceling headphones for the ultimate sound.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1200', 'hero', 3, 1),
        ('Premium Audio', 'Immersive sound experience.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=300', 'promotional', 4, 1),
        ('Laptops & Workstations', 'Ultra-light laptops, productivity rigs & accessories.', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=300', 'promotional', 5, 1)
      \`);
    }

    // Seed Home Sections if empty
    const sectionCheck = await this.query('SELECT COUNT(*) as count FROM home_sections');
    if (parseInt(sectionCheck.rows[0].count) === 0) {
      await this.query(\`
        INSERT INTO home_sections (title, type, limit_count, sort_order, is_active) VALUES 
        ('Trending Now', 'trending', 6, 1, 1),
        ('Best Sellers', 'best_selling', 6, 2, 1)
      \`);
    }

    // Check if products exist
`;

code = code.replace(
  '// Check if products exist, if not seed 50 products',
  seedCode
);

fs.writeFileSync('src/server/db.ts', code);
