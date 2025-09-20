import { useCallback, useEffect, useState } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  ConnectionLineType, 
  useNodesState, 
  useEdgesState, 
  Background, 
  Controls,
  Panel,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { LineageNodeType, LineageType, ModelType, DatasetType, DashboardType } from '../types/DataCatalogResponse';
import './LineageGraph.css';
import NodeDetailsModal from './NodeDetailsModal';

interface LineageGraphProps {
  lineageData: LineageType[];
  models: ModelType[];
  datasets: DatasetType[];
  dashboards: DashboardType[];
  paramSelections: Map<string, string[]>;
  requestHeaders: Record<string, string>;
}

// Define a custom node with left and right handles
const CustomNode = ({ data }: any) => {
  const isModel = data.type === 'model';
  const isDataset = data.type === 'dataset';
  const isDashboard = data.type === 'dashboard';

  const typeChipLabel = isModel ? data.modelType : isDataset ? 'Dataset' : isDashboard ? 'Dashboard' : '';
  const showDetails = isModel || isDataset || isDashboard;

  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: '8px',
      width: 240,
      background: data.backgroundColor,
      color: isModel ? '#5b2a86' : 'white',
      border: `${isModel ? 3 : 2}px solid ${data.borderColor}`,
      position: 'relative',
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
    }}>
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        style={{ background: '#555' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span className="lineage-node-icon" style={{
            background: isModel ? '#fff' : 'rgba(255,255,255,0.2)',
            color: isModel ? data.borderColor : '#fff',
            border: isModel ? `1px solid ${data.borderColor}` : 'none'
          }}>{isModel ? 'M' : 'D'}</span>
          <div style={{
            fontWeight: 600,
            fontSize: '13px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isModel ? '#5b2a86' : 'white'
          }} title={data.label}>
            {data.label}
          </div>
        </div>
        {typeChipLabel && (
          <span className="lineage-node-chip" style={{
            backgroundColor: '#fff',
            color: isModel ? data.borderColor : data.borderColor,
            border: `1px solid ${data.borderColor}`
          }}>
            {typeChipLabel}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '8px', minHeight: 24 }}>
        {showDetails && (
          <button
            className="lineage-node-button"
            onClick={(e) => {
              e.stopPropagation();
              if (isModel) data.onShowMetadata('model', data.label);
              if (isDataset) data.onShowMetadata('dataset', data.label);
              if (isDashboard) data.onShowMetadata('dashboard', data.label);
            }}
            style={{
              color: isModel ? '#fff' : data.backgroundColor,
              backgroundColor: isModel ? '#4285f4' : '#fff',
              border: isModel ? 'none' : `1px solid ${data.backgroundColor}`
            }}
          >
            Details
          </button>
        )}
      </div>
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        style={{ background: '#555' }}
      />
    </div>
  );
};

// Define custom node types
const customNodeTypes = {
  lineageNode: CustomNode,
};

const nodeTypes = ['model', 'dataset', 'dashboard'];

const nodeColors = {
  model: '#fffff2',     // White with yellow tint
  dataset: '#4285f4',   // Blue
  dashboard: '#34a853', // Green
};

const nodeBorderColors = {
  source: '#2b5797',    // Darker Blue
  seed: '#34a853',      // Green
  build: '#b31412',     // Darker Red
  dbview: '#9334a8',    // Purple
  federate: '#c66900',  // Darker Orange
  default: '#222'       // Default border color
};

export default function LineageGraph({ lineageData, models, datasets, dashboards, paramSelections, requestHeaders }: LineageGraphProps) {
  // State for modal management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<DatasetType | null>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardType | null>(null);

  // Handler for opening model metadata modal
  const handleShowMetadata = useCallback((type: string, name: string) => {
    if (type === 'model') {
      const model = models.find(m => m.name === name);
      setSelectedModel(model || null);
    } else if (type === 'dataset') {
      console.log('datasets', datasets);
      const dataset = datasets.find(d => d.name === name);
      setSelectedDataset(dataset || null);
    } else if (type === 'dashboard') {
      const dashboard = dashboards.find(d => d.name === name);
      setSelectedDashboard(dashboard || null);
    }
    setIsModalOpen(true);
  }, [models, datasets, dashboards]);

  // Handler for closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedModel(null);
    setSelectedDataset(null);
    setSelectedDashboard(null);
  };

  // Process lineage data to create nodes and edges
  const createNodesAndEdges = useCallback(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];
    
    // Track unique nodes to avoid duplicates
    const uniqueNodes = new Set<string>();
    
    // Create a map of model names to their types
    const modelTypeMap = new Map(models.map(model => [model.name, model.model_type]));
    
    // Process each lineage relation
    lineageData.forEach((relation, index) => {
      // Add source node if it doesn't exist
      const addLineageNode = (node: LineageNodeType) => {
        const nodeId = `${node.type}__${node.name}`;
        if (!uniqueNodes.has(nodeId)) {
          uniqueNodes.add(nodeId);
          
          // Get model type for border color
          const modelType = modelTypeMap.get(node.name) || 'default';
          const borderColor = nodeBorderColors[modelType as keyof typeof nodeBorderColors] || nodeBorderColors.default;
          
          initialNodes.push({
            id: nodeId,
            data: { 
              label: node.name,
              type: node.type,
              backgroundColor: nodeColors[node.type as keyof typeof nodeColors] || '#666',
              borderColor: borderColor,
              onShowMetadata: handleShowMetadata,
              modelType
            },
            position: { x: 0, y: 0 }, // Will be repositioned by layout
            type: 'lineageNode'
          });
        }
        return nodeId;
      }
      
      const sourceNodeId = addLineageNode(relation.source);
      const targetNodeId = addLineageNode(relation.target);
      
      // Add edge
      initialEdges.push({
        id: `e${index}`,
        source: sourceNodeId,
        target: targetNodeId,
        type: 'straight',
        animated: false,
        sourceHandle: 'right',
        targetHandle: 'left',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#555'
        },
        style: { 
          stroke: '#555',
          strokeWidth: 1,
          strokeDasharray: relation.type === 'buildtime' ? '5, 5' : 'none'
        }
      });
    });
    
    // First pass: find source nodes (nodes that are only sources, not targets)
    const targetNodes = new Set(initialEdges.map(e => e.target));
    const sourceOnlyNodes = initialNodes.filter(node => !targetNodes.has(node.id));
    
    // Function to find node depth recursively
    const findNodeDepth = (nodeId: string, visited = new Set<string>(), depth = 0): number => {
      if (visited.has(nodeId)) return depth;
      visited.add(nodeId);
      
      const outgoingEdges = initialEdges.filter(e => e.source === nodeId);
      if (outgoingEdges.length === 0) return depth;
      
      let maxChildDepth = depth;
      for (const edge of outgoingEdges) {
        const childDepth = findNodeDepth(edge.target, visited, depth + 1);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
      
      return maxChildDepth;
    };
    
    // Second pass: assign levels to all other nodes
    // Create a map to track node depths
    const nodeDepths = new Map<string, number>();
    
    // First assign depths to source-only nodes
    sourceOnlyNodes.forEach(node => {
      nodeDepths.set(node.id, 0);
    });
    
    // Function to determine if all dependencies of a node have been processed
    const allDependenciesProcessed = (nodeId: string) => {
      const incomingEdges = initialEdges.filter(e => e.target === nodeId);
      return incomingEdges.every(edge => nodeDepths.has(edge.source));
    };
    
    // Process nodes in topological order
    let remaining = initialNodes.filter(node => !nodeDepths.has(node.id));
    let lastRemaining = -1;
    
    while (remaining.length > 0 && remaining.length !== lastRemaining) {
      lastRemaining = remaining.length;
      
      for (let i = 0; i < remaining.length; i++) {
        const node = remaining[i];
        
        if (allDependenciesProcessed(node.id)) {
          // Calculate max depth of dependencies + 1
          const incomingEdges = initialEdges.filter(e => e.target === node.id);
          let maxDepth = 0;
          
          if (incomingEdges.length > 0) {
            maxDepth = Math.max(...incomingEdges.map(edge => nodeDepths.get(edge.source) || 0)) + 1;
          }
          
          // Set this node's depth
          nodeDepths.set(node.id, maxDepth);
          
          // Remove from remaining
          remaining.splice(i, 1);
          i--;  // Adjust index after removal
        }
      }
    }
    
    // Handle any remaining nodes (cycles) by using the findNodeDepth function
    remaining.forEach(node => {
      if (!nodeDepths.has(node.id)) {
        const depth = findNodeDepth(node.id);
        nodeDepths.set(node.id, depth);
      }
    });
    
    // Group nodes by their assigned depths
    const levels: Record<string, Node[]> = {};
    initialNodes.forEach(node => {
      const depth = nodeDepths.get(node.id) || 0;
      if (!levels[depth]) levels[depth] = [];
      levels[depth].push(node);
    });
    
    // Position nodes based on levels
    const sortedNodesByLevel: Record<string, Node[]> = {};
    Object.entries(levels).forEach(([level, nodesInLevel]) => {
      const levelX = 300 * parseInt(level); // Horizontal positioning instead of vertical

      // Calculate position scores for nodes in this level
      const positionScores = new Map<Node, number>();
      nodesInLevel.forEach(node => {
        // Find all edges where this node is the target
        const incomingEdges = initialEdges.filter(e => e.target === node.id);
        if (incomingEdges.length === 0) {
          // If no dependent nodes, use the node's current index as score
          positionScores.set(node, nodesInLevel.indexOf(node));
          return;
        }

        // Get the indices of dependent nodes in their respective levels
        const dependentPositions = incomingEdges.map(edge => {
          const sourceNode = initialNodes.find(n => n.id === edge.source);
          if (!sourceNode) return 0;
          const sourceLevel = nodeDepths.get(sourceNode.id) || 0;
          return sortedNodesByLevel[sourceLevel].indexOf(sourceNode);
        });

        // Calculate average position of dependent nodes
        const avgPosition = dependentPositions.reduce((a, b) => a + b, 0) / dependentPositions.length;
        positionScores.set(node, avgPosition);
      });

      // Sort nodes based on position scores
      const sortedNodes = [...nodesInLevel].sort((a, b) => {
        const scoreA = positionScores.get(a) || 0;
        const scoreB = positionScores.get(b) || 0;
        return scoreA - scoreB;
      });
      sortedNodesByLevel[level] = sortedNodes;

      // Assign positions based on sorted order
      const nodeCount = sortedNodes.length;
      const yStep = 150; // Spacing between nodes in the same level
      const startY = -(nodeCount - 1) * yStep / 2;
      
      sortedNodes.forEach((node, nodeIndex) => {
        node.position = {
          x: levelX,
          y: startY + nodeIndex * yStep
        };
      });
    });
    
    // Add connection points to edges
    initialEdges.forEach(edge => {
      edge.sourceHandle = 'right'; // Connection comes from right side of source
      edge.targetHandle = 'left';  // Connection goes to left side of target
    });

    // Return the processed nodes and edges
    return { initialNodes, initialEdges };
  }, [lineageData, models, handleShowMetadata]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Recalculate nodes and edges when lineage data or detail sources change
  useEffect(() => {
    const { initialNodes, initialEdges } = createNodesAndEdges();
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [createNodesAndEdges]);

  return (
    <div className="lineage-graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={customNodeTypes}
        connectionLineType={ConnectionLineType.Straight}
        fitView
      >
        <Background />
        <Controls showFitView={false} />
        <Panel position="top-left">
          <div className="graph-title">
            <h3>Data Lineage Graph</h3>
            <p>Showing relationships between models, datasets, and dashboards</p>
          </div>
        </Panel>
        <Panel position="top-right">
          <div className="legend">
            <div className="legend-title">Legend</div>
            <div className="legend-content">
              <div className="legend-column">
                <div style={{ marginBottom: '20px' }}>
                  <div className="legend-section-title" style={{ marginBottom: '5px' }}>Node Types</div>
                  {nodeTypes.map(type => (
                    <div key={type} className="legend-item">
                      <div 
                        className="legend-color" 
                        style={{ 
                          backgroundColor: nodeColors[type as keyof typeof nodeColors],
                          border: '1px solid black'
                        }}
                      />
                      <div className="legend-label">{type.charAt(0).toUpperCase() + type.slice(1)}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="legend-section-title" style={{ marginBottom: '5px' }}>Edge Types</div>
                  <div className="legend-item">
                    <div className="legend-line">
                      <svg width="40" height="20">
                        <defs>
                          <marker
                            id="legend-arrow-dashed"
                            viewBox="0 0 10 10"
                            refX="6"
                            refY="5"
                            markerWidth="5"
                            markerHeight="6"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 0 L 6 5 L 0 10 z" fill="#555" />
                          </marker>
                        </defs>
                        <line
                          x1="0"
                          y1="10"
                          x2="32"
                          y2="10"
                          stroke="#555"
                          strokeWidth="1.5"
                          strokeDasharray="5,5"
                          markerEnd="url(#legend-arrow-dashed)"
                        />
                      </svg>
                    </div>
                    <div className="legend-label">Buildtime Dependency</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-line">
                      <svg width="40" height="20">
                        <defs>
                          <marker
                            id="legend-arrow"
                            viewBox="0 0 10 10"
                            refX="6"
                            refY="5"
                            markerWidth="5"
                            markerHeight="6"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 0 L 6 5 L 0 10 z" fill="#555" />
                          </marker>
                        </defs>
                        <line
                          x1="0"
                          y1="10"
                          x2="32"
                          y2="10"
                          stroke="#555"
                          strokeWidth="1.5"
                          markerEnd="url(#legend-arrow)"
                        />
                      </svg>
                    </div>
                    <div className="legend-label">Runtime Dependency</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
      
      {/* Details Modal */}
      <NodeDetailsModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        selectedModel={selectedModel} 
        selectedDataset={selectedDataset} 
        selectedDashboard={selectedDashboard}
        paramSelections={paramSelections}
        requestHeaders={requestHeaders}
      />
    </div>
  );
} 