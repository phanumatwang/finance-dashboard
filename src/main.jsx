import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { LoadingProvider } from "./components/LoadingContext";

// ✅ สมัคร Service Worker (ที่ปลั๊กอินสร้างให้)
import { registerSW } from "virtual:pwa-register";
registerSW({
  immediate: true,
  onNeedRefresh() { window.location.reload(); },
  onOfflineReady() { /* แจ้งผู้ใช้ได้ว่าใช้งานออฟไลน์พร้อมแล้ว */ },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <LoadingProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </LoadingProvider>
);
