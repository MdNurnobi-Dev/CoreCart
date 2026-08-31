const fs = require('fs');

// Fix AdminPaymentGateways
let code = fs.readFileSync('src/pages/AdminPaymentGateways.tsx', 'utf8');
code = code.replace('<AlertCircle, className', '<AlertCircle className');
code = code.replace('AlertCircle,', 'AlertCircle,'); // This is fine if it replaced import, but let's check the import block
code = code.replace("AlertCircle,\n  Upload,", "AlertCircle,\n  Upload,");
fs.writeFileSync('src/pages/AdminPaymentGateways.tsx', code);

// Fix AdminSettings
code = fs.readFileSync('src/pages/AdminSettings.tsx', 'utf8');
code = code.replace("Headphones\n  Loader2,\n  Upload\n} from 'lucide-react';", "Headphones,\n  Loader2,\n  Upload\n} from 'lucide-react';");
fs.writeFileSync('src/pages/AdminSettings.tsx', code);
