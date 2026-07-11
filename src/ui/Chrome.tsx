import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LOCALE_LABEL,
  LOCALES,
  pathForLocale,
  useLocale,
  type Locale,
} from "../i18n";

type ThemeMode = "niebla" | "oscuro";

const STORAGE_KEY = "cube-solver-theme";

function readStoredTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "niebla") return "niebla";
    if (value === "oscuro") return "oscuro";
  } catch {
    /* ignore */
  }
  return "oscuro";
}

export function Header() {
  const { locale, t } = useLocale();
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const isDark = theme === "oscuro";

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="brand">
          <div className="brand__mark" aria-hidden>
            <i className="ri-stack-line" />
          </div>
          <div>
            <p className="brand__title">{t("brand.title")}</p>
            <p className="brand__sub">{t("brand.sub")}</p>
          </div>
        </div>

        <div className="header-actions">
          <nav className="lang-switch" aria-label={t("lang.label")}>
            {LOCALES.map((code) => (
              <LangLink key={code} code={code} active={code === locale} />
            ))}
          </nav>

          <button
            type="button"
            className="theme-toggle"
            aria-label={isDark ? t("theme.toLight") : t("theme.toDark")}
            title={isDark ? t("theme.light") : t("theme.dark")}
            onClick={() => setTheme(isDark ? "niebla" : "oscuro")}
          >
            <i className={isDark ? "ri-sun-line" : "ri-moon-line"} aria-hidden />
          </button>
        </div>
      </div>
    </header>
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

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>
          © 2026{" "}
          <a
            href="https://github.com/Thiago-Taboada"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dolphanana
          </a>
          . {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
