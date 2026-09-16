import CytoscapeComponent from 'react-cytoscapejs';

const GraphView = () => {
  const elements = [
    { data: { id: 'person1', label: 'Rajesh Kumar', type: 'PERSON' } },
    { data: { id: 'phone1', label: '9876543210', type: 'PHONE' } },
    { data: { id: 'vehicle1', label: 'WB12AB1234', type: 'VEHICLE' } },
    { data: { id: 'case1', label: 'FIR-104', type: 'CASE' } },
    { data: { id: 'case2', label: 'FIR-219', type: 'CASE' } },
    
    { data: { source: 'person1', target: 'phone1', relationship: 'OWNS' } },
    { data: { source: 'person1', target: 'vehicle1', relationship: 'DRIVES' } },
    { data: { source: 'person1', target: 'case1', relationship: 'SUSPECT' } },
    { data: { source: 'vehicle1', target: 'case2', relationship: 'EVIDENCE' } },
  ];

  const stylesheet = [
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'text-valign': 'bottom',
        'text-margin-y': 5,
        'color': '#f8fafc',
        'font-size': '12px',
        'font-family': 'Inter, sans-serif',
      }
    },
    {
      selector: 'node[type="PERSON"]',
      style: { 'background-color': '#4f46e5', 'width': 30, 'height': 30 }
    },
    {
      selector: 'node[type="PHONE"]',
      style: { 'background-color': '#10b981', 'width': 25, 'height': 25 }
    },
    {
      selector: 'node[type="VEHICLE"]',
      style: { 'background-color': '#f59e0b', 'width': 25, 'height': 25 }
    },
    {
      selector: 'node[type="CASE"]',
      style: { 'background-color': '#ef4444', 'width': 35, 'height': 35, 'shape': 'square' }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#475569',
        'target-arrow-color': '#475569',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(relationship)',
        'font-size': '10px',
        'color': '#94a3b8',
        'text-rotation': 'autorotate',
        'text-margin-y': -10
      }
    }
  ];

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
        <div>
          <h2 className="text-xl font-bold">Investigation Network Graph</h2>
          <p className="text-slate-400 text-sm mt-1">Cross-case entity relationships. Use scroll to zoom, drag to pan.</p>
        </div>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 bg-indigo-600 rounded-full"></div><span>Person</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span>Phone</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div><span>Vehicle</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 bg-red-500 rounded-sm"></div><span>Case</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 bg-[#0b1121] relative">
        <CytoscapeComponent 
          elements={elements} 
          style={ { width: '100%', height: '100%' } } 
          stylesheet={stylesheet}
          layout={{ name: 'cose', padding: 50 }}
        />
        <div className="absolute bottom-6 right-6 bg-slate-900 border border-slate-800 p-4 rounded-lg shadow-xl max-w-xs">
          <h4 className="font-semibold text-sm mb-2 text-blue-400">AI Intelligence Insight</h4>
          <p className="text-xs text-slate-300">INVESTRA detected a link between FIR-104 and FIR-219 through Vehicle WB12AB1234. This vehicle is driven by Rajesh Kumar.</p>
        </div>
      </div>
    </div>
  );
};

export default GraphView;
