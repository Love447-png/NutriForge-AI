import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./i18n";
import { LocalAuthProvider } from "./hooks/useLocalAuth";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LocalAuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LocalAuthProvider>
  </React.StrictMode>,
);
