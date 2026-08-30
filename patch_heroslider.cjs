const fs = require('fs');
const file = 'src/components/HeroSlider.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'const activeSlides = banners && banners.length > 0 ? banners : slides;',
  `const activeSlides = banners && banners.length > 0 ? banners.map((b, i) => {
    const colors = ["from-slate-900/90 to-slate-900/40", "from-blue-900/90 to-blue-900/40", "from-indigo-900/90 to-indigo-900/40", "from-emerald-900/90 to-emerald-900/40", "from-purple-900/90 to-purple-900/40"];
    return {
      ...b,
      color: colors[i % colors.length],
      cta: b.link_url ? "Explore Now" : "Shop Now"
    };
  }) : slides;`
);

fs.writeFileSync(file, code);
