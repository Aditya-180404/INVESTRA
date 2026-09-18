import React from 'react';
import { Shield, Lock, FileText, Network, Clock, Users, Cpu, FileCheck, ArrowRight, ShieldCheck, Database, Layers } from 'lucide-react';

interface LandingProps {
  onNavigate: (path: string) => void;
}

export const Landing: React.FC<LandingProps> = ({ onNavigate }) => {
  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <header className="public-nav">
        <div className="brand" onClick={() => onNavigate('/')}>
          <div className="brand-badge">
            <Shield size={20} />
          </div>
          <div className="brand-text">
            <b>INVESTRA</b>
            <span>POLICE INTELLIGENCE PLATFORM</span>
          </div>
        </div>
        <nav className="nav-links">
          <a href="#problem">The Problem</a>
          <a href="#solution">Workflow</a>
          <a href="#features">Capabilities</a>
          <a href="#security">Security</a>
        </nav>
        <div className="auth-buttons">
          <button className="btn btn-outline" onClick={() => onNavigate('/police/login')}>
            Police Login
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('/admin/login')}>
            <Lock size={15} /> Admin Login
          </button>
        </div>
      </header>

      <main className="landing-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-badge">
            <ShieldCheck size={16} /> Official Investigation & Crime Intelligence Workspace
          </div>
          <h1 className="hero-title">
            AI-Powered Investigation<br />
            <span>Intelligence Platform</span>
          </h1>
          <p className="hero-description">
            INVESTRA unifies First Information Reports (FIRs), multi-source evidence, extracted entities,
            inter-station coordination, and grounded retrieval-augmented AI into one accountable, auditable workspace
            for modern law enforcement.
          </p>
          <div className="hero-cta">
            <button className="btn btn-lg btn-police" onClick={() => onNavigate('/police/login')}>
              <Shield size={18} /> Police Officer Portal <ArrowRight size={18} />
            </button>
            <button className="btn btn-lg btn-admin" onClick={() => onNavigate('/admin/login')}>
              <Lock size={18} /> Administrator Console
            </button>
          </div>
        </section>

        {/* Problem Section */}
        <section id="problem" className="section problem-section">
          <div className="section-header">
            <span className="section-tag">THE PROBLEM</span>
            <h2>The Challenge of Modern Law Enforcement</h2>
            <p>Traditional investigation methods struggle under mounting data volume and departmental barriers.</p>
          </div>
          <div className="problem-grid">
            <div className="problem-card">
              <div className="card-icon"><Database size={24} /></div>
              <h3>Scattered Investigation Information</h3>
              <p>Case details, statements, and intelligence are fragmented across disparate precinct files, slowing progress.</p>
            </div>
            <div className="problem-card">
              <div className="card-icon"><Lock size={24} /></div>
              <h3>Evidence Silos</h3>
              <p>Critical digital documents and forensic files remain locked within isolated folders without cross-referencing.</p>
            </div>
            <div className="problem-card">
              <div className="card-icon"><Users size={24} /></div>
              <h3>Manual Coordination</h3>
              <p>Inter-precinct information requests require slow, ad-hoc paperwork that delays hot criminal leads.</p>
            </div>
            <div className="problem-card">
              <div className="card-icon"><Network size={24} /></div>
              <h3>Difficult Relationship Discovery</h3>
              <p>Hidden links between suspects, burner phones, getaway vehicles, and addresses are hard to trace manually.</p>
            </div>
            <div className="problem-card">
              <div className="card-icon"><Layers size={24} /></div>
              <h3>Large Volumes of Documents</h3>
              <p>Investigators spend days reading hundreds of PDF/Word pages instead of evaluating high-priority leads.</p>
            </div>
          </div>
        </section>

        {/* Solution Workflow */}
        <section id="solution" className="section solution-section">
          <div className="section-header">
            <span className="section-tag">THE SOLUTION</span>
            <h2>Structured End-to-End Investigation Flow</h2>
            <p>Every case moves systematically from registration to evidence-grounded prosecutorial reporting.</p>
          </div>
          <div className="workflow-diagram">
            <div className="workflow-step">
              <span className="step-num">01</span>
              <h4>FIR / Case</h4>
              <p>Structured 8-step intake & server-validated registration</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <span className="step-num">02</span>
              <h4>Evidence</h4>
              <p>Secure storage & SHA-256 cryptographic chain of custody</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <span className="step-num">03</span>
              <h4>Entity Extraction</h4>
              <p>Automated discovery of suspects, phones, vehicles & addresses</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <span className="step-num">04</span>
              <h4>Relationship Analysis</h4>
              <p>Interactive graph linking people, devices, and scenes</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <span className="step-num">05</span>
              <h4>AI + RAG</h4>
              <p>Ollama qwen3.5 retrieval with exact source citations</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <span className="step-num">06</span>
              <h4>Investigator Review</h4>
              <p>Human verification, coordination, & final report</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="section features-section">
          <div className="section-header">
            <span className="section-tag">CAPABILITIES</span>
            <h2>Integrated Investigation Suite</h2>
            <p>Designed strictly around actual operational policing and intelligence needs.</p>
          </div>
          <div className="features-grid">
            <div className="feature-item">
              <FileText className="f-icon" />
              <h3>FIR Management</h3>
              <p>Full lifecycle tracking of First Information Reports with server-side validation against duplicates.</p>
            </div>
            <div className="feature-item">
              <Layers className="f-icon" />
              <h3>Case Management</h3>
              <p>Complete workspace with status stages: DRAFT, REGISTERED, OPEN, UNDER_INVESTIGATION, and CLOSED.</p>
            </div>
            <div className="feature-item">
              <Database className="f-icon" />
              <h3>Evidence Management</h3>
              <p>Upload, download, tamper-proof SHA-256 verification, and chunked vector embedding indexing.</p>
            </div>
            <div className="feature-item">
              <Network className="f-icon" />
              <h3>Investigation Graph</h3>
              <p>Visual relationship network showing connections between suspects, phones, vehicles, and locations.</p>
            </div>
            <div className="feature-item">
              <Clock className="f-icon" />
              <h3>Timeline Analysis</h3>
              <p>Chronological feed cleanly distinguishing real investigation events from automated system activities.</p>
            </div>
            <div className="feature-item">
              <Users className="f-icon" />
              <h3>Inter-Station Coordination</h3>
              <p>Jurisdiction-based assistance requests, response tracking, and mutual intelligence sharing.</p>
            </div>
            <div className="feature-item">
              <Cpu className="f-icon" />
              <h3>AI/RAG Assistant</h3>
              <p>Evidence-grounded question answering powered by local Ollama LLMs with strict source citations.</p>
            </div>
            <div className="feature-item">
              <FileCheck className="f-icon" />
              <h3>Investigation Reports</h3>
              <p>Automated generation of formal police investigation reports ready for senior review and prosecution.</p>
            </div>
            <div className="feature-item">
              <ShieldCheck className="f-icon" />
              <h3>Secure RBAC</h3>
              <p>Strict access boundaries: Administrator system control vs. authorized Police Officer investigation operations.</p>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="section security-section">
          <div className="security-box">
            <div className="sec-header">
              <ShieldCheck size={36} />
              <div>
                <h2>Enterprise Police Security & Accountability</h2>
                <p>Engineered to meet statutory compliance, chain of custody integrity, and least privilege standards.</p>
              </div>
            </div>
            <div className="security-points">
              <div className="sec-point">
                <b>Role-Based Access</b>
                <p>Cryptographic JWTs with server-enforced role verification on every API request.</p>
              </div>
              <div className="sec-point">
                <b>Admin-Controlled Accounts</b>
                <p>Police officers cannot self-register. Accounts are created and activated strictly by administrators.</p>
              </div>
              <div className="sec-point">
                <b>Case Authorization</b>
                <p>Officers can access only assigned cases and authorized station resources.</p>
              </div>
              <div className="sec-point">
                <b>Evidence Security</b>
                <p>Controlled file storage, strict size/MIME verification, and immutable SHA-256 checksums.</p>
              </div>
              <div className="sec-point">
                <b>Audit Logs</b>
                <p>Append-only audit trail recording every login, case edit, upload, download, and report generation.</p>
              </div>
              <div className="sec-point">
                <b>Human-In-The-Loop AI</b>
                <p>AI assists with retrieval and summarization; human investigators retain final review and sign-off.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="public-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Shield size={18} /> <b>INVESTRA</b> · Investigation Intelligence Platform
          </div>
          <div className="footer-links">
            <button onClick={() => onNavigate('/police/login')} className="link-btn">Police Portal</button>
            <button onClick={() => onNavigate('/admin/login')} className="link-btn">Admin Portal</button>
          </div>
          <div className="footer-copy">
            © 2026 INVESTRA. Restricted to authorized law enforcement personnel.
          </div>
        </div>
      </footer>
    </div>
  );
};
