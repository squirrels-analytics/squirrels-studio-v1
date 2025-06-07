import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../Router';
import { FaCopy, FaBars } from 'react-icons/fa';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';

import { ParamDataType, ParameterType } from '../types/ParametersResponse.js';
import { TableDataType } from '../types/DatasetResponse.js';
import { OutputFormatEnum, ModelType, LineageType, DataTypeType, ConnectionType } from '../types/DataCatalogResponse.js';
import Settings from '../components/Settings.js'
import ResultTable from '../components/ResultTable.js';
import { ParametersContainer } from '../components/ParameterWidgets.js';
import './ExplorerPage.css';
import { validateSquirrelsVersion } from '../utils';
import ModelExplorer from '../components/ModelExplorer';
import LineageGraph from '../components/LineageGraph';
import { ProjectMetadataType } from '../types/ProjectMetadataResponse.js';

interface ConfigureOptions {
  limit: number;
}

interface LastRequest {
  url: string;
  paramSelections: Map<string, string[]>;
  limit: number;
  page: number;
  sqlQuery?: string;
}

async function copyTableData(tableData: TableDataType): Promise<string | null> {
    if (tableData === null || typeof tableData == "string") return null;

    let text = "";
    const fields = tableData.schema.fields;
    for (let j = 0; j < fields.length; j++) {
        if (j !== 0) text += "\t";
        text += fields[j].name;
    }
    text += "\n";

    for (let i = 0; i < tableData.data.length; i++) {
        const tableRow = tableData.data[i];
        for (let j = 0; j < tableRow.length; j++) {
            if (j !== 0) text += "\t";
            text += tableRow[j];
        }
        text += "\n";
    }

    return text;
}

async function callAPI(
    url: string, username: string, callback: (x: Response) => Promise<void>, 
    setIsLoading: (x: boolean) => void, showModal: (message: string, title: string, logout: boolean) => void
) {
    setIsLoading(true);

    try {
        const response = await fetch(url, {
            credentials: 'include'
        });

        const appliedUsername = response.headers.get("Applied-Username");

        // appliedUsername is null for APIs that aren't impacted by auth, or under certain 400/500 error statuses
        if (appliedUsername && username && appliedUsername !== username) {
            showModal("User session was invalidated by the server... Logging out.", "Authentication Error", true);
        }
        if (response.status === 200) {
            await callback(response);
        }
        else if (response.status === 401) {
            showModal("This resource requires authentication", "Authentication Error", false);
        }
        else {
            const data = await response.json();
            console.error(data.message || "An error occurred");
            showModal(data.message || "An unexpected server error occurred", "Error", false);
        }
    }
    catch(error) {
        console.error(error);
    }
    
    setIsLoading(false);
}

async function callJsonAPI(
    url: string, username: string, callback: (x: any) => Promise<void>, 
    setIsLoading: (x: boolean) => void, showModal: (message: string, title: string, logout: boolean) => void
) {
    const newCallback = async (x: Response) => {
        const data = await x.json();
        await callback(data);
    };
    await callAPI(url, username, newCallback, setIsLoading, showModal);
}

export default function ExplorerPage() {
    const navigate = useNavigate();
        const { 
        userProps, 
        setUserProps, 
        showModal,
        setIsLoading,
        hostname, 
        projectVersion, 
        projectMetadataPath, 
        projectRelatedQueryParams 
    } = useApp();
    const { username, isAdmin } = userProps;
    
    // Fetch user properties on mount
    useEffect(() => {
        if (!hostname || !projectMetadataPath) {
          navigate('/');
          return;
        }

        const fetchUserProps = async () => {
          try {
            const response = await fetch(`${hostname}/api/auth/userinfo`, {
              credentials: 'include'
            });
            
            if (response.status === 200) {
              const data = await response.json();
              setUserProps({
                username: data.username,
                isAdmin: data.is_admin
              });
            } else if (response.status === 401) {
              // Not authenticated, clear user props
              setUserProps({
                username: '',
                isAdmin: false
              });
            }
          } catch (error) {
            console.error('Error fetching user properties:', error);
            // On error, clear user props
            setUserProps({
              username: '',
              isAdmin: false
            });
          }
        };

        fetchUserProps();
    }, [hostname, projectMetadataPath, navigate, setUserProps]);
    
    const parametersURL = useRef("");
    const resultsURL = useRef("");

    const [projectMetadata, setProjectMetadata] = useState<ProjectMetadataType | null>(null);
    const [paramData, setParamData] = useState<ParameterType[] | null>(null);
    const [resultContent, setResultContent] = useState<TableDataType | string | null>(null);
    const [outputFormat, setOutputFormat] = useState(OutputFormatEnum.UNSET);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const [configureOptions, setConfigureOptions] = useState<ConfigureOptions>({
        limit: 1000
    });

    const [lastRequest, setLastRequest] = useState<LastRequest | null>(null);
    const [models, setModels] = useState<ModelType[]>([]);
    const [connections, setConnections] = useState<ConnectionType[]>([]);
    const [lineageData, setLineageData] = useState<LineageType[]>([]);
    const [dataMode, toggleDataMode] = useState<DataTypeType>("dataset");

    const [explorerHeight, setExplorerHeight] = useState(150);
    const resizeStartPosition = useRef(0);
    const isResizing = useRef(false);

    const [sqlQuery, setSqlQuery] = useState<string>('');
    const editorRef = useRef<any>(null);

    const [explorerWidth, setExplorerWidth] = useState(320);

    const fetchJson = useCallback(async (urlPath: string, callback: (x: any) => Promise<void>) => {
        if (!urlPath) return;
        await callJsonAPI(hostname + urlPath, username, callback, setIsLoading, showModal);
    }, [username]);

    const fetchHTTPResponse = useCallback(async (urlPath: string, callback: (x: Response) => Promise<void>) => {
        if (!urlPath) return;
        await callAPI(hostname + urlPath, username, callback, setIsLoading, showModal);
    }, [username]);

    useEffect(() => {
        if (!projectMetadataPath) return;
        fetchJson(projectMetadataPath, async (metadata: ProjectMetadataType) => {
            try {
                validateSquirrelsVersion(metadata);
                setProjectMetadata(metadata);
            } catch (error: any) {
                console.error(error.message);
                navigate('/');
            }
        });
    }, [projectMetadataPath]);

    const toQueryParams = (paramSelections: Map<string, string[]>) => {
        const queryParams = new URLSearchParams();
        for (const [param, selections] of paramSelections) {
            for (const selection of selections) {
                queryParams.append(param, selection);
            }
        }
        return queryParams;
    }

    const refreshWidgetStates = (provoker: string, selections: string[]) => { 
        const queryParams = toQueryParams(new Map([["x_parent_param", [provoker]], [provoker, selections]]));
        const requestURL = parametersURL.current + '?' + queryParams;
        fetchJson(requestURL, async (x: ParamDataType) => setParamData(paramData => {
            const newParamData = paramData!.slice();
            x.parameters.forEach(currParam => {
                const index = newParamData.findIndex(y => y.name === currParam.name);
                if (index !== -1) newParamData[index] = currParam;
            })
            return newParamData;
        }));
    };

    const clearTableData = () => {
        setResultContent(null);
    }

    const getTotalPages = (totalRows: number, limit: number) => Math.ceil(totalRows / limit);

    const getRequestURL = (url: string, paramSelections: Map<string, string[]>, offset: number, limit: number, sqlQuery?: string) => {
        const queryParams = toQueryParams(paramSelections);
        queryParams.append('x_offset', offset.toString());
        queryParams.append('x_limit', limit.toString());
        queryParams.append('x_orientation', "rows");
        if (sqlQuery) {
            queryParams.append('x_sql_query', sqlQuery);
        }
        return url + '?' + queryParams;
    }

    const handlePagination = (direction: 'first' | 'prev' | 'next' | 'last') => {
        if (!lastRequest) return;
        
        const totalPages = getTotalPages((resultContent as TableDataType)?.total_num_rows || 0, lastRequest.limit);
        
        const newPage = direction === 'first' ? 1 :
            direction === 'prev' ? lastRequest.page - 1 :
            direction === 'next' ? lastRequest.page + 1 :
            totalPages;
        
        // Reuse the last request but with new offset
        const offset = (newPage - 1) * lastRequest.limit;
        const requestURL = getRequestURL(lastRequest.url, lastRequest.paramSelections, offset, lastRequest.limit, lastRequest.sqlQuery);

        setLastRequest({
            ...lastRequest,
            page: newPage
        });

        fetchJson(requestURL, async (data: TableDataType) => {
            setResultContent(data);
        });
    };

    const updateTableData = (paramSelections: Map<string, string[]>) => {
        if (resultsURL.current === "") return;

        const offset = 0;  // Reset offset to 0 for page 1
        const requestURL = getRequestURL(resultsURL.current, paramSelections, offset, configureOptions.limit);

        // Save this request for pagination
        setLastRequest({
            url: resultsURL.current,
            paramSelections: paramSelections,
            limit: configureOptions.limit,
            page: 1
        });

        const callback = async (x: Response) => {
            const data = (outputFormat === OutputFormatEnum.TABLE) ? await x.json() : 
                (outputFormat === OutputFormatEnum.PNG) ? btoa(String.fromCharCode(...new Uint8Array(await x.arrayBuffer()))) :
                (outputFormat === OutputFormatEnum.HTML) ? await x.text() : 
                null;
            setResultContent(data);
        }
        fetchHTTPResponse(requestURL, callback);
    };

    const handleRunQuery = (paramSelections: Map<string, string[]>, query: string) => {
        if (!query.trim()) return;
        
        const offset = 0;  // Reset offset to 0 for page 1
        const requestURL = getRequestURL(resultsURL.current, paramSelections, offset, configureOptions.limit, query);
        
        // Save this request for pagination
        setLastRequest({
            url: resultsURL.current,
            paramSelections: paramSelections,
            limit: configureOptions.limit,
            page: 1,
            sqlQuery: query
        });

        fetchJson(requestURL, async (data: TableDataType) => {
            setResultContent(data);
        });
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && 
                !menuRef.current.contains(event.target as Node) && 
                !menuButtonRef.current?.contains(event.target as Node)) {
                setShowMenu(false);
            }
        }

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const handleCopyTable = async () => {
        if (resultContent === null || outputFormat !== OutputFormatEnum.TABLE) return;
        
        const text = await copyTableData(resultContent as TableDataType);
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                showModal("Table copied to clipboard!", "Success");
            }, () => {
                showModal("Table failed to copy", "Error");
            });
        }
    };

    const copyTableButton = (
        <button 
            className="white-button" 
            onClick={handleCopyTable}
            disabled={resultContent === null || outputFormat !== OutputFormatEnum.TABLE}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
        >
            <FaCopy /> Copy
        </button>
    );

    const menuButton = (
        <div className="menu-button-container">
            <button 
                className="white-button" 
                ref={menuButtonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
                <FaBars /> Menu
            </button>
            {showMenu && (
                <div className="menu-panel" ref={menuRef}>
                    <ul className="menu-list">
                        <li className="menu-section">
                            <div className="menu-section-header">Navigation</div>
                            {username && (
                                <div 
                                    className="menu-item"
                                    onClick={() => {
                                        navigate(`/settings?${projectRelatedQueryParams}`);
                                        setShowMenu(false);
                                    }}
                                >
                                    User Settings
                                </div>
                            )}
                            {username && isAdmin && (
                                <div 
                                    className="menu-item"
                                    onClick={() => {
                                        navigate(`/users?${projectRelatedQueryParams}`);
                                        setShowMenu(false);
                                    }}
                                >
                                    Manage Users
                                </div>
                            )}
                            <div 
                                className="menu-item"
                                onClick={() => {
                                    navigate(`/login?${projectRelatedQueryParams}`);
                                    setShowMenu(false);
                                }}
                            >
                                {username ? 'Logout' : 'Login'}
                            </div>
                        </li>
                        {outputFormat === OutputFormatEnum.TABLE && (
                            <li className="menu-section">
                                <div className="menu-section-header">Configurations</div>
                                <div className="menu-config-item">
                                    <label htmlFor="rows-per-page">Rows per page:</label>
                                    <input
                                        id="rows-per-page"
                                        type="number"
                                        className="widget config-input"
                                        value={configureOptions.limit}
                                        min={1}
                                        onChange={(e) => setConfigureOptions({
                                            ...configureOptions,
                                            limit: parseInt(e.target.value) || 1
                                        })}
                                    />
                                </div>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );

    const nextLinkDisabled = ((resultContent as TableDataType)?.total_num_rows || 0) <= (lastRequest?.page || 1) * (lastRequest?.limit || 1000);
    const paginationContainer = (outputFormat === OutputFormatEnum.TABLE && typeof resultContent !== 'string') ? (
        <div id="pagination-container">
            <span 
                className={`pagination-link ${(lastRequest?.page || 1) <= 1 ? 'disabled' : ''}`}
                onClick={() => {
                    setLastRequest({...lastRequest!, page: 1}) 
                    handlePagination('first')
                }}
            >
                &lt;&lt; first
            </span>
            <span 
                className={`pagination-link ${(lastRequest?.page || 1) <= 1 ? 'disabled' : ''}`}
                onClick={() => (lastRequest?.page || 1) > 1 && handlePagination('prev')}
            >
                &lt; prev
            </span>
            <span className="pagination-text">
                Page {lastRequest?.page || 1} of {getTotalPages((resultContent as TableDataType)?.total_num_rows || 0, lastRequest?.limit || 1000)}
            </span>
            <span 
                className={`pagination-link ${nextLinkDisabled ? 'disabled' : ''}`}
                onClick={() => !nextLinkDisabled && handlePagination('next')}
            >
                next &gt;
            </span>
            <span 
                className={`pagination-link ${nextLinkDisabled ? 'disabled' : ''}`}
                onClick={() => {
                    if (!nextLinkDisabled) {
                        const totalPages = getTotalPages((resultContent as TableDataType)?.total_num_rows || 0, lastRequest?.limit || 1000);
                        setLastRequest({...lastRequest!, page: totalPages});
                        handlePagination('last');
                    }
                }}
            >
                last &gt;&gt;
            </span>
        </div>
    ) : null;

    const paramSelections = useRef(new Map<string, string[]>());
    
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        isResizing.current = true;
        resizeStartPosition.current = e.clientY;
        document.addEventListener('mousemove', handleResizeMouseMove);
        document.addEventListener('mouseup', handleResizeMouseUp);
        e.preventDefault();
    };

    const handleResizeMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const delta = e.clientY - resizeStartPosition.current;
        setExplorerHeight(prev => Math.max(100, Math.min(window.innerHeight - 200, prev + delta)));
        resizeStartPosition.current = e.clientY;
    };

    const handleResizeMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
    };

    // Clean up event listeners on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleResizeMouseMove);
            document.removeEventListener('mouseup', handleResizeMouseUp);
        };
    }, []);

    const handleExplorerWidthChange = (newWidth: number) => {
        setExplorerWidth(Math.max(200, Math.min(450, newWidth)));
    };

    // Create a function to generate completions based on model names
    const createModelCompletions = useCallback(() => {
        return (context: CompletionContext): CompletionResult | null => {
            const word = context.matchBefore(/\w*/);
            if (!word || word.from === word.to && !context.explicit) return null;
            
            // Generate completions for all model names
            const queryableModels = models.filter(model => model.model_type !== "source" || model.config.load_to_duckdb);
            return {
                from: word.from,
                options: queryableModels.map(model => ({
                    label: model.name,
                    type: "constant",
                    info: model.config.description || undefined
                }))
            };
        };
    }, [models]);
    
    // Create the autocompletion extension with model names
    const autocompleteExtension = useCallback(() => {
        return autocompletion({
            override: [createModelCompletions()]
        });
    }, [createModelCompletions]);

    // Create a keymap extension for Ctrl+Enter
    const keymapExtension = useCallback(() => {
        return Prec.highest(keymap.of([{
            key: "Mod-Enter",  // Using Mod instead of Ctrl to support both Windows (Ctrl) and Mac (Cmd)
            run: () => {
                if (sqlQuery.trim()) {
                    handleRunQuery(paramSelections.current, sqlQuery);
                }
                return true;
            },
            preventDefault: true
        }]));
    }, [sqlQuery]);

    return (
        <> 
            <div id="main-container">
                <div id="left-container">
                    <div className="left-container-content">
                        <Settings
                            projectMetadataPath={projectMetadataPath}
                            parametersURL={parametersURL}
                            resultsURL={resultsURL}
                            fetchJson={fetchJson}
                            setParamData={setParamData}
                            clearTableData={clearTableData}
                            setOutputFormat={setOutputFormat}
                            isAdmin={isAdmin}
                            dataMode={dataMode}
                            toggleDataMode={(newMode) => {
                                toggleDataMode(newMode);
                                // Clear previous result content when switching modes to prevent rendering issues
                                setResultContent(null);
                            }}
                            setModels={setModels}
                            setConnections={setConnections}
                            setLineageData={setLineageData}
                        />
                        <br/><hr/><br/>
                        <ParametersContainer 
                            paramData={paramData} 
                            paramSelections={paramSelections}
                            refreshWidgetStates={refreshWidgetStates}
                        />
                    </div>
                    {dataMode !== "model" && dataMode !== "lineage" && (
                        <div className="left-container-footer">
                            <button 
                                className="blue-button"
                                style={{width: '100%'}}
                                onClick={() => updateTableData(paramSelections.current)}
                            >
                                Apply
                            </button>
                        </div>
                    )}
                </div>
                <div id="header-container">
                    <span style={{margin: "0 0.5rem"}}><b>Project Name:</b> {projectMetadata?.label || ''} ({projectVersion})</span>
                    <div className="horizontal-container">
                        <div className="auth-container">
                            {!username ? (
                                <span>Exploring as Guest</span>
                            ) : (
                                <span>Logged in as "{username}"</span>
                            )}
                        </div>
                        <div className="header-buttons">
                            {menuButton}
                            {copyTableButton}
                        </div>
                    </div>
                </div>
                
                <div id="right-container">
                    {dataMode === "model" ? (
                        <div className="table-container">
                            <div className="model-view-layout">
                                <ModelExplorer 
                                    models={models}
                                    connections={connections}
                                    width={explorerWidth}
                                    onWidthChange={handleExplorerWidthChange}
                                />
                                <div className="model-view-content" style={{ width: `calc(100% - ${explorerWidth}px)` }}>
                                    <div className="sql-editor-container" style={{ height: `${explorerHeight}px` }}>
                                        <div className="sql-editor-label">
                                            SQL Query Editor
                                        </div>
                                        <CodeMirror
                                            value={sqlQuery}
                                            height="calc(100% - 50px)"
                                            onChange={(value) => setSqlQuery(value)}
                                            extensions={[
                                                sql(),
                                                autocompleteExtension(),
                                                keymapExtension()
                                            ]}
                                            basicSetup={{
                                                lineNumbers: true,
                                                highlightActiveLineGutter: true,
                                                highlightSpecialChars: true,
                                                foldGutter: true,
                                                indentOnInput: false,
                                                bracketMatching: true,
                                                closeBrackets: true,
                                                autocompletion: true,
                                                highlightSelectionMatches: true,
                                                tabSize: 2,
                                            }}
                                            placeholder="Write your SQL query here... (Press Ctrl+Enter to run)"
                                            className="sql-editor"
                                            onCreateEditor={(editor) => {
                                                editorRef.current = editor;
                                            }}
                                        />
                                        <div className="sql-editor-actions">
                                            <button 
                                                className="white-button clear-query-button"
                                                onClick={() => setSqlQuery('')}
                                                disabled={!sqlQuery}
                                            >
                                                Clear
                                            </button>
                                            <button 
                                                className="blue-button run-query-button"
                                                onClick={() => handleRunQuery(paramSelections.current, sqlQuery)}
                                                disabled={!sqlQuery.trim()}
                                            >
                                                Run Query
                                            </button>
                                        </div>
                                    </div>
                                    <div 
                                        className="resize-handle"
                                        onMouseDown={handleResizeMouseDown}
                                    ></div>
                                    <ResultTable 
                                        tableDataObj={resultContent} 
                                        outputFormat={OutputFormatEnum.TABLE} 
                                        paginationContainer={paginationContainer}
                                        tableContentStyle={{ height: `calc(100% - ${explorerHeight}px - 10px)` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : dataMode === "lineage" ? (
                        <div className="table-container">
                            <LineageGraph lineageData={lineageData} models={models} />
                        </div>
                    ) : (
                        <div className="table-container">
                            <ResultTable 
                                tableDataObj={resultContent} 
                                outputFormat={outputFormat} 
                                paginationContainer={paginationContainer}
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 