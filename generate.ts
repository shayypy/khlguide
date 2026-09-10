import { mkdir } from "node:fs/promises";
import { writeXmltv } from "@iptv/xmltv";
import { getCsrfToken, getTvList, type Language } from "./src/scrape";
import type { KHLTVListSuccessResponse } from "./src/types";
import { generateXmltv } from "./util";

await mkdir("./public", { recursive: true });

const writeListData = async (
  lang: Language,
  data: KHLTVListSuccessResponse,
) => {
  await Bun.write(`./public/${lang}.json`, JSON.stringify(data));
  console.log(`Wrote public/${lang}.json`);
};

const writeGuideData = async (
  lang: Language,
  data: KHLTVListSuccessResponse,
) => {
  const xmltv = generateXmltv(data, lang);
  await Bun.write(`./public/${lang}.xml`, writeXmltv(xmltv));
  console.log(`Wrote public/${lang}.xml`);
};

for (const lang of ["en", "ru", "cn"] as const) {
  try {
    const csrf = await getCsrfToken(lang);
    if (!csrf) {
      throw Error("Failed to find csrf token");
    }
    const data = await getTvList(lang, csrf);
    if (data === null) {
      throw Error("Failed to get guide data");
    } else if (data.status !== "success") {
      console.error(data);
      throw Error(data.errors[0]?.message);
    }
    await writeListData(lang, data);
    await writeGuideData(lang, data);
  } catch (e) {
    console.error(e);
    throw Error(`Failed to complete the request: ${e}`);
  }
}
