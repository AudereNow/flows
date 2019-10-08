import React from "react";
import ZoomableImage from "./ZoomableImage";
import "./ImageRow.css";

interface Props {
  imageURLs: string[];
}

const ImageRow = (props: Props) => {
  return (
    <div className="imagerow_container">
      {props.imageURLs.length > 0 &&
        props.imageURLs.map((url, index) => {
          return (
            <ZoomableImage
              width="20%"
              height="20%"
              key={url + index}
              src={url}
              alt={url}
            />
          );
        })}
    </div>
  );
};

export default ImageRow;
