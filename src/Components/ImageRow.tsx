import React from "react";
import ZoomableImage from "./ZoomableImage";
import "./ImageRow.css";

interface Props {
  images: Array<string | ImageData>;
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
            <div className="imagerow_item">
              <ZoomableImage key={url + index} src={url} alt={url} />
              {!!label && <span className="imagerow_label">{label}</span>}
            </div>
          );
        })}
    </div>
  );
};

export default ImageRow;
