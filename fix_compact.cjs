const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminReviews.tsx', 'utf8');

// Fix headers and padding
code = code.replace(
  'text-[18px] md:text-[20px] font-bold',
  'text-[16px] font-bold tracking-tight'
);
code = code.replace(
  'text-[13px] text-gray-500 mt-1',
  'text-[12px] text-gray-500 mt-0.5'
);
code = code.replace(
  'gap-4 mb-6',
  'gap-3 mb-4'
);
code = code.replace(
  'p-3 md:p-4 rounded-[12px] border border-gray-200 shadow-sm mb-6',
  'p-3 rounded-lg border border-gray-200 shadow-sm mb-4'
);
code = code.replace(
  'flex-1 bg-white border border-gray-200 rounded-[12px] shadow-sm',
  'bg-white border border-gray-200 rounded-lg shadow-sm'
);

// We need to remove flex-1 and min-h-0 and overflow-auto so it scrolls naturally in the page.
code = code.replace(
  '<div className="overflow-auto flex-1 p-0">',
  '<div className="overflow-x-auto">'
);
code = code.replace(
  'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-0',
  'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden'
);

// Review Settings Modal Fixes
code = code.replace(
  'rounded-[12px]',
  'rounded-lg'
);
code = code.replace(
  'rounded-b-[12px]',
  'rounded-b-lg'
);

fs.writeFileSync('src/pages/AdminReviews.tsx', code);
