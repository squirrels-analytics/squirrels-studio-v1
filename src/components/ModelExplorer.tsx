import { useState, useEffect } from 'react';
import { ModelType, ConnectionType } from '../types/DataCatalogResponse';
import { FaExclamationTriangle } from 'react-icons/fa';
import './ModelExplorer.css';

interface ModelExplorerProps {
  models: ModelType[];
  connections: ConnectionType[];
  width: number;
  onWidthChange: (newWidth: number) => void;
}

export default function ModelExplorer({ models, connections, width, onWidthChange }: ModelExplorerProps) {
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  
  const modelsByType = models.reduce((acc, model) => {
    const type = model.model_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(model);
    return acc;
  }, {} as Record<string, ModelType[]>);

  // Create a map of connection names to their labels
  const connectionMap = connections.reduce((acc, conn) => {
    acc[conn.name] = conn.label;
    return acc;
  }, {} as Record<string, string>);

  const toggleModelExpansion = (modelName: string) => {
    setExpandedModels(prev => ({
      ...prev,
      [modelName]: !prev[modelName]
    }));
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setStartX(e.clientX);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const delta = e.clientX - startX;
    onWidthChange(width + delta);
    setStartX(e.clientX);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  // Set up event listeners when resizing state changes
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    } else {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    }
    
    // Clean up event listeners on unmount or when isResizing changes
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, width]); // Include width in dependencies to ensure the delta calculation uses the updated width

  return (
    <div className="model-explorer" style={{ width: `${width}px` }}>
      <div className="model-list">
        {["seed", "source", "build", "dbview", "federate"].map((type) => (
          <div key={type} className="model-type-section">
            <h3>{type.toUpperCase()} MODELS</h3>
            {modelsByType[type] ? modelsByType[type].map(model => (
              <div key={model.name} className="model-item">
                <div 
                  className="model-header"
                  onClick={() => toggleModelExpansion(model.name)}
                  data-not-queryable={!model.is_queryable}
                >
                  <div className="model-header-left">
                    <span className="expand-button">
                      {expandedModels[model.name] ? '▼' : '▶'}
                    </span>
                    <div className="model-name">
                      {model.name}
                    </div>
                  </div>
                  {!model.is_queryable && (
                    <span className="warning-icon">
                      <FaExclamationTriangle />
                    </span>
                  )}
                </div>
                {expandedModels[model.name] && (
                  <div className="model-description">
                    {model.config.description}
                    
                    {(model.model_type === "source" || model.model_type === "dbview") && model.config.connection && (
                      <div className="model-connection">
                        <h4>Connection</h4>
                        <div className="connection-info">
                          {connectionMap[model.config.connection]}
                        </div>
                      </div>
                    )}
                    
                    {model.model_type === "source" && model.config.table && (
                      <div className="model-table">
                        <h4>Table</h4>
                        <div className="table-info">
                          {model.config.table}
                        </div>
                      </div>
                    )}
                    
                    {model.config.columns && model.config.columns.length > 0 && (
                      <div className="model-columns">
                        <h4>Columns</h4>
                        <div className="columns-list">
                          {model.config.columns.map(column => (
                            <div 
                              key={column.name} 
                              className="column-item"
                              data-category={column.category}
                            >
                              <div className="column-header">
                                <span className="column-name">{column.name}</span>
                                <span className="column-type">{column.type}</span>
                              </div>
                              {column.description && (
                                <div className="column-description">
                                  {column.description}
                                </div>
                              )}
                              <div className="column-details">
                                <span className="column-category">{column.category}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )) : (
              <div className="no-models-message">No models found</div>
            )}
          </div>
        ))}
      </div>
      <div 
        className="resize-handle-vertical" 
        onMouseDown={handleResizeStart}
        style={{ cursor: isResizing ? 'col-resize' : 'ew-resize' }}
      ></div>
    </div>
  );
} 