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
        if (
          // .game should only be populated for new games, not re-airs
          item.fields.game ||
          // live broadcast
          item.fields.title.endsWith("Прямая трансляция")
        ) {
          programme.new = true;
        }
        if (item.fields.game && !Array.isArray(item.fields.game)) {
          programme.title = [
            lang === "ru"
              ? { _value: "Чемпионат КХЛ", lang: "ru" }
              : { _value: "KHL Hockey", lang: "en" },
          ];
          const { game } = item.fields;
          const gameDate = new Date(game.full_date * 1000);
          programme.subTitle = [
            lang === "ru"
              ? {
                  _value: `"${game.homeName}" - "${game.visitorName}", ${game.visibleDateFull2}`,
                  lang: "ru",
                }
              : {
                  _value: `${game.homeName_en} vs. ${game.visitorName_en} - ${gameDate.toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" },
                  )}`,
                  lang: "en",
                },
          ];
          // For DVR filtering
          programme.desc = [
            lang === "ru"
              ? {
                  _value: `"${game.homeName}" - "${game.visitorName}". ${game.arena} в ${game.arena_city}`,
                  lang: "ru",
                }
              : {
                  _value: `${game.homeName_en} vs. ${game.visitorName_en}, playing at ${game.arena_en} in ${game.arena_city_en}. (${game.homeName} - ${game.visitorName})`,
                  lang: "en",
                },
          ];

          programme.date = gameDate;
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
        } else if (
          item.fields.game ||
          item.fields.title.includes("МХЛ") ||
          item.fields.title.includes("КХЛ")
        ) {
          // Try to clean up for DVRs - not a KHL game (.game == []) or it's a re-air (no .game attr)
          if (
            item.fields.title.includes("Чемпионат МХЛ.") ||
            item.fields.title.includes("Чемпионат КХЛ.")
          ) {
            const split = item.fields.title.split(".");
            if (split[0]?.endsWith("КХЛ")) {
              programme.title = [
                lang === "ru"
                  ? { _value: "Чемпионат КХЛ", lang: "ru" }
                  : { _value: "KHL Hockey", lang: "en" },
              ];
              programme.icon = [
                {
                  src: "https://upload.wikimedia.org/wikipedia/en/a/a9/KHL_logo_shield_2016.svg",
                },
              ];
            } else if (split[0]?.endsWith("МХЛ")) {
              programme.title = [
                lang === "ru"
                  ? { _value: "Чемпионат МХЛ", lang: "ru" }
                  : { _value: "MHL Hockey", lang: "en" },
              ];
              programme.icon = [
                {
                  src: "https://mhl.khl.ru/local/templates/mhl2016/i/2020/mhl_logo_ru.svg",
                },
              ];
            }

            const matchup = split[1];
            if (matchup) {
              programme.desc = [{ _value: `${matchup}`, lang: "ru" }];
            }
          } else {
            const cleaned = item.fields.title.split(".")[0];
            if (cleaned) {
              programme.title = [{ _value: cleaned, lang: "ru" }];
            }
          }
        } else {
          // populate episode field
          const subTitle = item.fields["sub-title"];
          const SERIYA_RE = /Серия (\d+)$/i;
          const VIPUSK_RE = /(\d+) выпуск/i;

          const matchOn = subTitle || item.fields.title;
          const episodeMatch =
            matchOn.match(SERIYA_RE) ?? matchOn.match(VIPUSK_RE);
          if (episodeMatch?.[1]) {
            programme.episodeNum = [
              {
                _value: `E${episodeMatch[1]}`,
                system: "onscreen",
              },
            ];
          }

          // stock translations for some common shows for easier english
          // browsing. some of these don't work, not sure why
          if (lang === "en") {
            const parts = item.fields.title.split(".").map((p) => p.trim());
            const defaultSubTitle = parts.slice(1).join(". ") || undefined;

            const setTitle = (newTitle: string, subTitle = defaultSubTitle) => {
              programme.title = [
                { _value: newTitle, lang: "en" },
                ...programme.title,
              ];
              if (subTitle && subTitle !== "Прямой эфир") {
                programme.subTitle = [
                  { _value: subTitle, lang: "en" },
                  ...(programme.subTitle ?? []),
                ];
              }
              if (!programme.subTitle) {
                programme.subTitle = programme.title.slice(1);
              }
            };

            switch (parts[0]?.replace(/^"|"$/g, "").trim()) {
              case "Доброе утро":
                setTitle("Good Morning");
                break;
              case "Подробно":
                setTitle("Details");
                break;
              case "Видео дня":
                setTitle("Video of the Day");
                break;
              case "Неделя КХЛ":
                setTitle("KHL Week");
                break;
              case "Трансферы":
                setTitle("Trades");
                break;
              case "На связи":
                setTitle("On the Line");
                break;
              case "Всё, кроме хоккея":
                setTitle("Everything Except Hockey");
                break;
              case "Вратарская бригада":
                setTitle("The Goalie Crew");
                break;
              case "Кубок Мэра Москвы":
                setTitle("Moscow Mayor's Cup");
                break;
              case "Каникулы с Богданом Киселевичем":
                setTitle("Vacation with Bogdan Kiselevich");
                break;
              case "Студия Live":
                setTitle("Live Studio");
                break;
              default:
                break;
            }
          }
        }
        if (programme.date === undefined) {
          try {
            programme.date = parseUnroundedTimestamp(
              `${item.fields.date}000000 +300`,
            );
          } catch {}
        }

        xmltv.programmes?.push(programme);
      }
    }
  }

  return xmltv;
};
