const fs = require('fs');
let code = fs.readFileSync('src/components/AdminLayout.tsx', 'utf8');

// 1. Add state variable
if (!code.includes('isCustomizeOpen')) {
  code = code.replace(
    'const [isSystemOpen, setIsSystemOpen] = useState(true);',
    'const [isSystemOpen, setIsSystemOpen] = useState(true);\n  const [isCustomizeOpen, setIsCustomizeOpen] = useState(true);'
  );
}

// 2. Add active logic
if (!code.includes('isCustomizeActive')) {
  code = code.replace(
    'const isSystemActive =',
    'const isCustomizeActive = [\'/admin/customize\'].some(path => location.pathname.startsWith(path));\n  const isSystemActive ='
  );
}

// 3. Add Palette Icon to imports
if (!code.includes('Palette')) {
  code = code.replace(
    'Sliders,',
    'Sliders,\n  Palette,\n  LayoutTemplate,\n  Image as ImageIcon,'
  );
}

// 4. Add the group UI
const customizeGroup = `
            {/* 6. CUSTOMIZE GROUP */}
            <div className="space-y-0.5 pt-0.5">
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
                className={\`w-full flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-bold tracking-tight uppercase transition-colors cursor-pointer \${
                  isCustomizeActive ? 'text-slate-800 bg-slate-100/60' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'
                }\`}
              >
                <div className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-pink-500" />
                  <span>Customize</span>
                </div>
                {isCustomizeOpen ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
              </button>
              {isCustomizeOpen && (
                <div className="pl-3.5 pr-1 space-y-0.5 border-l border-slate-200 ml-2.5 my-0.5">
                  <NavLink
                    to="/admin/customize/banners"
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
                      <ImageIcon className="w-3 h-3 text-emerald-500" />
                      <span>Banners</span>
                    </div>
                  </NavLink>
                  <NavLink
                    to="/admin/customize/home"
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
                      <LayoutTemplate className="w-3 h-3 text-indigo-500" />
                      <span>Home Page</span>
                    </div>
                  </NavLink>
                </div>
              )}
            </div>
`;

if (!code.includes('6. CUSTOMIZE GROUP')) {
  code = code.replace('{/* 5. SETTINGS & SYSTEM GROUP */}', customizeGroup + '\n            {/* 5. SETTINGS & SYSTEM GROUP */}');
  fs.writeFileSync('src/components/AdminLayout.tsx', code);
}
