export interface KHLTVFace {
  ID: number;
  NAME: string;
  NAME_EXP: string[];
  TG: string | false;
  VK: string | false;
  POSITION: string;
  MAIN_PHOTO: string;
  LINK: string;
}

export interface KHLTVListItemGame {
  tnId: number;
  id: number;
  round: string;
  roundname: string;
  roundname_en: string;
  date: string;
  dayofweek: string;
  time: string;
  changes: string;
  number: string;
  teama: number;
  homeId: number;
  homeName: string;
  /** abbreviation */
  homeName_l3: string;
  homeName_en: string;
  /** abbreviation */
  homeName_l3_en: string;
  homeCity: string;
  homeCity_en: string;
  teamb: number;
  visitorId: number;
  visitorName: string;
  visitorName_l3: string;
  visitorName_en: string;
  visitorName_l3_en: string;
  visitorCity: string;
  visitorCity_en: string;
  arenaid: number;
  arena: string;
  arena_en: string;
  arena_city: string;
  arena_city_en: string;
  /** unknown, empty string */
  temp: string;
  score?: string;
  ots?: string;
  scP1?: string;
  scP2?: string;
  scP3?: string;
  scP4?: string;
  /** int as string */
  attendance?: string;
  approved?: number;
  /** timestamp in seconds */
  full_date: number;
  /** formatted time @example 17:00 */
  time_format: string;
  visibleDate: string;
  visibleDateFull: string;
  visibleDateFull2: string;
  visibleDateDay: string;
  formatDateDay: string;
  dateType: "" | "today" | "future";
  /**
   * @example "yes"
   * @example ""
   */
  protoReady?: string;
  homeScore?: string;
  visitorScore?: string;
  winner?: "A" | "B";
  links: {
    preview: string;
    stat: string;
    text: string;
    ics: string;
    resume?: string;
    protocol?: string;
  };
  teams: {
    /** home */
    teama: {
      link: string;
      /** URL without protocol @example "//img.khl.ru/..." */
      logo: string;
    };
    /** away */
    teamb: {
      link: string;
      /** URL without protocol @example "//img.khl.ru/..." */
      logo: string;
    };
  };
}

export interface KHLTVListItemDiffs {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface KHLTVListItem {
  fields: {
    title: string;
    categories: string[];
    /** could be empty */
    "sub-title": string;
    /** YYYYMMDD */
    date: string;
    /** TV content rating @example "12+" */
    pg: string;
    /** If this programme represents a KHL game, info about it is here. May also be an empty array for a non-KHL game */
    game?: KHLTVListItemGame | [];
  };
  attributes: {
    /** @example 20260909060000 +0300 */
    start: string;
    /** @example 20260909060000 +0300 */
    stop: string;
    /** internal numeric channel ID, unsure if stable */
    channel: string;
    /** internal alphanumeric program ID, unsure if stable/unique */
    id: string;
    /** @example 20260909060000 +0300 */
    start_unrounded: string;
    /** @example 20260909060000 +0300 */
    stop_unrounded: string;
  };
  /** start time, probably MST @example 06:00 */
  time: string;
  active?: boolean;
  diff_current_stop?: KHLTVListItemDiffs;
  diff_start_current?: KHLTVListItemDiffs;
  diff_start_stop?: KHLTVListItemDiffs;
  /** for an active program, the elapsed progress as a float from 0-100 */
  progress?: number;
  /** whether the program has already aired (disabled/faded in the UI) */
  disabled?: boolean;
}

type ChannelKey = "SD" | "HD";

export interface KHLTVListDate {
  weekday: null;
  /** day of month (1-31) */
  day: string;
  /** not a typo, but seemingly never used anyway */
  mounth: "";
  /** YYYYMMDD */
  formatdate: string;
  /** YYYYMMDD */
  id: number;
  current?: boolean;
  active?: boolean;
  channel: ChannelKey;
}

export interface KHLTVListData {
  TEXT: Record<string, string>;
  LIST: {
    FACES: KHLTVFace[];
    FACES_ALL: KHLTVFace[];
    PROGRAMS: Record<
      ChannelKey,
      Record<
        string,
        {
          list: KHLTVListItem[];
          /** whether this is the current day */
          active: boolean;
          /** whether the list contains disabled programmes; they have already aired */
          have_disable?: boolean;
        }
      >
    >;
    DATES: Record<ChannelKey, Record<string, KHLTVListDate>>;
  };
}

export interface KHLTVListError {
  message: string;
  code: string;
  customData?: Record<string, unknown>;
}

export interface KHLTVListErrorResponse {
  status: "error";
  data: null;
  errors: KHLTVListError[];
}

export interface KHLTVListSuccessResponse {
  status: "success";
  data: KHLTVListData;
  errors: [];
}

export type KHLTVListResponse =
  | KHLTVListSuccessResponse
  | KHLTVListErrorResponse;
