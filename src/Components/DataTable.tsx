import React from "react";
import "./DataTable.css";

interface Props {
  data: any[];
}

const DataTable = (props: Props) => {
  if (props.data.length === 0) {
    return null;
  }
  const columns = Object.keys(props.data[0]);

  return (
    <table className="datatable_table">
      <thead className="datatable_th">
        <tr>
          {columns.map((item, idx) => {
            return <th key={item + idx}>{item}</th>;
          })}
        </tr>
      </thead>
      <tbody>
        {props.data.map((item, index) => {
          return (
            <tr key={item + index}>
              {columns.map((col, idx) => {
                return (
                  <td className="datatable_td" key={col + idx}>
                    {item[col]}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default DataTable;
