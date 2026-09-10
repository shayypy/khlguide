import type { KHLTVListResponse } from "./types";

export type Language = "ru" | "en" | "cn";

const cookieJar = new Map<string, string>();

const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:155.0) Gecko/20100101 Firefox/155.0";

const langToDomain = (lang: Language) =>
  ({
    ru: "www.khl.ru",
    en: "en.khl.ru",
    cn: "cn.khl.ru",
  })[lang];

const MAX_REDIRECTS = 10;

const redirectFix = async (
  url: string,
  init: RequestInit,
  redirectCount = 0,
) => {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error(`Too many redirects while fetching ${url}`);
  }

  init.redirect = "manual";
  const headers = new Headers();
  if (init.headers instanceof Headers) {
    for (const [name, value] of init.headers) headers.set(name, value);
  } else if (init.headers) {
    for (const [name, value] of Object.entries(init.headers)) {
      headers.set(name, value);
    }
  }
  if (cookieJar.size > 0) {
    const cookieHeader = [...cookieJar]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
    headers.set("Cookie", cookieHeader);
  }
  init.headers = headers;

  const res = await fetch(url, init);
  for (const cookie of res.headers.getSetCookie()) {
    const pair = cookie.split(";")[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq > 0) {
      cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
      console.log(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }
  if (res.status === 307) {
    const loc = res.headers.get("location");
    console.log("Following redirect to", loc);
    return await redirectFix(loc ?? url, init, redirectCount + 1);
  }
  return res;
};

export const getCsrfToken = async (
  lang: Language,
  signal?: AbortSignal,
): Promise<string | null> => {
  const url = `https://${langToDomain(lang)}/tv/`;
  const res = await redirectFix(url, {
    method: "GET",
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": `${lang};q=0.9`,
      "Access-Control-Allow-Origin": "*",
    },
    referrer: new URL(url).origin,
    signal,
  });
  if (!res.ok) return null;

  const html = await res.text();
  const match = html.match(/RestConnectorAuthenticator\(\s*['"`](\w+)/m);
  if (match?.[1]) {
    return match[1];
  }
  return null;
};

export const getTvList = async (
  lang: Language,
  csrf: string,
  signal?: AbortSignal,
) => {
  const url = `https://${langToDomain(lang)}/rest/tv/list/`;
  const res = await redirectFix(url, {
    method: "POST",
    headers: {
      "User-Agent": userAgent,
      Accept: "*/*",
      "Accept-Language": `${lang};q=0.9`,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
    },
    body: new URLSearchParams({ sessid: csrf }),
    referrer: new URL(url).origin,
    signal,
  });
  if (!res.ok) return null;
  return (await res.json()) as KHLTVListResponse;
};
