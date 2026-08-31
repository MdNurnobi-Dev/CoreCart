const fs = require('fs');

// AdminPaymentGateways
let code = fs.readFileSync('src/pages/AdminPaymentGateways.tsx', 'utf8');
code = code.replace(
  "} from 'lucide-react';",
  "  Upload,\n  Loader2\n} from 'lucide-react';"
);
fs.writeFileSync('src/pages/AdminPaymentGateways.tsx', code);

// AdminSettings
code = fs.readFileSync('src/pages/AdminSettings.tsx', 'utf8');
if (!code.includes("import { apiFetch")) {
  code = code.replace(
    "import React, { useState, useEffect, useRef } from 'react';",
    "import React, { useState, useEffect, useRef } from 'react';\nimport { apiFetch } from '../lib/utils';"
  );
}
// Add Loader2 and Upload
code = code.replace(
  "} from 'lucide-react';",
  "  Loader2,\n  Upload\n} from 'lucide-react';"
);
fs.writeFileSync('src/pages/AdminSettings.tsx', code);
