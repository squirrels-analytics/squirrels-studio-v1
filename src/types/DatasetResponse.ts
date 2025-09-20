export interface FieldType {
  name: string;
  type: string;
  condition: string;
  description: string;
  category: "dimension" | "metric" | "misc";
}

export interface SchemaType {
  fields: FieldType[];
  dimensions: string[];
}

export interface TableDataType {
  schema: SchemaType;
  total_num_rows: number;
  data_details: {
    num_rows: number;
    orientation: "rows";
  };
  data: any[][];
}
