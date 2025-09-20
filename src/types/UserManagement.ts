export interface UserField {
  name: string;
  type: string;
  nullable: boolean;
  enum: string[] | null;
  default: any | null;
}

export interface User {
  username: string;
  is_admin: boolean;
  [key: string]: any;  // For additional dynamic fields
}

export interface UserFieldsResponse {
  fields: UserField[];
} 