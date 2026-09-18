import { useState } from 'react';
import { PlusCircle, MapPin, Upload, FileText, CheckCircle, ShieldCheck, Sparkles, AlertCircle, Hash, Tag } from 'lucide-react';
import RealMap from './RealMap';

interface NewCaseIntakeProps {
  apiBase: string;
  onCaseCreated: (caseId: number) => void;
  onNotice: (msg: string) => void;
}

export default function NewCaseIntake({ apiBase, onCaseCreated, onNotice }: NewCaseIntakeProps) {
  // Case info state
  const [caseNumber, setCaseNumber] = useState(`FIR-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [title, setTitle] = useState('');
  const [crimeType, setCrimeType] = useState('Financial Fraud');
  const [description, setDescription] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('Sector V, Salt Lake, Kolkata');
  const [latitude, setLatitude] = useState(22.5804);
  const [longitude, setLongitude] = useState(88.4282);

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLocationPicked = (lat: number, lng: number, approxAddr: string) => {
    setLatitude(lat);
    setLongitude(lng);
    setIncidentLocation(approxAddr);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseNumber.trim() || !title.trim()) {
      setError('Please provide a Case Reference / FIR Number and Case Title.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Create Case in PostgreSQL
      const caseRes = await fetch(`${apiBase}/cases/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('investra_token') || ''}` },
        body: JSON.stringify({
          case_number: caseNumber.trim(),
          title: title.trim(),
          crime_type: crimeType,
          description: description.trim(),
          incident_location: incidentLocation.trim(),
          latitude: latitude,
          longitude: longitude,
          status: 'OPEN',
        })
      });

      if (!caseRes.ok) {
        const errData = await caseRes.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to create case record in PostgreSQL.');
      }

      const createdCase = await caseRes.json();

      // 2. Upload any attached case files to the new case
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('case_id', String(createdCase.id));

          const uploadRes = await fetch(`${apiBase}/documents/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('investra_token') || ''}` },
            body: formData
          });
          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}));
            throw new Error(errData.detail || `Failed to upload ${file.name}.`);
          }
        }
      }

      onNotice(`Case ${createdCase.case_number} successfully registered in PostgreSQL with ${selectedFiles.length} case file(s).`);
      onCaseCreated(createdCase.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during case registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-8">
      {/* Page Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-blue-400 mb-1">
            <PlusCircle size={15} />
            <span>NEW CASE INTAKE &amp; EVIDENCE UPLOAD</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Dedicated Case Registration &amp; File Upload</h1>
          <p className="text-slate-400 text-sm mt-1">
            Create an official police case record, pinpoint crime scene on the real map, and attach case documents for AI extraction.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl flex items-center space-x-3 text-red-300 text-sm">
          <AlertCircle size={20} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: Case Particulars */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
              <FileText size={18} className="text-blue-400" />
              <h2 className="text-base font-bold text-white">1. Case Identification &amp; Details</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">
                  Case Reference / FIR Number *
                </label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">
                  Crime Classification *
                </label>
                <div className="relative">
                  <Tag size={14} className="absolute left-3 top-3 text-slate-500" />
                  <select
                    value={crimeType}
                    onChange={(e) => setCrimeType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Financial Fraud">Financial Fraud / Hawala</option>
                    <option value="Vehicle Hijacking">Vehicle Theft / Hijacking</option>
                    <option value="Cyber Extortion">Cyber Extortion / Identity Theft</option>
                    <option value="Armed Robbery">Armed Robbery / Heist</option>
                    <option value="Narcotics">Narcotics Trafficking</option>
                    <option value="Homicide">Homicide Investigation</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1">
                Case Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Sector V Financial Hawala Syndicate Incident"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1">
                Investigation Brief / Initial Complaint
              </label>
              <textarea
                rows={4}
                placeholder="Enter witness statements, suspect descriptions, vehicle numbers (e.g. WB12AB1234), phone numbers, or modus operandi..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-blue-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Case Files Upload Box */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <label className="block text-slate-400 text-xs font-semibold">
                Attach Case Files &amp; Evidentiary Documents (.pdf, .txt, .csv)
              </label>
              <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-4 text-center transition bg-slate-950/40 relative">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload size={22} className="mx-auto text-blue-400 mb-1" />
                <p className="text-xs text-slate-300 font-medium">Click or drag &amp; drop case files here</p>
                <p className="text-[11px] text-slate-500 mt-0.5">PyMuPDF / text parsing + SHA-256 chain of custody hashing</p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800 text-xs">
                      <div className="flex items-center space-x-2 truncate">
                        <FileText size={14} className="text-blue-400 shrink-0" />
                        <span className="truncate text-slate-200">{file.name}</span>
                        <span className="text-[10px] text-slate-500">({Math.round(file.size / 1024)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-red-400 hover:text-red-300 ml-2 font-bold"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Crime Scene Location on Real Map */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <MapPin size={18} className="text-red-400" />
                <h2 className="text-base font-bold text-white">2. Crime Scene Pinpoint on Real Map</h2>
              </div>
              <span className="text-xs text-blue-400 font-medium flex items-center space-x-1">
                <Sparkles size={13} />
                <span>Interactive Pin</span>
              </span>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1">
                Incident Location Landmark / Address
              </label>
              <input
                type="text"
                value={incidentLocation}
                onChange={(e) => setIncidentLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Real Map Component with interactive coordinate picker */}
            <div className="flex-1 min-h-[340px] rounded-xl overflow-hidden border border-slate-800 relative">
              <RealMap
                crimeLocation={{
                  lat: latitude,
                  lng: longitude,
                  label: incidentLocation,
                  caseNumber: caseNumber,
                  crimeType: crimeType
                }}
                interactivePicker={true}
                onLocationSelect={handleLocationPicked}
                height="340px"
              />
            </div>

            {/* Coordinates Readout */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Latitude</span>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="bg-transparent text-cyan-300 font-mono font-semibold focus:outline-none w-full"
                />
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Longitude</span>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="bg-transparent text-cyan-300 font-mono font-semibold focus:outline-none w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <ShieldCheck size={20} className="text-blue-400" />
            <span>
              Saving will persist the case in PostgreSQL and automatically trigger the 6-agent police station coordination pipeline.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <span>Persisting to PostgreSQL...</span>
            ) : (
              <>
                <CheckCircle size={18} />
                <span>Register Case &amp; Initialize AI Analysis</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
