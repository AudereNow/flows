import React from "react";
import HighlightText from "./HighlightText";
import "./ImageRow.css";
import ZoomableImage from "./ZoomableImage";

interface Props {
  images: Array<string | ImageData>;
  searchTermGlobal?: string;
}

interface ImageData {
  url: string;
  label?: string;
}

const ImageRow = (props: Props) => {
  return (
    <div className="imagerow_container">
      {props.images.length > 0 &&
        props.images.map((data: string | ImageData, index: number) => {
          const isImgString = typeof data === "string";
          const url = isImgString ? (data as string) : (data as ImageData).url;
          const label = !isImgString ? (data as ImageData).label : undefined;
          return (
            <div key={url + index} className="imagerow_item">
              <ZoomableImage src={url} alt={url} />
              {!!label && (
                <HighlightText
                  className="imagerow_label"
                  text={label}
                  searchTerm={props.searchTermGlobal}
                />
              )}
            </div>
          );
        })}
    </div>
  );
};

export default ImageRow;
