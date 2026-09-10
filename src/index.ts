import { writeXmltv } from "@iptv/xmltv";
import { type IRequest, Router } from "itty-router";
import { generateXmltv } from "../util";
import { getCsrfToken, getTvList, type Language } from "./scrape";
import type { KHLTVListSuccessResponse } from "./types";

const router = Router();

const withLanguage = (req: IRequest) => {
  const lang = (req.params.lang ?? "ru") as Language;
  if (!["ru", "en", "cn"].includes(lang)) {
    return Response.json(
      { message: "Unsupported language code" },
      { status: 400 },
    );
  }
  req.language = lang;
};

const withCache = async (req: IRequest) => {
  const url = new URL(req.url);
  const cacheUrl = `http://localhost${url.pathname}`;

  const cacheKey = new Request(cacheUrl, req);
  const cache = caches.default;
  const response = await cache.match(cacheKey);
  if (response) return response;
  req.cacheProps = { cacheKey, cache };
};

const getTvListOrResponse = async (
  lang: Language,
  signal?: AbortSignal,
): Promise<Response | KHLTVListSuccessResponse> => {
  try {
    const csrf = await getCsrfToken(lang, signal);
    if (!csrf) {
      return Response.json(
        { message: "Failed to find csrf token" },
        { status: 500 },
      );
    }
    const data = await getTvList(lang, csrf, signal);
    if (data === null) {
      return Response.json(
        { message: "Failed to get guide data" },
        { status: 500 },
      );
    } else if (data.status !== "success") {
      return Response.json(data, { status: 500 });
    }
    return data;
  } catch (e) {
    console.error(e);
    return Response.json(
      { message: `Failed to complete the request: ${e}` },
      { status: 500 },
    );
  }
};

router.get("/", (req) => {
  const { origin } = new URL(req.url);
  return new Response(
    [
      `Raw data: ${origin}/en/list.json`,
      `XMLTV guide: ${origin}/en/guide.xml`,
      "",
      "en, ru, cn are acceptable language codes. The raw data is cached for 30 minutes (so live data like diffs and time remaining will usually be inaccurate). You should not need to request more than once daily. The endpoints return 7 days worth of data from the present moment in Moscow time.",
    ].join("\n"),
    {
      headers: { "Content-Type": "text/plain" },
    },
  );
});

router.get("/:lang/list.json", withLanguage, withCache, async (req) => {
  const lang = req.language;

  const result = await getTvListOrResponse(lang, req.signal);
  const { cache, cacheKey } = req.cacheProps as {
    cache: Cache;
    cacheKey: Request;
  };

  if (result instanceof Response) {
    if (result.status >= 500) {
      // shorter cache period for errors, but avoids spamming the endpoint
      result.headers.append("Cache-Control", "s-maxage=30");
      await cache.put(cacheKey, result.clone());
    }
    return result;
  }

  const res = Response.json(result, { status: 200 });
  res.headers.append("Cache-Control", "s-maxage=3600");
  await cache.put(cacheKey, res.clone());
  return res;
});

router.get("/:lang/guide.xml", withLanguage, withCache, async (req) => {
  const lang = req.language;

  const { cache, cacheKey } = req.cacheProps as {
    cache: Cache;
    cacheKey: Request;
  };
  // not sure if this will work since it fabricates the url but uses the same init
  const plainCacheKey = new Request(`http://localhost/${lang}`, req);
  const cachedPlainResponse = await cache.match(plainCacheKey);

  let data: KHLTVListSuccessResponse;
  if (cachedPlainResponse) {
    if (!cachedPlainResponse.ok) return cachedPlainResponse;

    data = (await cachedPlainResponse.json()) as KHLTVListSuccessResponse;
  } else {
    const result = await getTvListOrResponse(lang, req.signal);
    if (result instanceof Response) {
      if (result.status >= 500) {
        // shorter cache period for errors, but avoids spamming the endpoint
        result.headers.append("Cache-Control", "s-maxage=30");
        await cache.put(plainCacheKey, result.clone());
      }
      return result;
    }
    data = result;
  }

  const xmltv = generateXmltv(data, lang);
  const res = new Response(writeXmltv(xmltv), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=120",
    },
  });
  await cache.put(cacheKey, res.clone());
  return res;
});

export default {
  fetch: router.fetch,
} satisfies ExportedHandler;
