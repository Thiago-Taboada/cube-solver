import { useLocale } from "../i18n";

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
