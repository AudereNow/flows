import React, { Component } from "react";
import posed from "react-pose";
import "./ZoomableImage.css";

const transition = {
  duration: 400,
  ease: [0.08, 0.69, 0.2, 0.99],
};

const Image = posed.img({
  zoomedIn: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    transition,
    flip: true,
    zIndex: 1,
  },
  zoomedOut: {
    position: "static",
    width: "auto",
    height: "auto",
    transition,
    flip: true,
    zIndex: 0,
  },
});

const Frame = posed.div({
  zoomedIn: {
    applyAtStart: { display: "block" },
    opacity: 0.7,
    zIndex: 1,
  },
  zoomedOut: {
    applyAtEnd: { display: "none" },
    opacity: 0,
    zIndex: 0,
  },
});

interface Props {
  width?: string | number;
  height?: string | number;
  [key: string]: any;
}

interface State {
  isZoomed: boolean;
}

class ZoomableImage extends Component<Props> {
  state: State = { isZoomed: false };

  _onClick = () => {
    if (!this.state.isZoomed) {
      window.addEventListener("scroll", this._onClick);
    } else {
      window.removeEventListener("scroll", this._onClick);
    }
    this.setState({ isZoomed: !this.state.isZoomed });
  };

  render() {
    const { width, height, ...props } = this.props;
    const { isZoomed } = this.state;
    const pose = isZoomed ? "zoomedIn" : "zoomedOut";
    return (
      <div style={{ width, height }} onClick={this._onClick}>
        <Frame pose={pose} className="zoomableimage_frame" />
        <Image
          pose={pose}
          className="zoomableimage_image"
          style={{ cursor: isZoomed ? "zoom-out" : "zoom-in" }}
          {...props}
        />
      </div>
    );
  }
}

export default ZoomableImage;
