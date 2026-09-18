import React, { useState } from 'react';
import {
  Activity, ArrowDown, ArrowRight, BrainCircuit, CheckCircle2, Clock3,
  Database, FileCheck2, FileText, GitBranch, Layers3, LockKeyhole,
  MapPin, Network, ScanSearch, Shield, ShieldCheck, Users, Workflow
} from 'lucide-react';

interface LandingProps {
  onNavigate: (path: string) => void;
  dashboardPath?: string;
}

const workflowStages = [
  { key: 'case', label: 'FIR / Case', icon: FileText, description: 'Structured case and FIR information enters the investigation workflow.' },
  { key: 'evidence', label: 'Evidence', icon: Database, description: 'Evidence and investigation documents are connected to the case.' },
  { key: 'entities', label: 'Entities', icon: Users, description: 'People, vehicles, phone numbers, locations and other entities are extracted.' },
  { key: 'relationships', label: 'Relationships', icon: Network, description: 'Related entities and cases can be connected for investigation analysis.' },
  { key: 'timeline', label: 'Timeline', icon: Clock3, description: 'Investigation events are organized chronologically.' },
  { key: 'rag', label: 'RAG Search', icon: ScanSearch, description: 'Relevant investigation records are retrieved from the database.' },
  { key: 'ai', label: 'Local AI', icon: BrainCircuit, description: 'Ollama provides local AI-assisted analysis using retrieved context.' },
  { key: 'review', label: 'Human Review', icon: ShieldCheck, description: 'Investigators review and validate AI-assisted findings.' },
  { key: 'report', label: 'Report', icon: FileCheck2, description: 'Structured investigation information can be compiled into a professional report.' },
];

const features = [
  ['FIR / Case Management', 'Register, assign, track, and update investigation cases with validated records.', FileText],
  ['Evidence Management', 'Secure uploads, checksums, document indexing, and controlled access.', Database],
  ['Entity Intelligence', 'Extract people, vehicles, phones, locations, and case-specific signals.', Users],
  ['Relationship Analysis', 'Explore connections across entities and cases through an interactive graph.', Network],
  ['Investigation Timeline', 'Keep operational events and investigative milestones in chronological context.', Clock3],
  ['Location Intelligence', 'Capture incident locations and coordinate jurisdiction-aware investigations.', MapPin],
  ['RAG Search', 'Retrieve relevant records and cite the evidence behind every answer.', ScanSearch],
  ['AI Assistance', 'Use local Ollama models to summarize and reason over retrieved case context.', BrainCircuit],
  ['Professional Reports', 'Compile reviewable case findings into a formal investigation report.', FileCheck2],
  ['Admin / Police RBAC', 'Separate administrative controls from officer investigation workflows.', LockKeyhole],
] as const;

const technologies = ['React', 'FastAPI', 'Python 3.12', 'PostgreSQL', 'pgvector', 'Ollama', 'Docker', 'JWT', 'RAG'];

export const Landing: React.FC<LandingProps> = ({ onNavigate, dashboardPath }) => {
  const [activeStage, setActiveStage] = useState(0);
  const stage = workflowStages[activeStage];
  const ActiveIcon = stage.icon;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="landing-page">
      <header className="public-nav">
        <button className="brand" onClick={() => scrollTo('home')} aria-label="Go to INVESTRA home">
          <span className="brand-badge"><Shield size={20} /></span>
          <span className="brand-text"><b>INVESTRA</b><span>INVESTIGATION INTELLIGENCE</span></span>
        </button>
        <nav className="nav-links" aria-label="Public navigation">
          <a href="#home">Home</a><a href="#how-it-works">How It Works</a><a href="#features">Features</a><a href="#technology">Technology</a><a href="#security">Security</a>
        </nav>
        <div className="auth-buttons">
          {dashboardPath && <button className="btn btn-outline" onClick={() => onNavigate(dashboardPath)}>Dashboard</button>}
          <button className="btn btn-primary" onClick={() => onNavigate('/police/login')}>Login <ArrowRight size={15} /></button>
        </div>
      </header>

      <main>
        <section id="home" className="landing-hero">
          <div className="hero-copy">
            <div className="hero-kicker"><Activity size={15} /> CASE INTELLIGENCE, CONNECTED</div>
            <h1>INVESTRA</h1>
            <p className="hero-subtitle">AI-Powered Criminal Network Analysis &amp; Investigation Intelligence Platform</p>
            <p className="hero-description">INVESTRA connects fragmented investigation records, identifies relationships between entities, assists investigators with grounded RAG and local AI, and provides a centralized workflow for accountable case intelligence.</p>
            <div className="hero-cta"><button className="btn btn-lg btn-primary" onClick={() => dashboardPath ? onNavigate(dashboardPath) : scrollTo('how-it-works')}>Explore Platform <ArrowRight size={17} /></button><button className="btn btn-lg btn-outline" onClick={() => scrollTo('how-it-works')}>How It Works <ArrowDown size={17} /></button></div>
            <div className="hero-proof"><span><CheckCircle2 size={16} /> Evidence-grounded</span><span><CheckCircle2 size={16} /> Human reviewed</span><span><CheckCircle2 size={16} /> Role protected</span></div>
          </div>
          <div className="hero-visual" aria-label="Investigation intelligence overview"><div className="visual-grid" /><div className="visual-panel visual-panel-main"><span className="panel-label">LIVE CASE MODEL</span><div className="network-orbit"><span className="orbit-node node-center"><ShieldCheck size={25} /></span><span className="orbit-node node-one"><Users size={19} /></span><span className="orbit-node node-two"><MapPin size={19} /></span><span className="orbit-node node-three"><FileText size={19} /></span><i /><i /><i /></div><strong>Connected evidence<br />for clearer decisions</strong></div><div className="visual-panel visual-panel-stat"><span className="panel-label">WORKFLOW STATUS</span><b>09</b><span>stages, one review path</span></div><div className="visual-panel visual-panel-tag">LOCAL AI + RAG</div></div>
        </section>

        <section id="problem" className="intro-band"><div><span className="section-tag">THE INVESTIGATION GAP</span><h2>Good investigators should not have to investigate their own information system.</h2></div><p>Case facts live in reports, files, calls, locations, and station handoffs. INVESTRA brings those signals into one governed workspace so teams can move from fragmented records to a reviewable intelligence picture.</p></section>

        <section id="how-it-works" className="section workflow-section"><div className="section-heading"><span className="section-tag">THE WORKFLOW</span><h2>How INVESTRA works</h2><p>Move through the complete investigation pipeline. Select any stage to see its role.</p></div><div className="workflow-shell"><div className="workflow-rail" role="list" aria-label="Investigation workflow stages">{workflowStages.map((item, index) => { const Icon = item.icon; return <React.Fragment key={item.key}><button className={`workflow-stage ${activeStage === index ? 'active' : ''}`} onClick={() => setActiveStage(index)} onMouseEnter={() => setActiveStage(index)} role="listitem" aria-label={item.label}><span className="stage-index">0{index + 1}</span><span className="stage-icon"><Icon size={19} /></span><strong>{item.label}</strong></button>{index < workflowStages.length - 1 && <ArrowRight className="workflow-connector" size={20} aria-hidden="true" />}</React.Fragment>; })}</div><div className="workflow-detail"><div className="detail-icon"><ActiveIcon size={28} /></div><div><span className="section-tag">STAGE 0{activeStage + 1} / 09</span><h3>{stage.label}</h3><p>{stage.description}</p></div><div className="detail-progress"><span style={{ width: `${((activeStage + 1) / workflowStages.length) * 100}%` }} /></div></div></div></section>

        <section id="solution" className="section solution-section"><div className="section-heading"><span className="section-tag">THE SOLUTION</span><h2>From information silos to investigation context</h2></div><div className="solution-grid"><article><Layers3 size={22} /><h3>One operational record</h3><p>Cases, evidence, entities, locations, timelines, and reports stay connected from intake through review.</p></article><article><GitBranch size={22} /><h3>Relationships, not just rows</h3><p>Surface links between entities and cases with graph analysis designed for investigative reasoning.</p></article><article><Workflow size={22} /><h3>Assistance with accountability</h3><p>Retrieval and local AI accelerate review while source context and human sign-off remain central.</p></article></div></section>

        <section id="features" className="section features-section"><div className="section-heading"><span className="section-tag">PLATFORM CAPABILITIES</span><h2>Every investigation signal, in one workspace</h2></div><div className="features-grid">{features.map(([title, description, Icon]) => <article className="feature-item" key={title}><Icon className="f-icon" size={21} /><h3>{title}</h3><p>{description}</p></article>)}</div></section>

        <section id="technology" className="section technology-section"><div className="technology-copy"><span className="section-tag">BUILT FOR DEPLOYMENT</span><h2>Practical technology for a governed intelligence workflow.</h2><p>INVESTRA combines a responsive React interface, FastAPI services, PostgreSQL data, vector retrieval, and locally hosted models. Containerized services keep the project portable from development to deployment.</p></div><div className="technology-list">{technologies.map((technology, index) => <span key={technology} style={{ '--delay': `${index * 45}ms` } as React.CSSProperties}>{technology}</span>)}</div></section>

        <section id="security" className="section security-section"><div className="security-box"><div className="security-heading"><ShieldCheck size={34} /><div><span className="section-tag">TRUST &amp; CONTROL</span><h2>Designed for accountable investigation</h2></div></div><div className="security-points"><div><b>JWT authentication</b><p>Authenticated sessions protect access to operational data.</p></div><div><b>Role-based access control</b><p>Backend authorization separates administrator and officer capabilities.</p></div><div><b>Human-in-the-loop</b><p>Investigators validate AI-assisted findings before action.</p></div><div><b>Synthetic demo data</b><p>Demonstration workflows use controlled synthetic records.</p></div></div><div className="responsible-ai"><LockKeyhole size={18} /><p><strong>Responsible AI:</strong> INVESTRA assists investigators with retrieval and analysis. It does not independently determine guilt, arrest, or legal outcomes.</p></div></div></section>
      </main>

      <footer className="public-footer"><div className="footer-brand"><Shield size={17} /> <b>INVESTRA</b><span>Investigation intelligence, connected.</span></div><div className="footer-links"><button onClick={() => onNavigate('/police/login')}>Police Login</button><button onClick={() => onNavigate('/admin/login')}>Admin Login</button></div><span className="footer-copy">Authorized investigation workspace</span></footer>
    </div>
  );
};
