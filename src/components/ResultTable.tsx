import './ResultTable.css'

import { TableDataType } from '../types/DatasetResponse.tsx'
import { OutputFormatEnum } from '../types/DataCatalogResponse.tsx';
import { log } from '../utils';


interface ResultTableContentProps {
    tableDataObj: TableDataType | string | null;
    outputFormat: OutputFormatEnum;
}

function ResultTableContent({ tableDataObj, outputFormat }: ResultTableContentProps) {
    if (outputFormat === OutputFormatEnum.HTML) {
        log("rendering html")
        return (<iframe srcDoc={tableDataObj as string} style={{minWidth: "100%", minHeight: "100%"}} />);
    }
    else if (outputFormat === OutputFormatEnum.PNG) {
        log("rendering image")
        return (<img src={"data:image/png;base64," + (tableDataObj as string)} />);
    }
    else if (outputFormat === OutputFormatEnum.TABLE) {
        log("rendering table")
        const tableObj = tableDataObj as TableDataType;
        const fields = tableObj.schema.fields;
        const columnsComponent = (
            <tr key={"table-header"}>
                { fields.map(field => <th key={field.name}>{field.name}</th>) }
            </tr>
        );

        const dataComponents = tableObj.data.map((rowData, rowNum) =>
            <tr key={rowNum}>
                { rowData.map((cellData, colNum) => <td key={colNum}>{cellData}</td>) }
            </tr>
        );
        
        return (
            <table>
                <thead>{columnsComponent}</thead>
                <tbody>{dataComponents}</tbody>
            </table>
        );
    }
    else {
        console.error(`Unexpected output format: ${OutputFormatEnum[outputFormat]}`)
        return (<></>);
    }
}

interface ResultTableProps {
    tableDataObj: TableDataType | string | null;
    outputFormat: OutputFormatEnum;
    paginationContainer: React.ReactNode;
    tableContentStyle?: React.CSSProperties;
}

export default function ResultTable({ tableDataObj, outputFormat, paginationContainer, tableContentStyle }: ResultTableProps) {
    if (tableDataObj === null || outputFormat === OutputFormatEnum.UNSET) {
        log("no table data to render");
        return (<></>);
    }
    
    return (
    <>
        <div className="table-content" style={tableContentStyle}>
            <ResultTableContent 
                tableDataObj={tableDataObj} 
                outputFormat={outputFormat} 
            />
        </div>
        {paginationContainer}
    </>
    )
}