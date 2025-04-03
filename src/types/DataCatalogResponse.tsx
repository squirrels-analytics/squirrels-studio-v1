import { ParameterType } from "./ParametersResponse";

export enum OutputFormatEnum {
    UNSET,
    TABLE,
    PNG,
    HTML
}

export interface DataObjectType {
    name: string;
    label: string;
    parameters_path: string;
    result_path: string;
}

export interface DatasetType extends DataObjectType {}

export interface DashboardType extends DataObjectType {
    result_format: string;
}

export interface ConnectionType {
    name: string;
    label: string;
}

interface ColumnType {
    name: string;
    type: string;
    condition: string;
    description: string;
    category: "dimension" | "metric" | "misc";
    depends_on: string[];
    passthrough: boolean;
}

export interface ModelType {
    name: string;
    model_type: "source" | "seed" | "build" | "dbview" | "federate"; 
    config: {
        description: string;
        columns: ColumnType[];
        load_to_duckdb?: boolean;
        connection?: string;
        table?: string;
    },
    is_queryable: boolean;
}

export type DataTypeType = "dataset" | "dashboard" | "model" | "lineage";

export interface LineageNodeType {
    name: string;
    type: DataTypeType;
}

export interface LineageType {
    type: "buildtime" | "runtime";
    source: LineageNodeType;
    target: LineageNodeType;
}

export interface DataCatalogType {
    parameters: ParameterType[];
    datasets: DatasetType[];
    dashboards: DashboardType[];
    connections: ConnectionType[];
    models: ModelType[];
    lineage: LineageType[];
}