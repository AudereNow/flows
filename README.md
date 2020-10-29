# flows
Workflows web app and services

# Run locally against Maisha staging
The Maisha staging API server is the default backend, but CORS restrictions block the client code from accessing responses when you run the app locally. I use this browser extension to disable those restrictions during development: https://chrome.google.com/webstore/detail/cross-domain-cors/mjhpgnbimicffchbodmgfnemoghjakai. Since CORS restrictions are generally a good thing, and this extension can break some sites, I install that extension in a dedicated chrome profile that I only use for flows development.

## Requirements
* `node 10.16.0`
* `yarn 1.22.5`

## Steps to run locally
From the top-level `flows` directory:
* `yarn` to install dependencies
* `yarn start` to start a dev server on port 3000
* Open a browser to `http://localhost:3000`
