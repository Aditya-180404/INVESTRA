import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface CaseUpdateModalProps {
  apiBase: string;
  caseData: {
    id: number;
    number: string;
    title: string;
    description: string;
    status: string;
    crime_type?: string;
    incident_location?: string;
    latitude?: number;
    longitude?: number;
  };
  onClose: () => void;
  onUpdated: () => void;
  onNotice: (msg: string) => void;
}

export default function CaseUpdateModal({
  apiBase,
  caseData,
  onClose,
  onUpdated,
  onNotice
}: CaseUpdateModalProps) {
  const [status, setStatus] = useState(caseData.status || 'OPEN');
  const [title, setTitle] = useState(caseData.title || '');
  const [description, setDescription] = useState(caseData.description || '');
  const [location, setLocation] = useState(caseData.incident_location || '');
  const [note, setNote] = useState('');
  const [additionalFile, setAdditionalFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Update Case metadata
      const res = await fetch(`${apiBase}/cases/${caseData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('investra_token') || ''}` },
        body: JSON.stringify({
          status: status,
          title: title.trim(),
          description: description.trim(),
          incident_location: location.trim(),
          investigator_note: note.trim() || undefined
        })
      });

      if (!res.ok) throw new Error('Failed to update case.');

      // 2. Upload additional file if selected
      if (additionalFile) {
        const formData = new FormData();
        formData.append('file', additionalFile);
        formData.append('case_id', String(caseData.id));
        formData.append('officer_badge', 'WB-IPS-4920');

        const uploadRes = await fetch(`${apiBase}/documents/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('investra_token') || ''}` },
          body: formData
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.detail || `Failed to upload ${additionalFile.name}.`);
        }
      }

      onNotice(`Case ${caseData.number} updated successfully in PostgreSQL.`);
      onUpdated();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs font-mono text-blue-400">POLICE CASE FILE UPDATE</span>
            <h3 className="text-lg font-bold text-white">Update Case: {caseData.number}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Investigation Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:border-blue-500 focus:outline-none"
              >
                <option value="OPEN">OPEN (Initial Intake)</option>
                <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
                <option value="ESCALATED">ESCALATED (Cross-Precinct)</option>
                <option value="RESOLVED">RESOLVED (Charges Filed)</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Crime Scene Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Case Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Case Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Append Investigator Supplementary Note</label>
            <textarea
              rows={2}
              placeholder="e.g. Additional witness statement taken; vehicle confirmed at toll plaza."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Attach Supplementary Case Document</label>
            <input
              type="file"
              accept=".pdf,.txt,.csv"
              onChange={(e) => setAdditionalFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-slate-300 text-xs bg-slate-950 border border-slate-700 rounded-lg p-1.5"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center space-x-2 shadow-lg shadow-blue-600/20"
            >
              <Save size={15} />
              <span>{isSaving ? 'Updating...' : 'Save Case Updates'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
