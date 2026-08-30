const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminBanners.tsx', 'utf8');

code = code.replace(
  "import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';",
  "import { Plus, Edit2, Trash2, CheckCircle, XCircle, GripVertical } from 'lucide-react';"
);

const dndFunctions = `
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.parentNode);
    e.dataTransfer.setDragImage(e.currentTarget.parentNode, 20, 20);
  };

  const handleDragOver = (index: number) => {
    if (draggedIdx === null || draggedIdx === index) return;
    
    const newBanners = [...banners];
    const draggedItem = newBanners[draggedIdx];
    
    newBanners.splice(draggedIdx, 1);
    newBanners.splice(index, 0, draggedItem);
    
    const updated = newBanners.map((ban, idx) => ({ ...ban, sort_order: idx + 1 }));
    setBanners(updated);
    setDraggedIdx(index);
  };

  const handleDragEnd = async () => {
    setDraggedIdx(null);
    try {
      const items = banners.map((ban) => ({ id: ban.id, sort_order: ban.sort_order }));
      await apiFetch('/admin/banners/reorder', {
        method: 'POST',
        body: JSON.stringify({ items })
      });
      fetchBanners();
    } catch (err) {
      console.error(err);
    }
  };
`;

code = code.replace(
  'const [loading, setLoading] = useState(true);',
  'const [loading, setLoading] = useState(true);\n' + dndFunctions
);

code = code.replace(
  /<tr key=\{banner\.id\} className="hover:bg-slate-50 transition-colors">/g,
  '<tr key={banner.id} className="hover:bg-slate-50 transition-colors cursor-move group" draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }} onDragEnd={handleDragEnd}>'
);

code = code.replace(
  '{banners.map((banner) => (',
  '{banners.map((banner, index) => ('
);

code = code.replace(
  '<td className="px-3 py-2 font-semibold text-slate-800">{banner.title}</td>',
  '<td className="px-3 py-2 font-semibold text-slate-800 flex items-center gap-2"><GripVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-600" /> {banner.title}</td>'
);

fs.writeFileSync('src/pages/AdminBanners.tsx', code);
