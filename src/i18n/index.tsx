import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { en, type EnMessages, type MessageKey } from "./messages/en";
import { es } from "./messages/es";
import { pt } from "./messages/pt";
import type { Locale } from "./types";

const CATALOG: Record<Locale, EnMessages> = { en, es, pt };

type Vars = Record<string, string | number>;

type TranslateFn = (key: MessageKey, vars?: Vars) => string;

interface LocaleContextValue {
  locale: Locale;
  t: TranslateFn;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(vars[name] ?? `{${name}}`),
  );
}

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const t = useCallback<TranslateFn>(
    (key, vars) => format(CATALOG[locale][key] ?? en[key] ?? String(key), vars),
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({ locale, t }), [locale, t]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function useT(): TranslateFn {
  return useLocale().t;
}

export {
  LOCALE_LABEL,
  LOCALE_PATH,
  LOCALES,
  localeFromPath,
  pathForLocale,
  type Locale,
} from "./types";
export { formatDiagnostic } from "./formatDiagnostic";
