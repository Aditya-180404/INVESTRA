import CytoscapeComponent from 'react-cytoscapejs';
import type { GraphData } from '../types';

interface GraphViewProps {
  data: GraphData;
  onNodeSelect?: (node: GraphData['nodes'][number]) => void;
}

const GraphView = ({ data, onNodeSelect }: GraphViewProps) => {
  const elements = [
    ...data.nodes.map((node) => ({ data: { ...node, id: String(node.id), label: `${node.type}: ${node.label}` } })),
    ...data.edges.map((edge) => ({ data: { ...edge, id: String(edge.id), label: edge.label } })),
  ];

  const stylesheet = [
    { selector: 'node', style: { label: 'data(label)', 'text-valign': 'center', 'text-halign': 'center', 'text-wrap': 'wrap', 'text-max-width': '130px', color: '#102a43', 'font-size': '11px', 'font-family': 'Arial, sans-serif', shape: 'roundrectangle', width: '170px', height: '62px', 'background-color': '#ffffff', 'border-width': 2, 'border-color': '#087f8c', padding: '8px' } },
    { selector: 'node[type="PERSON"]', style: { 'border-color': '#087f8c' } },
    { selector: 'node[type="VEHICLE"]', style: { 'border-color': '#e76f51' } },
    { selector: 'node[type="PHONE"]', style: { 'border-color': '#4f8f72' } },
    { selector: 'node[type="LOCATION"]', style: { 'border-color': '#6c63a8' } },
    { selector: 'node[type="CASE"]', style: { 'border-color': '#102a43' } },
    { selector: 'edge', style: { width: 2, 'line-color': '#86a6a3', 'target-arrow-color': '#087f8c', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', label: 'data(label)', 'font-size': '10px', color: '#587187', 'text-rotation': 'autorotate', 'text-margin-y': -10 } },
  ];

  if (!data.nodes.length) {
    return <div className="empty-state"><p>No investigation entities available for this case.</p></div>;
  }

  return (
    <div className="graph-view">
      <CytoscapeComponent
        elements={elements}
        style={{ width: '100%', height: '100%' }}
        stylesheet={stylesheet}
        layout={{ name: 'cose', padding: 50 }}
        cy={(cy: any) => cy.on('tap', 'node', (event: any) => onNodeSelect?.(event.target.data() as GraphData['nodes'][number]))}
      />
    </div>
  );
};

export default GraphView;
