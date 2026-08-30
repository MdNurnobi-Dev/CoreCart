const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminReviews.tsx', 'utf8');

// Add Settings icon to imports
code = code.replace(
  "import { CheckCircle, XCircle, Trash2, Search, MessageSquare, Star, ExternalLink } from 'lucide-react';",
  "import { CheckCircle, XCircle, Trash2, Search, MessageSquare, Star, ExternalLink, Settings as SettingsIcon } from 'lucide-react';"
);

// Add state for settings
const stateCode = `
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reviewSettings, setReviewSettings] = useState({
    auto_approve: false,
    spam_words: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    fetchReviews();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/admin/reviews/settings');
      setReviewSettings(data || { auto_approve: false, spam_words: '' });
    } catch (err) {
      console.error('Failed to fetch review settings:', err);
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await apiFetch('/admin/reviews/settings', {
        method: 'PUT',
        body: JSON.stringify(reviewSettings)
      });
      setIsSettingsOpen(false);
    } catch (err) {
      console.error('Failed to save review settings:', err);
      alert('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };
`;

code = code.replace(
  "useEffect(() => {\n    fetchReviews();\n  }, []);",
  stateCode
);

// Add settings button in header
const headerCode = `
          <div>
            <h1 className="text-[18px] md:text-[20px] font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Product Reviews
            </h1>
            <p className="text-[13px] text-gray-500 mt-1">Manage customer reviews and control spam.</p>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-[13px] font-medium rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
            Review Settings
          </button>
`;

code = code.replace(
  /<div>\s*<h1 className="text-\[18px\] md:text-\[20px\] font-bold text-gray-900 flex items-center gap-2">\s*<MessageSquare className="w-5 h-5 text-indigo-600" \/>\s*Product Reviews\s*<\/h1>\s*<p className="text-\[13px\] text-gray-500 mt-1">Manage customer reviews and control spam.<\/p>\s*<\/div>/,
  headerCode
);

// Add modal at the end
const modalCode = `
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[16px] shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-[16px] font-semibold text-gray-900">Review Settings</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[14px] font-medium text-gray-900 block">Auto-Approve Reviews</label>
                  <p className="text-[12px] text-gray-500 mt-0.5">Automatically approve new reviews unless they contain spam words.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewSettings({ ...reviewSettings, auto_approve: !reviewSettings.auto_approve })}
                  className={\`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none \${
                    reviewSettings.auto_approve ? 'bg-indigo-600' : 'bg-gray-200'
                  }\`}
                >
                  <span
                    className={\`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out \${
                      reviewSettings.auto_approve ? 'translate-x-4' : 'translate-x-0'
                    }\`}
                  />
                </button>
              </div>

              <div>
                <label className="text-[14px] font-medium text-gray-900 block mb-1">Blocked Spam Words</label>
                <p className="text-[12px] text-gray-500 mb-2">Comma-separated list of words. Reviews containing these words will be automatically rejected or marked as pending.</p>
                <textarea
                  value={reviewSettings.spam_words}
                  onChange={(e) => setReviewSettings({ ...reviewSettings, spam_words: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="e.g., scam, fake, worst, terrible"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-[16px] flex justify-end gap-3">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={isSavingSettings}
                className="px-4 py-2 text-[13px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(
  "    </div>\n  );\n}\n",
  "    </div>\n" + modalCode + "  );\n}\n"
);

fs.writeFileSync('src/pages/AdminReviews.tsx', code);
