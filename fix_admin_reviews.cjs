const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminReviews.tsx', 'utf8');

// The file currently has:
//       </div>
//     </div>
//       {isSettingsOpen && ( ... )}
//   );
// }
// We want to put the modal inside the main absolute inset-0 div, which ends right before the modal.

code = code.replace(
  "      </div>\n    </div>\n      {isSettingsOpen",
  "      </div>\n      {isSettingsOpen"
);

// We still need to close the main div
code = code.replace(
  "      )}\n  );\n}",
  "      )}\n    </div>\n  );\n}"
);

fs.writeFileSync('src/pages/AdminReviews.tsx', code);
