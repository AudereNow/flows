import React from "react";
import firebase from "firebase/app";
import "firebase/auth";
import StyledFirebaseAuth from "react-firebaseui/StyledFirebaseAuth";

const SIGNIN_CONFIG = {
  signInSuccessUrl: "/",
  signInOptions: [
    firebase.auth.EmailAuthProvider.PROVIDER_ID,
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
  ],
};

class LoginScreen extends React.PureComponent {
  render() {
    return (
      <StyledFirebaseAuth
        uiConfig={SIGNIN_CONFIG}
        firebaseAuth={firebase.auth()}
      />
    );
  }
}

export default LoginScreen;
