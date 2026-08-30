const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminReviews.tsx', 'utf8');

// Replace root div
code = code.replace(
  '<div className="absolute inset-0 flex flex-col bg-gray-50/50">\n      <div className="px-4 py-4 md:px-6 md:py-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col h-full">',
  '<div className="space-y-4 pb-8">'
);

// We need to remove the matching </div> for the inner one that we just removed.
// We removed two divs and replaced with one. Let's look at the end of the file.

fs.writeFileSync('src/pages/AdminReviews.tsx', code);
