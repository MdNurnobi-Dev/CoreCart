const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// 1. Imports
if (!code.includes('useHomeCustomization')) {
  code = code.replace(
    "import HeroSlider from '../components/HeroSlider';",
    "import { useHomeCustomization } from '../hooks/useHomeCustomization';\nimport HeroSlider from '../components/HeroSlider';"
  );
}

// 2. Add hook call
if (!code.includes('const { banners, homeSections, uiSettings, loading: homeLoading } = useHomeCustomization();')) {
  code = code.replace(
    'export default function Home() {',
    'export default function Home() {\n  const { banners, homeSections, uiSettings, loading: homeLoading } = useHomeCustomization();\n'
  );
}

// 3. Update HeroSlider
code = code.replace(
  '<HeroSlider />',
  '<HeroSlider banners={banners.filter(b => b.position === "hero")} />'
);

// 4. Update PromoBanners - Wait, PromoBanners doesn't take banners prop right now, but I can just wrap it or let it handle itself.
// Let's modify PromoBanners to take banners prop as well!
fs.writeFileSync('src/pages/Home.tsx', code);
