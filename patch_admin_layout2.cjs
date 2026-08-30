const fs = require('fs');
let code = fs.readFileSync('src/components/AdminLayout.tsx', 'utf8');

const regex = /(<NavLink[\s\S]*?to="\/admin\/discounts"[\s\S]*?<\/NavLink>)/;

const linkToAdd = `
                  <NavLink
                    to="/admin/reviews"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      \`flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors \${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }\`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" />
                      <span>Reviews</span>
                    </div>
                  </NavLink>`;

code = code.replace(regex, "$1" + linkToAdd);

if (!code.includes("Star,")) {
    code = code.replace(
        "import { LayoutDashboard", 
        "import { Star, LayoutDashboard"
    );
}

fs.writeFileSync('src/components/AdminLayout.tsx', code);
