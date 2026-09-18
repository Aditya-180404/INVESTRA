import React, { useState, useEffect } from 'react';
import {
  FileText, UserCheck, AlertTriangle, MapPin, Users, Upload, CheckSquare,
  ArrowRight, ArrowLeft, Plus, Trash2, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import type { PoliceStation } from '../types';
import { InteractiveMapPicker } from './InteractiveMapPicker';

interface NewFIRWizardProps {
  onNavigate: (path: string) => void;
}

export const NewFIRWizard: React.FC<NewFIRWizardProps> = ({ onNavigate }) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stations, setStations] = useState<PoliceStation[]>([]);

  // Step 1: FIR Information
  const [firNumber, setFirNumber] = useState(`FIR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [caseNumber, setCaseNumber] = useState(`CASE-${new Date().getFullYear()}-WB-${Math.floor(100 + Math.random() * 900)}`);
  const [firDate, setFirDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStationId, setSelectedStationId] = useState<number | undefined>(undefined);
  const [selectedStationName, setSelectedStationName] = useState('Salt Lake Police Station');
  const [crimeType, setCrimeType] = useState('Financial Fraud');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [caseStatus] = useState<any>('OPEN');

  // Step 2: Complainant
  const [complainantName, setComplainantName] = useState('');
  const [complainantContact, setComplainantContact] = useState('');
  const [complainantAddress, setComplainantAddress] = useState('');
  const [complainantStatement, setComplainantStatement] = useState('');

  // Step 3: Incident Details
  const [caseTitle, setCaseTitle] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState('14:30');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Step 4: Location
  const [address, setAddress] = useState('Sector V, Salt Lake, Kolkata');
  const [district, setDistrict] = useState('Bidhannagar');
  const [latitude, setLatitude] = useState(22.5731);
  const [longitude, setLongitude] = useState(88.4332);

  // Step 5: Entities
  const [entities, setEntities] = useState<{
    entity_type: string;
    value: string;
    role?: string;
    metadata?: Record<string, any>;
  }[]>([]);

  // Entity modal/entry states
  const [newEntityType, setNewEntityType] = useState('PERSON');
  const [newEntityValue, setNewEntityValue] = useState('');
  const [newEntityRole, setNewEntityRole] = useState('SUSPECT');
  const [newEntityDetail, setNewEntityDetail] = useState('');

  // Step 6: Evidence
  const [uploadedFiles, setUploadedFiles] = useState<{
    file: File;
    status: 'Ready to Upload' | 'Uploading' | 'Processing' | 'Ready' | 'Failed';
    hash?: string;
    error?: string;
  }[]>([]);

  useEffect(() => {
    api.stations.list({ status: 'ACTIVE' })
      .then((data) => {
        setStations(data);
        if (data.length > 0) {
          setSelectedStationId(data[0].id);
          setSelectedStationName(data[0].name);
        }
      })
      .catch(() => {});
  }, []);

  const addEntityItem = () => {
    if (!newEntityValue.trim()) return;
    const meta: Record<string, any> = {};
    if (newEntityDetail.trim()) {
      meta.notes = newEntityDetail.trim();
    }
    setEntities([
      ...entities,
      {
        entity_type: newEntityType,
        value: newEntityValue.trim(),
        role: newEntityType === 'PERSON' ? newEntityRole : 'OTHER',
        metadata: meta
      }
    ]);
    setNewEntityValue('');
    setNewEntityDetail('');
  };

  const removeEntityItem = (index: number) => {
    setEntities(entities.filter((_, i) => i !== index));
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newItems = files.map((file) => ({
        file,
        status: 'Ready to Upload' as const
      }));
      setUploadedFiles([...uploadedFiles, ...newItems]);
    }
  };

  const removeFileItem = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  async function submitFIR(isDraft = false) {
    setError('');
    setSubmitting(true);

    try {
      // 1. Prepare Case payload
      const payload = {
        fir_number: firNumber.trim(),
        case_number: caseNumber.trim(),
        fir_date: firDate ? new Date(firDate).toISOString() : new Date().toISOString(),
        title: caseTitle.trim() || `${crimeType} incident at ${address}`,
        crime_type: crimeType,
        description: incidentDescription.trim(),
        incident_date: incidentDate ? new Date(`${incidentDate}T${incidentTime || '00:00'}:00Z`).toISOString() : null,
        incident_time: incidentTime,
        incident_location: address.trim(),
        district: district.trim(),
        latitude,
        longitude,
        status: isDraft ? 'DRAFT' : caseStatus,
        priority,
        police_station_id: selectedStationId,
        police_station: selectedStationName,
        complainant_name: complainantName.trim() || null,
        complainant_contact: complainantContact.trim() || null,
        complainant_address: complainantAddress.trim() || null,
        complainant_statement: complainantStatement.trim() || null,
        additional_notes: additionalNotes.trim() || null,
        entities
      };

      // 2. Transactionally create Case
      const createdCase = await api.cases.create(payload);

      // 3. Upload and index evidence files if any
      if (uploadedFiles.length > 0) {
        for (let i = 0; i < uploadedFiles.length; i++) {
          try {
            await api.documents.upload(createdCase.id, uploadedFiles[i].file);
          } catch (fileErr: any) {
            console.error(`Failed to upload ${uploadedFiles[i].file.name}:`, fileErr);
          }
        }
      }

      // Step 8: Submission success -> redirect to Case Workspace
      onNavigate(`/police/cases/${createdCase.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit FIR. Please check all fields.');
      setSubmitting(false);
    }
  }

  const stepsList = [
    { num: 1, title: 'FIR Information', icon: FileText },
    { num: 2, title: 'Complainant', icon: UserCheck },
    { num: 3, title: 'Incident Details', icon: AlertTriangle },
    { num: 4, title: 'Location', icon: MapPin },
    { num: 5, title: 'Entities', icon: Users },
    { num: 6, title: 'Evidence', icon: Upload },
    { num: 7, title: 'Review', icon: CheckSquare },
  ];

  return (
    <div className="new-fir-wizard">
      <div className="wizard-head">
        <div>
          <span className="badge badge-primary">STATUTORY PROCEDURE</span>
          <h1>New FIR / Case Registration</h1>
          <p>Official investigation intake workflow with server-side validation and audit logging.</p>
        </div>
      </div>

      {/* 8-Step Progress Bar */}
      <div className="wizard-stepper">
        {stepsList.map((s) => {
          const Icon = s.icon;
          const isComplete = step > s.num;
          const isActive = step === s.num;
          return (
            <div
              key={s.num}
              className={`step-bubble ${isActive ? 'active' : ''} ${isComplete ? 'completed' : ''}`}
              onClick={() => step > s.num && setStep(s.num)}
            >
              <div className="step-circle">
                {isComplete ? <CheckCircle2 size={16} /> : <Icon size={16} />}
              </div>
              <span className="step-label">
                Step {s.num}: {s.title}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Step Contents */}
      <div className="wizard-body card">
        {/* STEP 1: FIR Information */}
        {step === 1 && (
          <div className="step-pane">
            <h2>Step 1 — FIR & Jurisdiction Information</h2>
            <p className="subtitle">Record formal reference codes, registering precinct, and classification.</p>
            <div className="form-grid-2">
              <div className="form-group">
                <label>FIR Reference Number *</label>
                <input
                  type="text"
                  required
                  value={firNumber}
                  onChange={(e) => setFirNumber(e.target.value)}
                  placeholder="e.g. FIR-2026-0042"
                />
                <small>Official state FIR number (server validates uniqueness).</small>
              </div>
              <div className="form-group">
                <label>Case Tracking Number *</label>
                <input
                  type="text"
                  required
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="e.g. CASE-2026-WB-101"
                />
                <small>Investra case identifier.</small>
              </div>
              <div className="form-group">
                <label>FIR Registration Date</label>
                <input
                  type="date"
                  value={firDate}
                  onChange={(e) => setFirDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Registering Police Station *</label>
                <select
                  value={selectedStationId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedStationId(id);
                    const st = stations.find((s) => s.id === id);
                    if (st) setSelectedStationName(st.name);
                  }}
                >
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.code}) — {st.district}
                    </option>
                  ))}
                  {!stations.length && (
                    <option value="">Salt Lake Police Station (Default)</option>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>Primary Crime Category</label>
                <select value={crimeType} onChange={(e) => setCrimeType(e.target.value)}>
                  <option>Financial Fraud</option>
                  <option>Cybercrime</option>
                  <option>Vehicle Theft</option>
                  <option>Narcotics</option>
                  <option>Burglary / Robbery</option>
                  <option>Homicide / Violent Crime</option>
                  <option>Extortion</option>
                  <option>Missing Person</option>
                </select>
              </div>
              <div className="form-group">
                <label>Investigation Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                  <option value="HIGH">HIGH Priority (Immediate Response)</option>
                  <option value="MEDIUM">MEDIUM Priority (Standard Follow-up)</option>
                  <option value="LOW">LOW Priority (Routine Queue)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Complainant */}
        {step === 2 && (
          <div className="step-pane">
            <h2>Step 2 — Complainant Details</h2>
            <p className="subtitle">Structured information about the individual lodging the initial report.</p>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Complainant Full Name *</label>
                <input
                  type="text"
                  required
                  value={complainantName}
                  onChange={(e) => setComplainantName(e.target.value)}
                  placeholder="Full name of informant or complainant"
                />
              </div>
              <div className="form-group">
                <label>Contact Phone / Email</label>
                <input
                  type="text"
                  value={complainantContact}
                  onChange={(e) => setComplainantContact(e.target.value)}
                  placeholder="+91 98300 00000 or email"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Residential / Work Address</label>
              <input
                type="text"
                value={complainantAddress}
                onChange={(e) => setComplainantAddress(e.target.value)}
                placeholder="Full street address and pin code"
              />
            </div>
            <div className="form-group">
              <label>Complainant Deposition / Written Statement</label>
              <textarea
                rows={4}
                value={complainantStatement}
                onChange={(e) => setComplainantStatement(e.target.value)}
                placeholder="Detailed verbatim deposition or summary statement as received from complainant..."
              />
            </div>
          </div>
        )}

        {/* STEP 3: Incident Details */}
        {step === 3 && (
          <div className="step-pane">
            <h2>Step 3 — Incident Details</h2>
            <p className="subtitle">Chronology, nature of offense, and operational background.</p>
            <div className="form-group">
              <label>Case Title / Incident Header *</label>
              <input
                type="text"
                required
                value={caseTitle}
                onChange={(e) => setCaseTitle(e.target.value)}
                placeholder="e.g. Unauthorized ATM Cash Dispense Manipulation at Karunamoyee"
              />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Incident Date *</label>
                <input
                  type="date"
                  required
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Approximate Time of Occurrence</label>
                <input
                  type="time"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Detailed Incident Description *</label>
              <textarea
                rows={4}
                required
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                placeholder="Describe sequence of events, modus operandi, physical evidence observed, or immediate actions taken..."
              />
            </div>
            <div className="form-group">
              <label>Additional Investigative Notes</label>
              <textarea
                rows={2}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Initial officer observations, CCTV availability, or witnesses present..."
              />
            </div>
          </div>
        )}

        {/* STEP 4: Location */}
        {step === 4 && (
          <div className="step-pane">
            <h2>Step 4 — Crime Scene Location</h2>
            <p className="subtitle">Select physical coordinates for geospatial police station proximity calculation.</p>
            <div className="form-grid-2" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label>Street Address / Landmark *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Police District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </div>
            </div>

            {/* Interactive Leaflet Map Picker */}
            <InteractiveMapPicker
              initialLat={latitude}
              initialLng={longitude}
              initialAddress={address}
              onSelectLocation={(lat, lng, addr) => {
                setLatitude(lat);
                setLongitude(lng);
                if (addr) setAddress(addr);
              }}
            />
          </div>
        )}

        {/* STEP 5: Entities */}
        {step === 5 && (
          <div className="step-pane">
            <h2>Step 5 — Investigation Entities</h2>
            <p className="subtitle">Add known suspects, persons of interest, vehicles, phone numbers, and organizations.</p>

            <div className="entity-builder-box card" style={{ background: '#f8fafc', padding: '16px', marginBottom: '20px' }}>
              <h4>Add New Entity</h4>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Type</label>
                  <select value={newEntityType} onChange={(e) => setNewEntityType(e.target.value)}>
                    <option value="PERSON">PERSON</option>
                    <option value="VEHICLE">VEHICLE</option>
                    <option value="PHONE">PHONE NUMBER</option>
                    <option value="LOCATION">LOCATION</option>
                    <option value="ORGANIZATION">ORGANIZATION</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Value / Name / Number *</label>
                  <input
                    type="text"
                    value={newEntityValue}
                    onChange={(e) => setNewEntityValue(e.target.value)}
                    placeholder={
                      newEntityType === 'PERSON'
                        ? 'e.g. Ramesh Chandra'
                        : newEntityType === 'VEHICLE'
                        ? 'e.g. WB-06-E-4512'
                        : newEntityType === 'PHONE'
                        ? 'e.g. +91 98765 43210'
                        : 'Name / Identifier'
                    }
                  />
                </div>
                {newEntityType === 'PERSON' ? (
                  <div className="form-group">
                    <label>Role in Case</label>
                    <select value={newEntityRole} onChange={(e) => setNewEntityRole(e.target.value)}>
                      <option value="SUSPECT">Suspect</option>
                      <option value="WITNESS">Witness</option>
                      <option value="VICTIM">Victim</option>
                      <option value="PERSON_OF_INTEREST">Person of Interest</option>
                      <option value="OTHER">Other Associate</option>
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Specification / Model / Details</label>
                    <input
                      type="text"
                      value={newEntityDetail}
                      onChange={(e) => setNewEntityDetail(e.target.value)}
                      placeholder="e.g. Blue Hyundai Creta or Burner SIM"
                    />
                  </div>
                )}
              </div>
              <button type="button" className="btn btn-outline" onClick={addEntityItem}>
                <Plus size={15} /> Add to Case Entities
              </button>
            </div>

            {/* List of current entities */}
            <div className="entities-list">
              <h4>Recorded Entities ({entities.length})</h4>
              {!entities.length && (
                <p className="text-muted">No entities added yet. Use the form above to add suspects, vehicles, or phone numbers.</p>
              )}
              <div className="entity-chips-container">
                {entities.map((item, idx) => (
                  <div key={idx} className="entity-badge-card">
                    <div className="badge-meta">
                      <span className={`tag tag-${item.entity_type.toLowerCase()}`}>
                        {item.entity_type}
                      </span>
                      {item.role && <span className="tag tag-role">{item.role}</span>}
                    </div>
                    <b>{item.value}</b>
                    {item.metadata?.notes && <small>{item.metadata.notes}</small>}
                    <button type="button" onClick={() => removeEntityItem(idx)} className="btn-icon-del">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Evidence */}
        {step === 6 && (
          <div className="step-pane">
            <h2>Step 6 — Evidence & Document Ingestion</h2>
            <p className="subtitle">Upload forensic transcripts, bank logs, statement PDFs, or TXT records.</p>

            <div className="upload-dropzone">
              <Upload size={32} />
              <h3>Drag & drop evidence files or click to browse</h3>
              <p>Supported formats: PDF, DOCX, TXT (Maximum 10 MB per file)</p>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelection}
                id="file-input"
              />
              <label htmlFor="file-input" className="btn btn-outline">
                Select Files
              </label>
            </div>

            <div className="files-queue">
              <h4>Queued Evidence Files ({uploadedFiles.length})</h4>
              {!uploadedFiles.length && (
                <p className="text-muted">No evidence files selected. You can also upload files after creating the case.</p>
              )}
              {uploadedFiles.map((item, idx) => (
                <div key={idx} className="evidence-queue-item">
                  <FileText size={18} />
                  <div className="file-info">
                    <b>{item.file.name}</b>
                    <span>{(item.file.size / 1024).toFixed(1)} KB · {item.status}</span>
                  </div>
                  <button type="button" onClick={() => removeFileItem(idx)} className="btn-icon-del">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7: Review */}
        {step === 7 && (
          <div className="step-pane">
            <h2>Step 7 — Review & Verification</h2>
            <p className="subtitle">Verify all case information before permanent registration.</p>

            <div className="review-summary-grid">
              <div className="review-card">
                <div className="review-card-header">
                  <h3>FIR & Station Details</h3>
                  <button type="button" onClick={() => setStep(1)} className="btn-link">Edit</button>
                </div>
                <div className="review-card-content">
                  <p><b>FIR Number:</b> {firNumber}</p>
                  <p><b>Case Number:</b> {caseNumber}</p>
                  <p><b>Police Station:</b> {selectedStationName}</p>
                  <p><b>Category:</b> {crimeType} (Priority: {priority})</p>
                </div>
              </div>

              <div className="review-card">
                <div className="review-card-header">
                  <h3>Complainant</h3>
                  <button type="button" onClick={() => setStep(2)} className="btn-link">Edit</button>
                </div>
                <div className="review-card-content">
                  <p><b>Name:</b> {complainantName || 'N/A'}</p>
                  <p><b>Contact:</b> {complainantContact || 'N/A'}</p>
                  <p><b>Address:</b> {complainantAddress || 'N/A'}</p>
                </div>
              </div>

              <div className="review-card">
                <div className="review-card-header">
                  <h3>Incident Particulars</h3>
                  <button type="button" onClick={() => setStep(3)} className="btn-link">Edit</button>
                </div>
                <div className="review-card-content">
                  <p><b>Title:</b> {caseTitle || 'Standard Case Record'}</p>
                  <p><b>Date & Time:</b> {incidentDate} at {incidentTime}</p>
                  <p><b>Description:</b> {incidentDescription || 'No description recorded.'}</p>
                </div>
              </div>

              <div className="review-card">
                <div className="review-card-header">
                  <h3>Scene Coordinates</h3>
                  <button type="button" onClick={() => setStep(4)} className="btn-link">Edit</button>
                </div>
                <div className="review-card-content">
                  <p><b>Location:</b> {address}</p>
                  <p><b>District:</b> {district}</p>
                  <p><b>Coordinates:</b> {latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
                </div>
              </div>

              <div className="review-card full-width">
                <div className="review-card-header">
                  <h3>Entities & Evidence Summary</h3>
                  <button type="button" onClick={() => setStep(5)} className="btn-link">Edit</button>
                </div>
                <div className="review-card-content">
                  <p><b>Entities:</b> {entities.length} recorded ({entities.map((e) => `${e.entity_type}:${e.value}`).join(', ') || 'None'})</p>
                  <p><b>Evidence:</b> {uploadedFiles.length} file(s) queued for SHA-256 validation & text extraction</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="wizard-actions">
          <button
            type="button"
            className="btn btn-outline"
            disabled={step === 1 || submitting}
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft size={16} /> Previous
          </button>

          <div className="actions-right">
            {step === 7 ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() => submitFIR(true)}
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={submitting}
                  onClick={() => submitFIR(false)}
                >
                  {submitting ? 'Registering FIR...' : 'Submit FIR / Create Case'}
                  <CheckSquare size={16} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(step + 1)}
              >
                Continue <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
