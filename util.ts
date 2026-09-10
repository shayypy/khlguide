import type { Xmltv, XmltvProgramme } from "@iptv/xmltv";
import type { Language } from "./src/scrape";
import type { KHLTVListSuccessResponse } from "./src/types";

// This is kind of silly because the Date just gets transformed back into
// the same format for the XML, except in GMT+0
const parseUnroundedTimestamp = (stamp: string, isStop = false): Date => {
  const year = stamp.slice(0, 4);
  const month = stamp.slice(4, 6);
  const day = stamp.slice(6, 8);
  const hour = stamp.slice(8, 10);
  const minute = stamp.slice(10, 12);
  const second = stamp.slice(12, 14);
  const tz = stamp.split(" ")[1];

  const date = new Date(
    `${year}-${month}-${day} ${hour}:${minute}:${second} GMT${tz}`,
  );
  if (isStop) {
    // Match next start time so there's no gap
    date.setMinutes(date.getUTCMinutes() + 1, 0, 0);
  }
  return date;
};

export const generateXmltv = (
  data: KHLTVListSuccessResponse,
  lang: Language,
): Xmltv => {
  const sdID = "KHL.ru@SD";
  const hdID = "KHLPrime.ru@HD";
  const xmltv: Xmltv = {
    channels: [
      {
        id: sdID,
        icon: [
          {
            // light, square, not imgur
            src: "https://epg.iptvx.one/picons/kxl.png",
            width: 200,
            height: 200,
          },
          {
            // dark
            src: "https://i.imgur.com/RgdHdOV.png",
            width: 512,
            height: 412,
          },
          {
            // svg
            src: "https://upload.wikimedia.org/wikipedia/en/a/a9/KHL_logo_shield_2016.svg",
          },
        ],
        displayName: [
          lang === "ru"
            ? { _value: "КХЛ", lang: "ru" }
            : { _value: "KHL", lang: "en" },
        ],
      },
      {
        id: hdID,
        icon: [
          {
            // light, square, not imgur
            src: "https://epg.iptvx.one/picons/kxl-hd.png",
            width: 200,
            height: 200,
          },
          {
            // dark
            src: "https://i.imgur.com/pwxT0ON.png",
            width: 512,
            height: 413,
          },
          {
            // svg
            src: "https://upload.wikimedia.org/wikipedia/en/a/a9/KHL_logo_shield_2016.svg",
          },
        ],
        displayName: [
          { _value: "KHL Prime", lang: "en" },
          // they seem to use the latin letters for this for some reason
          { _value: "KHL Prime", lang: "ru" },
        ],
      },
    ],
    programmes: [],
  };

  for (const [channelKey, chanData] of Object.entries(
    data.data?.LIST?.PROGRAMS ?? {},
  )) {
    const channel = channelKey === "HD" ? hdID : sdID;
    for (const { list } of Object.values(chanData)) {
      for (const item of list) {
        const programme: XmltvProgramme = {
          channel,
          title: [{ _value: item.fields.title, lang: "ru" }],
          start: parseUnroundedTimestamp(
            item.attributes.start_unrounded ?? item.attributes.start,
          ),
          stop: parseUnroundedTimestamp(
            item.attributes.stop_unrounded ?? item.attributes.stop,
            true,
          ),
        };
        if (item.fields["sub-title"]) {
          programme.subTitle = [
            { _value: item.fields["sub-title"], lang: "ru" },
          ];
        }
        if (item.fields.categories) {
          programme.category = item.fields.categories.map((c) => ({
            _value: c,
            lang: "ru",
          }));
        }
        if (item.fields.pg) {
          programme.rating = [{ system: "Russia", value: item.fields.pg }];
        }
        if (item.fields.game && !Array.isArray(item.fields.game)) {
          programme.title = [
            lang === "ru"
              ? { _value: "Чемпионат КХЛ", lang: "ru" }
              : { _value: "KHL Hockey", lang: "en" },
          ];
          const { game } = item.fields;
          programme.subTitle = [
            lang === "ru"
              ? {
                  _value: `"${game.homeName}" - "${game.visitorName}", ${game.visibleDateFull2}`,
                  lang: "ru",
                }
              : {
                  _value: `${game.homeName_en} vs. ${game.visitorName_en} - ${new Date(
                    game.date,
                  ).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}`,
                  lang: "en",
                },
          ];
          programme.episodeNum = [
            {
              system: "onscreen",
              _value: `S${game.date.split("-")[0]}E${game.number}`,
            },
          ];
          programme.image = [
            {
              // 1: image number, 999: max height
              _value: `https://img.khl.ru/arenas/${game.arenaid}/1/999.jpg`,
              type: "backdrop",
              orient: "L",
              size: 3,
            },
          ];
          programme.icon = [
            { src: `https:${game.teams.teama.logo}`, width: 200, height: 200 },
            { src: `https:${game.teams.teamb.logo}`, width: 200, height: 200 },
          ];
        } else if (item.fields.game) {
          // non-khl game, clean up title for DVRs
          const cleaned = item.fields.title.split(".")[0];
          if (cleaned) {
            programme.title = [{ _value: cleaned, lang: "ru" }];
          }
        } else {
          const seriyaMatch = (item.fields["sub-title"] ?? "").match(
            /Серия (\d+)$/i,
          );
          if (seriyaMatch) {
            programme.episodeNum = [
              {
                _value: `E${seriyaMatch[1]}`,
                system: "onscreen",
              },
            ];
          }
        }

        xmltv.programmes?.push(programme);
      }
    }
  }

  return xmltv;
};
