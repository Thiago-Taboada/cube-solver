import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { App } from "./App";
import { LocaleProvider, type Locale } from "./i18n";

function LocalizedApp({ locale }: { locale: Locale }) {
  return (
    <LocaleProvider locale={locale}>
      <App />
    </LocaleProvider>
  );
}

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <Routes>
        <Route path="/" element={<LocalizedApp locale="en" />} />
        <Route path="/es" element={<LocalizedApp locale="es" />} />
        <Route path="/pt" element={<LocalizedApp locale="pt" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
