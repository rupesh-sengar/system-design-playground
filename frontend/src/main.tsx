import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "@/App";
import { store } from "@/app/store";
import { AppAuthProvider } from "@/features/auth/app-auth";
import { ToastProvider } from "@/shared/toast/toast-provider";
import "@/styles/app.css";

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <ToastProvider>
        <AppAuthProvider>
          <App />
        </AppAuthProvider>
      </ToastProvider>
    </Provider>
  </React.StrictMode>,
);
