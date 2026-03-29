import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import { AppAuthProvider } from "@/features/auth/app-auth";
import "@/styles/app.css";

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <AppAuthProvider>
      <App />
    </AppAuthProvider>
  </React.StrictMode>,
);
