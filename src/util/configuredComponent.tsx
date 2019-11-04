import React from "react";
import { RemoteConfig, DEFAULT_REMOTE_CONFIG } from "../sharedtypes";
import { subscribeToConfigs } from "../store/remoteconfig";

interface ConfiguredComponentState {
  config?: RemoteConfig;
}

export function configuredComponent<Props, RemoteProps>(
  Component: React.ComponentType<Props & RemoteProps>,
  getProps: (config: RemoteConfig, props: Props) => RemoteProps
): React.ComponentType<Props> {
  return class extends React.Component<Props, ConfiguredComponentState> {
    state: ConfiguredComponentState = {};

    private unsubscribe?: () => void;

    componentDidMount() {
      this.unsubscribe = subscribeToConfigs(config => {
        this.setState({ config });
      });
    }

    componentWillUnmount() {
      this.unsubscribe && this.unsubscribe();
    }

    render() {
      const configProps = getProps(
        this.state.config || DEFAULT_REMOTE_CONFIG,
        this.props
      );
      return <Component {...this.props} {...configProps} />;
    }
  };
}
