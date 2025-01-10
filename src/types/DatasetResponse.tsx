export interface TableDataType {
    schema: {
        fields: {
            name: string;
            type: string;
        }[];
        dimensions: string[];
    };
    total_num_rows: number;
    data: Record<string, any>[];
}
