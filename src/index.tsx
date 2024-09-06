import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "@emotion/react";
import theme from "./styles/theme";
import { Provider } from "react-redux";
import { store, persistor } from "./reduxStore";
import { PersistGate } from "redux-persist/integration/react";
import dotenv from 'dotenv';

dotenv.config();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Make sure the 'root' div is present in the index.html.");
}

const root = ReactDOM.createRoot(rootElement);

if (typeof window !== "undefined") {
  const resizeObserverErrMsg = "ResizeObserver loop completed with undelivered notifications.";

  window.addEventListener("error", (e) => {
    if (e.message === resizeObserverErrMsg) {
      e.stopImmediatePropagation();
    }
  });

  window.addEventListener("unhandledrejection", (e) => {
    if (e.reason && e.reason.message === resizeObserverErrMsg) {
      e.stopImmediatePropagation();
    }
  });
}


root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>
    </ThemeProvider>
  </React.StrictMode>
);
