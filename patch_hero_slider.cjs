const fs = require('fs');
let code = fs.readFileSync('src/components/HeroSlider.tsx', 'utf8');

code = code.replace(
  'export default function HeroSlider() {',
  'export default function HeroSlider({ banners }: { banners?: any[] }) {'
);

code = code.replace(
  'const [current, setCurrent] = useState(0);',
  `const [current, setCurrent] = useState(0);
  const activeSlides = banners && banners.length > 0 ? banners : slides;
`
);

// Fix the lengths
code = code.replace(/slides\.length/g, 'activeSlides.length');
code = code.replace(/slides\.map/g, 'activeSlides.map');

// Replace property mappings
code = code.replace(/slide\.image/g, '(slide.image_url || slide.image)');
code = code.replace(/slide\.cta/g, '(slide.cta || "Shop Now")');

fs.writeFileSync('src/components/HeroSlider.tsx', code);
