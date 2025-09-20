import { useState, MutableRefObject, useEffect } from 'react';
import { log } from '../utils';
import { ParamDataType, ParameterType } from '../types/ParametersResponse';
import { DataObjectType, DashboardType, DataCatalogType, OutputFormatEnum, ModelType, DatasetType, LineageType, DataTypeType, ConnectionType, ConfigurablesType } from '../types/DataCatalogResponse';


interface SettingsProps {
  projectMetadataPath: string | null;
  parametersURL: MutableRefObject<string>;
  resultsURL: MutableRefObject<string>;
  fetchJson: (url: string, callback: (x: any) => Promise<void>) => Promise<void>;
  setParamData: (x: ParameterType[] | null) => void;
  clearTableData: () => void;
  setOutputFormat: (x: OutputFormatEnum) => void;
  isAdmin: boolean;
  dataMode: DataTypeType;
  datasets: DatasetType[];
  dashboards: DashboardType[];
  toggleDataMode: (x: DataTypeType) => void;
  setModels: (x: ModelType[]) => void;
  setConnections: (x: ConnectionType[]) => void;
  setLineageData: (x: LineageType[]) => void;
  setConfigurables: (x: ConfigurablesType[]) => void;
  setDatasets: (x: DatasetType[]) => void;
  setDashboards: (x: DashboardType[]) => void;
}

export default function Settings({ 
  projectMetadataPath, parametersURL, resultsURL, fetchJson, setParamData, clearTableData, setOutputFormat, isAdmin, 
  dataMode, datasets, dashboards, toggleDataMode, setModels, setConnections, setLineageData, setConfigurables, setDatasets, setDashboards
}: SettingsProps) {

  const [dataObj, setDataObj] = useState<DataObjectType | null>(null);

  useEffect(() => {
    if (!projectMetadataPath) return;

    const dataCatalogURL = `${projectMetadataPath}/data-catalog`;
    fetchJson(dataCatalogURL, async (x: DataCatalogType) => {
      log("setting list of datasets / dashboards / models available");
      setModels(x.models);
      setConnections(x.connections);
      setDatasets(x.datasets);
      setDashboards(x.dashboards);
      setLineageData(x.lineage);
      setConfigurables(x.configurables || []);
    });
  }, [fetchJson]);

  useEffect(() => {
    if (dataMode === "dataset" && datasets.length > 0) {
      log(`setting dataset name to ${datasets[0].name}`)
      setDataObj(datasets[0]);
    }
    else if (dataMode === "dashboard" && dashboards.length > 0) {
      log(`setting dashboard name to ${dashboards[0].name}`)
      setDataObj(dashboards[0]);
    }
    else {
      log("no datasets or dashboards found...");
      setDataObj(null);
    }
  }, [dataMode, datasets, dashboards]);
  
  useEffect(() => {
    if (dataMode === "dashboard") {
      const result_format = (dataObj && "result_format" in dataObj) ? (dataObj as DashboardType).result_format : null;
      const formatAsString = result_format ? result_format.toUpperCase() : "UNSET";
      log(`setting output format to ${formatAsString}`)
      setOutputFormat(OutputFormatEnum[formatAsString as keyof typeof OutputFormatEnum]);
    }
    else if (dataMode === "lineage") {
      log(`setting output format to UNSET`)
      setOutputFormat(OutputFormatEnum.UNSET);
    }
    else {
      log(`setting output format to TABLE`)
      setOutputFormat(OutputFormatEnum.TABLE);
    }
  }, [dataMode, dataObj]);

  useEffect(() => {
    clearTableData();

    log("setting parameter data with dataMode", dataMode)
    if (dataMode === "model") {
      parametersURL.current = `${projectMetadataPath}/parameters`;
      resultsURL.current = `${projectMetadataPath}/query-result`;
    }
    else if (dataMode === "lineage") {
      parametersURL.current = `${projectMetadataPath}/parameters`;
      resultsURL.current = "";
    }
    else if (
      (dataMode === "dataset" && dataObj && "schema" in dataObj) || 
      (dataMode === "dashboard" && dataObj && "result_format" in dataObj)
    ) {
      parametersURL.current = dataObj.parameters_path;
      resultsURL.current = dataObj.result_path;
    }
    else {
      parametersURL.current = "";
      resultsURL.current = "";
      setParamData(null);
    }

    if (parametersURL.current) {
      fetchJson(parametersURL.current, async (x: ParamDataType) => { setParamData(x.parameters) });
    }
  }, [dataMode, dataObj]);

  const dataObjList = (dataMode === "dataset") ? datasets : (dataMode === "dashboard") ? dashboards : null;
  const dataObjOptions = dataObjList ? dataObjList.map(x => 
    <option key={x.name} value={x.name}>{x.label}</option>
  ) : <></>;
  
  return (
    <div className="widget-container">
      <div>
        <div className="widget-label"><b>Explore</b></div>
        <select id="data-type-select" 
          className="padded widget"
          value={dataMode}
          onChange={e => {
            const value = e.target.value as DataTypeType;
            toggleDataMode(value);
          }}
        >
          <option value="dataset">Datasets</option>
          <option value="dashboard">Dashboards</option>
          {isAdmin && <option value="model">Data Models</option>}
          {isAdmin && <option value="lineage">Data Lineage</option>}
        </select>
      </div>
      {dataMode !== "model" && dataMode !== "lineage" && (
        <div>
          <div className="widget-label">
            <b>Select a {dataMode === "dashboard" ? "Dashboard" : "Dataset"}:</b>
          </div>
          <select id="dataset-select" 
            className="padded widget"
            value={dataObj?.name}
            onChange={e => setDataObj(dataObjList?.find(x => x.name === e.target.value) || null)}
          >
            {dataObjOptions}
          </select>
        </div>
      )}
    </div>
  );
}
