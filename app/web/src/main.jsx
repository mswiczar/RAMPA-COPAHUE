import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { LiveProvider } from "./live.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LiveProvider>
      <App />
    </LiveProvider>
  </React.StrictMode>
);
