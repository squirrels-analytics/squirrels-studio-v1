export interface ProjectMetadataType {
  name: string;
  version: string;
  label: string;
  description: string;
  elevated_access_level?: "admin" | "member" | "guest";
  redoc_path?: string;
  swagger_path?: string;
  mcp_server_path?: string;
  squirrels_version: string; // Ex. a semantic version like "0.1.0"
}
