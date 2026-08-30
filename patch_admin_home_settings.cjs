const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminHomeSettings.tsx', 'utf8');

// Replace import to include GripVertical
code = code.replace(
  "import { Plus, Edit2, Trash2, CheckCircle, XCircle, MoveUp, MoveDown } from 'lucide-react';",
  "import { Plus, Edit2, Trash2, CheckCircle, XCircle, MoveUp, MoveDown, GripVertical } from 'lucide-react';"
);

// Add Drag & Drop functions
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
    
    const newSections = [...sections];
    const draggedItem = newSections[draggedIdx];
    
    newSections.splice(draggedIdx, 1);
    newSections.splice(index, 0, draggedItem);
    
    // update sort orders
    const updated = newSections.map((sec, idx) => ({ ...sec, sort_order: idx + 1 }));
    setSections(updated);
    setDraggedIdx(index);
  };

  const handleDragEnd = async () => {
    setDraggedIdx(null);
    try {
      const items = sections.map((sec) => ({ id: sec.id, sort_order: sec.sort_order }));
      await apiFetch('/admin/home-sections/reorder', {
        method: 'POST',
        body: JSON.stringify({ items })
      });
      fetchSections();
    } catch (err) {
      console.error(err);
    }
  };
`;

code = code.replace(
  'const [loading, setLoading] = useState(true);',
  'const [loading, setLoading] = useState(true);\n' + dndFunctions
);

// Update table rows
// Old: <tr key={section.id} className="hover:bg-slate-50 transition-colors">
// New: <tr ... draggable onDragStart, etc.>
code = code.replace(
  /<tr key=\{section\.id\} className="hover:bg-slate-50 transition-colors">/g,
  '<tr key={section.id} className="hover:bg-slate-50 transition-colors cursor-move group" draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }} onDragEnd={handleDragEnd}>'
);

// We need index in map
code = code.replace(
  '{sections.map((section) => (',
  '{sections.map((section, index) => ('
);

// Add drag handle
code = code.replace(
  '<td className="px-3 py-2 font-semibold text-slate-800">{section.title}</td>',
  '<td className="px-3 py-2 font-semibold text-slate-800 flex items-center gap-2"><GripVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-600" /> {section.title}</td>'
);

fs.writeFileSync('src/pages/AdminHomeSettings.tsx', code);
