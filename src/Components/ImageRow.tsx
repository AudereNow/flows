import React from "react";
import { Filters } from "../Screens/TaskPanel";
import "./ImageRow.css";
import TextItem, { TextData } from "./TextItem";
import ZoomableImage from "./ZoomableImage";

interface Props {
  images: Array<string | ImageData>;
  searchTermGlobal?: string;
  filters: Filters;
}

interface ImageData {
  url: string;
  label: TextData;
}

const ImageRow = (props: Props) => {
  return (
    <div className="imagerow_container">
      {props.images.length > 0 &&
        props.images.map((data: string | ImageData, index: number) => {
          const isImgString = typeof data === "string";
          const url = isImgString ? (data as string) : (data as ImageData).url;
          return (
            <div key={url + index} className="imagerow_item">
              <ZoomableImage src={url} alt={url} />
              {!isImgString && (
                <TextItem
                  className="imagerow_label"
                  data={(data as ImageData).label}
                  filters={props.filters}
                  searchTermGlobal={props.searchTermGlobal}
                  valueOnly={true}
                />
              )}
            </div>
          );
        })}
    </div>
  );
};

export default ImageRow;
