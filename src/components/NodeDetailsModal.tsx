import { useEffect, useMemo, useState } from "react";
import { ModelType } from "../types/DataCatalogResponse";
import { DatasetType } from "../types/DataCatalogResponse";
import { DashboardType } from "../types/DataCatalogResponse";
import { ConnectionType } from "../types/DataCatalogResponse";
import Modal from "./Modal";
import "./NodeDetailsModal.css";
import { useApp } from "../context/AppContext";
import { CompiledModelResponse } from "../types/CompiledModelResponse";

export default function NodeDetailsModal({ isOpen, onClose, selectedModel, selectedDataset, selectedDashboard, connections, paramSelections, requestHeaders }: { 
  isOpen: boolean, 
  onClose: () => void, 
  selectedModel: ModelType | null, 
  selectedDataset: DatasetType | null, 
  selectedDashboard: DashboardType | null,
  connections: ConnectionType[],
  paramSelections: Map<string, string[]>,
  requestHeaders: Record<string, string>
}) {
  const { hostname, projectMetadataPath, showModal, userProps } = useApp();
  
  // Create a map of connection names to their labels
  const connectionMap = Object.fromEntries(connections.map(conn => [conn.name, conn.label]));
  const [compiledModel, setCompiledModel] = useState<CompiledModelResponse | null>(null);
  const [isLoadingCompiled, setIsLoadingCompiled] = useState<boolean>(false);

  const toQueryParams = useMemo(() => {
    return (selections?: Map<string, string[]>) => {
      const params = new URLSearchParams();
      if (!selections) return params;
      for (const [key, values] of selections) {
        for (const v of values) params.append(key, v);
      }
      return params;
    };
  }, []);

  useEffect(() => {
    const fetchCompiledModel = async () => {
      if (!isOpen || !selectedModel || !projectMetadataPath) return;
      const modelType = selectedModel.model_type;
      const shouldCompile = modelType === 'build' || modelType === 'dbview' || modelType === 'federate';
      if (!shouldCompile) {
        setCompiledModel(null);
        return;
      }
      try {
        setIsLoadingCompiled(true);
        const queryParams = toQueryParams(paramSelections);
        const urlPath = `${projectMetadataPath}/compiled-models/${encodeURIComponent(selectedModel.name)}` + (queryParams.toString() ? `?${queryParams.toString()}` : "");
        const response = await fetch(hostname + urlPath, {
          method: 'GET',
          credentials: 'include',
          headers: requestHeaders
        });

        const appliedUsername = response.headers.get("Applied-Username");
        if (appliedUsername && userProps.username && appliedUsername !== userProps.username) {
          showModal({ message: "User session was invalidated by the server... Logging out.", title: "Authentication Error", logout: true });
          setCompiledModel(null);
          return;
        }

        if (response.status === 200) {
          const data = await response.json();
          const language = data?.language || '';
          const definition = data?.definition || '';
          const placeholders = data?.placeholders || {};
          setCompiledModel({ language, definition, placeholders });
        } else if (response.status === 401) {
          showModal({ message: "This resource requires authentication", title: "Authentication Error", logout: false });
          setCompiledModel(null);
        } else {
          // Try to parse error JSON; fallback to text
          let message = "An unexpected server error occurred";
          try {
            const data = await response.json();
            message = data.message || message;
          } catch (_) {
            try {
              message = await response.text();
            } catch (_) {}
          }
          console.error(message);
          showModal({ message, title: "Error", logout: false });
          setCompiledModel(null);
        }
      } catch (error) {
        console.error(error);
        setCompiledModel(null);
      } finally {
        setIsLoadingCompiled(false);
      }
    };

    fetchCompiledModel();
  }, [isOpen, selectedModel, projectMetadataPath, hostname, paramSelections, toQueryParams, showModal, userProps.username]);

  const handleCopyDefinition = async () => {
    if (!compiledModel?.definition) return;
    try {
      await navigator.clipboard.writeText(compiledModel.definition);
      showModal({ message: "Definition copied to clipboard!", title: "Success" });
    } catch (_) {
      showModal({ message: "Failed to copy definition", title: "Error" });
    }
  };

  const renderModelMetadata = (model: ModelType) => {
    const isDynamicModel = model.model_type === 'dbview' || model.model_type === 'federate';
    const gridTemplateColumnsStyling = isDynamicModel ? '1fr 80px 1fr 3fr' : '1fr 80px 3fr';

    return (
      <div className="node-metadata">
        <div className="metadata-grid">
          <div className="metadata-row">
            <div className="metadata-title">Description</div>
            <div className="metadata-value">{model.config.description || '—'}</div>
          </div>
          {model.config.connection && (
            <div className="metadata-row">
              <div className="metadata-title">Connection</div>
              <div className="metadata-value">{connectionMap[model.config.connection] || model.config.connection}</div>
            </div>
          )}
          {model.config.table && (
            <div className="metadata-row">
              <div className="metadata-title">Table</div>
              <div className="metadata-value">{model.config.table}</div>
            </div>
          )}
          {model.config.load_to_vdl !== undefined && (
            <div className="metadata-row">
              <div className="metadata-title">In Virtual Data Lake?</div>
              <div className="metadata-value">{model.config.load_to_vdl ? 'Yes' : 'No'}</div>
            </div>
          )}
        </div>

        <div className="">
          <div className="metadata-title">
            Columns ({model.config.columns.length})
          </div>
          <div className="table">
            <div className="table-row header" style={{ gridTemplateColumns: gridTemplateColumnsStyling }}>
              <div className="col name">Column Name</div>
              <div className="col type">Type</div>
              {isDynamicModel && (
                <div className="col condition">Condition</div>
              )}
              <div className="col desc">Description</div>
            </div>
            <div className="table-body">
            {model.config.columns.map((column, index) => (
              <div key={index} className="table-row" style={{ gridTemplateColumns: gridTemplateColumnsStyling }}>
                <div className="col name">{column.name}</div>
                <div className="col type"><span className="type-chip">{column.type}</span></div>
                {isDynamicModel && (
                  <div className="col condition">{column.condition || '—'}</div>
                )}
                <div className="col desc">{column.description || '—'}</div>
              </div>
            ))}
            </div>
          </div>
        </div>

        {(model.model_type !== 'seed' && model.model_type !== 'source') && (
          <div className="">
            <div className="definition-header" style={{ marginTop: '8px' }}>
              <div className="metadata-title" style={{ margin: 0 }}>
                Compiled Definition {compiledModel?.language && <span className="lang-chip">{compiledModel.language}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className="white-button" 
                  onClick={handleCopyDefinition}
                  disabled={isLoadingCompiled || !compiledModel?.definition}
                >
                  Copy
                </button>
              </div>
            </div>
            <pre className="code-block">
              {isLoadingCompiled ? 'Loading…' : (compiledModel?.definition || '—')}
            </pre>

            <div className="metadata-title">Compiled Placeholders</div>
            {isLoadingCompiled ? (
              <div className="metadata-value">Loading…</div>
            ) : (
              <pre className="code-block">{compiledModel ? JSON.stringify(compiledModel.placeholders) : '—'}</pre>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDatasetDetails = (dataset: DatasetType) => {
    return (
      <div className="node-metadata">
        {/* Basic Info */}
        <div className="metadata-grid">
          <div className="metadata-row">
            <div className="metadata-title">Label</div>
            <div className="metadata-value">{dataset.label || '—'}</div>
          </div>
          <div className="metadata-row">
            <div className="metadata-title">Description</div>
            <div className="metadata-value">{dataset.description || '—'}</div>
          </div>
          <div className="metadata-row">
            <div className="metadata-title">Parameters ({dataset.parameters?.length || 0})</div>
            <div className="metadata-value">{dataset.parameters.join(', ')}</div>
          </div>
        </div>

        {/* Schema */}
        <div className="">
          <div className="metadata-title">Columns ({dataset.schema.fields.length})</div>
          <div className="table">
            <div className="table-row header" style={{ gridTemplateColumns: '1fr 80px 1fr 3fr' }}>
              <div className="col name">Column Name</div>
              <div className="col type">Type</div>
              <div className="col condition">Condition</div>
              <div className="col desc">Description</div>
            </div>
            <div className="table-body">
            {dataset.schema.fields.map((field, index) => (
              <div key={index} className="table-row" style={{ gridTemplateColumns: '1fr 80px 1fr 3fr' }}>
                <div className="col name">{field.name}</div>
                <div className="col type"><span className="type-chip">{field.type}</span></div>
                <div className="col condition">{field.condition || '—'}</div>
                <div className="col desc">{field.description || '—'}</div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboardDetails = (dashboard: DashboardType) => {
    return (
      <div className="node-metadata">
        {/* Basic Info */}
        <div className="metadata-grid">
          <div className="metadata-row">
            <div className="metadata-title">Label</div>
            <div className="metadata-value">{dashboard.label || '—'}</div>
          </div>
          <div className="metadata-row">
            <div className="metadata-title">Description</div>
            <div className="metadata-value">{dashboard.description || '—'}</div>
          </div>
          <div className="metadata-row">
            <div className="metadata-title">Result Format</div>
            <div className="metadata-value">{dashboard.result_format || '—'}</div>
          </div>
          <div className="metadata-row">
            <div className="metadata-title">Parameters ({dashboard.parameters?.length || 0})</div>
            <div className="metadata-value">{dashboard.parameters.join(', ')}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        selectedModel ? `Model: ${selectedModel.name}` :
        selectedDataset ? `Dataset: ${selectedDataset.name}` :
        selectedDashboard ? `Dashboard: ${selectedDashboard.name}` :
        'Unrecognized Node Type'
      }
      size="large"
    >
      {selectedModel ? renderModelMetadata(selectedModel) : null}
      {selectedDataset ? renderDatasetDetails(selectedDataset) : null}
      {selectedDashboard ? renderDashboardDetails(selectedDashboard) : null}
    </Modal>
  );
}
