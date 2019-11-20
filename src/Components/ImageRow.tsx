import React from "react";
import "./ImageRow.css";
import TextItem, { TextData } from "./TextItem";
import ZoomableImage from "./ZoomableImage";

interface Props {
  images: Array<string | ImageData>;
  showImages: boolean;
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
          const imageLabelSearchKey = !!(data as ImageData).label.searchKey
            ? (data as ImageData).label.searchKey + ":"
            : "";
          return props.showImages || props.showImages === undefined ? (
            <div key={url + index} className="imagerow_item">
              <ZoomableImage src={url} alt={url} />
              {!isImgString && (
                <TextItem
                  className="imagerow_label"
                  data={(data as ImageData).label}
                  valueOnly={true}
                />
              )}
            </div>
          ) : (
            <div key={url + index}>
              <span>{`${imageLabelSearchKey} ${
                (data as ImageData).label.value
              }`}</span>
            </div>
          );
        })}
    </div>
  );
};

export default ImageRow;
