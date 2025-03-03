import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Router';
import { FaCopy, FaBars } from 'react-icons/fa';

import { ProjectMetadataType } from '../types/ProjectMetadataResponse.js';
import { ParamDataType, ParameterType } from '../types/ParametersResponse.js';
import { TableDataType } from '../types/DatasetResponse.js';
import { OutputFormatEnum } from '../types/DataCatalogResponse.js';

import LoadingSpinner from '../components/LoadingSpinner.js';
import Settings from '../components/Settings.js'
import ResultTable from '../components/ResultTable.js';
import { ParametersContainer } from '../components/ParameterWidgets.js';
import './ExplorerPage.css';
import { getHashParams } from '../utils/urlParams';

interface ConfigureOptions {
  limit: number;
}

interface LastRequest {
  url: string;
  paramSelections: Map<string, string[]>;
  limit: number;
  page: number;
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
        for (let j = 0; j < fields.length; j++) {
            if (j !== 0) text += "\t";
            text += tableRow[fields[j].name];
        }
        text += "\n";
    }

    return text;
}

async function callAPI(
    hostname: string, url: string, jwtToken: string, username: string, callback: (x: Response) => Promise<void>, 
    setIsLoading: (x: boolean) => void, logout: () => void
) {
    setIsLoading(true);
    
    try {
        const response = await fetch(hostname+url, {
            headers: {
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        const appliedUsername = response.headers.get("Applied-Username");

        // appliedUsername is null for APIs that aren't impacted by auth, or under certain 400/500 error statuses
        // Also, if logged in but server restarted, token no longer works so we get 401 error. Should logout in this case
        const hasAppliedUsername = (appliedUsername !== null || response.status === 401)
        if (hasAppliedUsername && username !== "" && appliedUsername !== username) {
            alert("User session was invalidated by the server... Logging out.");
            logout();
        }
        if (response.status === 200) {
            await callback(response);
        }
        else {
            const data = await response.json();
            alert(data.message);
        }
    }
    catch(error) {
        console.error(error);
        alert("An unexpected error occurred")
    }

    setIsLoading(false);
}

async function callJsonAPI(
    hostname: string, url: string, jwtToken: string, username: string, callback: (x: any) => Promise<void>, 
    setIsLoading: (x: boolean) => void, logout: () => void
) {
    const newCallback = async (x: Response) => {
        const data = await x.json();
        await callback(data);
    };
    await callAPI(hostname, url, jwtToken, username, newCallback, setIsLoading, logout);
}

export default function ExplorerPage() {
    const navigate = useNavigate();
    const { isAuthenticated, username, jwtToken, logout, isAdmin } = useAuth();
    
    const searchParams = getHashParams();
    const hostname = searchParams.get('host');
    const projectName = searchParams.get('projectName');
    const projectVersion = searchParams.get('projectVersion');

    useEffect(() => {
      if (!hostname || !projectName || !projectVersion) {
        navigate('/');
      }
    }, [hostname, projectName, projectVersion, navigate]);
  
    if (!hostname || !projectName || !projectVersion) {
      return null;
    }
    const encodedHostname = encodeURIComponent(hostname);
    const projectMetadataURL = `/api/squirrels-v0/project/${projectName}/${projectVersion}`;
    
    const [isLoading, setIsLoading] = useState(false);

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

    const fetchJson = async (url: string, callback: (x: any) => Promise<void>) => {
        if (!isAuthenticated) {
            try {
                setIsLoading(true);
                const response = await fetch(hostname + url);
                if (response.status === 200) {
                    const data = await response.json();
                    await callback(data);
                } else if (response.status === 401) {
                    alert("This resource requires authentication");
                } else {
                    const data = await response.json();
                    alert(data.message || "An error occurred");
                }
            } catch (error) {
                console.error(error);
                alert("An unexpected error occurred");
            } finally {
                setIsLoading(false);
            }
        } else {
            await callJsonAPI(hostname, url, jwtToken, username, callback, setIsLoading, handleLogout);
        }
    };

    const fetchHTTPResponse = async (url: string, callback: (x: Response) => Promise<void>) => {
        if (!isAuthenticated) {
            try {
                setIsLoading(true);
                const response = await fetch(hostname + url);
                if (response.status === 200) {
                    await callback(response);
                } else if (response.status === 401) {
                    alert("This resource requires authentication");
                } else {
                    const data = await response.json();
                    alert(data.message || "An error occurred");
                }
            } catch (error) {
                console.error(error);
                alert("An unexpected error occurred");
            } finally {
                setIsLoading(false);
            }
        } else {
            await callAPI(hostname, url, jwtToken, username, callback, setIsLoading, handleLogout);
        }
    };

    const handleLogout = () => {
        logout();
        navigate(`/login?host=${encodedHostname}&projectName=${projectName}&projectVersion=${projectVersion}`);
    };

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

    const handlePagination = (direction: 'first' | 'prev' | 'next' | 'last') => {
        if (!lastRequest) return;
        
        const totalPages = getTotalPages((resultContent as TableDataType)?.total_num_rows || 0, lastRequest.limit);
        
        const newPage = direction === 'first' ? 1 :
            direction === 'prev' ? lastRequest.page - 1 :
            direction === 'next' ? lastRequest.page + 1 :
            totalPages;
        
        setLastRequest({
            ...lastRequest,
            page: newPage
        });

        // Reuse the last request but with new offset
        const offset = (newPage - 1) * lastRequest.limit;
        const queryParams = toQueryParams(lastRequest.paramSelections);
        queryParams.append('x_offset', offset.toString());
        queryParams.append('x_limit', lastRequest.limit.toString());
        const requestURL = lastRequest.url + '?' + queryParams;

        const callback = async (x: Response) => {
            const data = (outputFormat === OutputFormatEnum.TABLE) ? await x.json() : 
                (outputFormat === OutputFormatEnum.PNG) ? btoa(String.fromCharCode(...new Uint8Array(await x.arrayBuffer()))) :
                (outputFormat === OutputFormatEnum.HTML) ? await x.text() : 
                null;
            setResultContent(data);
        }
        fetchHTTPResponse(requestURL, callback);
    };

    const updateTableData = (paramSelections: Map<string, string[]>) => {
        if (resultsURL.current === "") return;

        const queryParams = toQueryParams(paramSelections);
        queryParams.append('x_offset', '0');  // Reset offset to 0 for page 1
        queryParams.append('x_limit', configureOptions.limit.toString());
        const requestURL = resultsURL.current + '?' + queryParams;

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

    useEffect(() => {
        fetchJson(projectMetadataURL, async x => setProjectMetadata(x));
    }, []);

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
                alert("Table copied to clipboard!");
            }, () => {
                alert("ERROR: Table failed to copy");
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
                            {isAuthenticated && (
                                <div 
                                    className="menu-item"
                                    onClick={() => {
                                        navigate(`/settings?host=${encodedHostname}&projectName=${projectName}&projectVersion=${projectVersion}`);
                                        setShowMenu(false);
                                    }}
                                >
                                    User Settings
                                </div>
                            )}
                            {isAuthenticated && isAdmin && (
                                <div 
                                    className="menu-item"
                                    onClick={() => {
                                        navigate(`/users?host=${encodedHostname}&projectName=${projectName}&projectVersion=${projectVersion}`);
                                        setShowMenu(false);
                                    }}
                                >
                                    Manage Users
                                </div>
                            )}
                            <div 
                                className="menu-item"
                                onClick={() => {
                                    handleLogout();
                                    setShowMenu(false);
                                }}
                            >
                                {isAuthenticated ? 'Logout' : 'Login'}
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
    
    return (
        <> 
            <div id="main-container">
                <div id="left-container">
                    <div className="left-container-content">
                        <Settings 
                            projectMetadata={projectMetadata}
                            parametersURL={parametersURL}
                            resultsURL={resultsURL}
                            fetchJson={fetchJson}
                            setParamData={setParamData}
                            clearTableData={clearTableData}
                            setOutputFormat={setOutputFormat}
                        />
                        <br/><hr/><br/>
                        <ParametersContainer 
                            paramData={paramData} 
                            paramSelections={paramSelections}
                            refreshWidgetStates={refreshWidgetStates}
                        />
                    </div>
                    <div className="left-container-footer">
                        <button 
                            className="blue-button"
                            style={{width: '100%'}}
                            onClick={() => updateTableData(paramSelections.current)}
                        >
                            Apply
                        </button>
                    </div>
                </div>
                <div id="header-container">
                    <span style={{margin: "0 0.5rem"}}><b>Project Name:</b> {projectMetadata?.label} ({projectVersion})</span>
                    <div className="horizontal-container">
                        <div className="auth-container">
                            {!isAuthenticated ? (
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
                <div id="table-container">
                    <div className="table-content">
                        <ResultTable tableDataObj={resultContent} outputFormat={outputFormat} />
                    </div>
                    {paginationContainer}
                </div>
            </div>

            <LoadingSpinner isLoading={isLoading} />
        </>
    );
} 