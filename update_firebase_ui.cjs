const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminLiveChat.tsx', 'utf8');

const firebaseCard = `
            {/* Firebase Database Credentials Card */}
            <div className="bg-white p-3.5 sm:p-4 rounded-[12px] border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-orange-500" />
                  <h3 className="font-semibold text-[13px] text-gray-900">Firebase Database Credentials</h3>
                </div>
              </div>
              
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Firebase Config (JSON format)
                </label>
                <textarea
                  value={typeof settings.firebase_config === 'string' ? settings.firebase_config : JSON.stringify(settings.firebase_config, null, 2)}
                  onChange={e => setSettings({ ...settings, firebase_config: e.target.value })}
                  placeholder={'{\\n  "apiKey": "...",\\n  "authDomain": "...",\\n  "projectId": "...",\\n  "databaseURL": "..."\\n}'}
                  rows={6}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-lg p-2.5 text-[11px] font-mono text-gray-800 outline-none resize-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Paste your Firebase Project configuration JSON here. This credential is used for external live sync integrations.</span>
              </div>
            </div>
`;

code = code.replace(
  "          {/* Save Button */}",
  firebaseCard + "\n          {/* Save Button */}"
);

fs.writeFileSync('src/pages/AdminLiveChat.tsx', code);
