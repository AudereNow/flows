import React from "react";
import "./ImageRow.css";

interface Props {
  imageURLs: string[];
}

const ImageRow = (props: Props) => {
  return (
    <div className="imagerow_container">
      {props.imageURLs.map((url, index) => {
        return <img className="imagerow_image" key={url + index} src={url} />;
      })}
    </div>
  );
};

export default ImageRow;
