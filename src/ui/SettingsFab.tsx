import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  LOCALE_LABEL,
  LOCALES,
  pathForLocale,
  useLocale,
  type Locale,
} from "../i18n";

type ThemeMode = "niebla" | "oscuro";

const THEME_STORAGE_KEY = "cube-solver-theme";

function readStoredTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "niebla") return "niebla";
    if (value === "oscuro") return "oscuro";
  } catch {
    /* ignore */
  }
  return "oscuro";
}

/**
 * Fixed gear button in the bottom-right corner. Clicking it expands a panel
 * upward with the language switch and light/dark theme toggle, then
 * collapses back down to just the icon.
 */
export function SettingsFab() {
  const { locale, t } = useLocale();
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme());
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const isDark = theme === "oscuro";

  return (
    <div className="settings-fab" ref={rootRef}>
      {open && (
        <div className="settings-fab__panel" role="menu">
          <nav className="lang-switch" aria-label={t("lang.label")}>
            <div
              className={`lang-switch__thumb${
                LOCALES.indexOf(locale) > 0
                  ? ` lang-switch__thumb--pos-${LOCALES.indexOf(locale)}`
                  : ""
              }`}
              aria-hidden
            />
            {LOCALES.map((code) => (
              <LangLink key={code} code={code} active={code === locale} />
            ))}
          </nav>

          <div className="theme-switch" role="group" aria-label={t("theme.label")}>
            <div
              className={`theme-switch__thumb${isDark ? " theme-switch__thumb--pos-1" : ""}`}
              aria-hidden
            />
            <button
              type="button"
              className={`theme-switch__option${!isDark ? " theme-switch__option--active" : ""}`}
              aria-pressed={!isDark}
              title={t("theme.light")}
              onClick={() => setTheme("niebla")}
            >
              <i className="ri-sun-line" aria-hidden />
            </button>
            <button
              type="button"
              className={`theme-switch__option${isDark ? " theme-switch__option--active" : ""}`}
              aria-pressed={isDark}
              title={t("theme.dark")}
              onClick={() => setTheme("oscuro")}
            >
              <i className="ri-moon-line" aria-hidden />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`settings-fab__toggle${open ? " settings-fab__toggle--open" : ""}`}
        aria-label={t("settings.label")}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <i className="ri-settings-3-line" aria-hidden />
      </button>
    </div>
  );
}

function LangLink({ code, active }: { code: Locale; active: boolean }) {
  return (
    <Link
      to={pathForLocale(code)}
      className={`lang-switch__link${active ? " lang-switch__link--active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {LOCALE_LABEL[code]}
    </Link>
  );
}
