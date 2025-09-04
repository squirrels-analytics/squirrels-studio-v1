import { ProjectMetadataType } from './types/ProjectMetadataResponse';

const DEBUG_MODE = false;

export function log(...data: any[]) {
  if (DEBUG_MODE) {
    console.log(...data)
  }
}

export function getProjectMetadataPath(projectName: string | null, projectVersion: string | null): string {
  return `/api/squirrels-v0/project/${projectName}/${projectVersion}`;
}

export function getProjectRelatedQueryParams(hostname: string, projectName: string, projectVersion: string): string {
  if (!hostname || !projectName || !projectVersion) {
    return "";
  }
  const encodedHostname = encodeURIComponent(hostname);
  return `host=${encodedHostname}&projectName=${projectName}&projectVersion=${projectVersion}`;
}

export function validateSquirrelsVersion(metadata: ProjectMetadataType): void {
  const [major, minor] = metadata.squirrels_version.split('.').map(Number);
  if (major < 0 || (major === 0 && minor < 5)) {
    throw new Error(`Squirrels Studio requires your project's Squirrels version to be 0.5.0 or higher. The Squirrels version used by this project is: ${metadata.squirrels_version}`);
  }
}
