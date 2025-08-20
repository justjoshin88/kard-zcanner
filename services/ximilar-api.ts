import { Card, MarketListing } from "@/types/card";
import Constants from "expo-constants";

let RUNTIME_TOKEN = "";
export function setXimilarToken(token: string) {
  RUNTIME_TOKEN = (token ?? "").trim();
}

function resolveXimilarToken(): string {
  if (RUNTIME_TOKEN) return RUNTIME_TOKEN;
  const gt: unknown = (globalThis as unknown as { EXPO_PUBLIC_XIMILAR_TOKEN?: string })?.EXPO_PUBLIC_XIMILAR_TOKEN;
  const globalToken = (typeof gt === "string" ? gt : undefined)?.trim();
  if (globalToken) return globalToken;
  const envToken = (process.env?.EXPO_PUBLIC_XIMILAR_TOKEN as string | undefined)?.trim();
  if (envToken) return envToken;
  const anyConstants = Constants as unknown as {
    expoConfig?: { extra?: Record<string, unknown> };
    manifest2?: { extra?: Record<string, unknown> };
  };
  const extra = anyConstants?.expoConfig?.extra ?? anyConstants?.manifest2?.extra ?? {};
  const extraToken = (extra?.EXPO_PUBLIC_XIMILAR_TOKEN as string | undefined)?.trim();
  return extraToken ?? "";
}

function getXimilarToken(): string { return RUNTIME_TOKEN || resolveXimilarToken(); }
const API_BASE_URL = "https://api.ximilar.com";

type Nullable<T> = T | null | undefined;

interface XimilarObject {
  name?: string;
  _identification?: {
    best_match?: BestMatch;
    alternatives?: BestMatch[];
  };
  _tags?: {
    Grade?: { name: string }[];
    Company?: { name: string }[];
    Subcategory?: { name: string }[];
  };
}

interface XimilarRecord {
  _status?: { code?: number; text?: string };
  _objects?: XimilarObject[];
  grades?: Record<string, unknown>;
  card?: Array<{ centering?: Record<string, unknown> }>;
}

interface XimilarResponse {
  records?: XimilarRecord[];
  status?: { code?: number; text?: string };
}

type BestMatch = {
  name: string;
  year?: string | number | null;
  set?: string;
  set_name?: string;
  set_code?: string;
  set_series_code?: string;
  series?: string;
  card_number?: string;
  number?: string;
  full_name?: string;
  subcategory?: string;
  rarity?: string;
  company?: string;
  team?: string;
  grade?: string;
  certificate_number?: string;
  links?: Record<string, string>;
  // TCG extras
  colors?: string[];
  color?: string;
  type?: string;
  card_id?: string;
  set_code_full?: string;
  // Comics extras
  title?: string;
  date?: string;
  publisher?: string;
  origin_date?: string;
  pricing?: {
    list?: Array<{
      item_id?: string;
      item_link?: string;
      name?: string;
      price?: number | null;
      currency?: string;
      country_code?: string;
      source?: string;
      date_of_creation?: string;
      grade_company?: string | null;
      grade?: number | null;
      grade_value?: number | null;
      date_of_sale?: string | null;
    }>;
    avg?: number | null;
    median?: number | null;
    low?: number | null;
    high?: number | null;
  } | Record<string, unknown>;
};

type Extracted = { match: BestMatch | undefined; tags: XimilarObject["_tags"] | undefined };

function pickMatch(obj: XimilarObject | undefined, tags?: XimilarObject["_tags"], ocrNames?: string[]): BestMatch | undefined {
  const candidates: BestMatch[] = [];
  const best = obj?._identification?.best_match;
  if (best) candidates.push(best);
  const alt = obj?._identification?.alternatives ?? [];
  for (const a of alt) candidates.push(a);
  if (candidates.length === 0) return undefined;
  const score = (m: BestMatch) => {
    let s = 0;
    if (m.year) s += 2;
    if (m.set || m.set_name) s += 2;
    if (m.card_number || m.number) s += 2;
    if (m.links && Object.keys(m.links).length > 0) s += 1;
    const pr = m.pricing as unknown;
    if (pr && typeof pr === "object") s += 2;
    const tagSub = tags?.Subcategory?.[0]?.name?.toLowerCase();
    const mSub = (m.subcategory ?? "").toLowerCase();
    if (tagSub && mSub && (mSub.includes(tagSub) || tagSub.includes(mSub))) s += 3;
    const name = (m.full_name ?? m.name ?? "").toLowerCase();
    if (Array.isArray(ocrNames) && ocrNames.length > 0) {
      for (const kw of ocrNames) {
        if (name.includes(kw.toLowerCase())) { s += 5; break; }
      }
    }
    return s;
  };
  if (best) {
    const tagSub = tags?.Subcategory?.[0]?.name?.toLowerCase();
    const mSub = (best.subcategory ?? "").toLowerCase();
    const consistent = !tagSub || !mSub || mSub.includes(tagSub) || tagSub.includes(mSub);
    const name = (best.full_name ?? best.name ?? "").toLowerCase();
    let nameHit = false;
    if (Array.isArray(ocrNames)) {
      for (const kw of ocrNames) { if (name.includes(kw.toLowerCase())) { nameHit = true; break; } }
    }
    if (consistent && nameHit) return best;
  }
  candidates.sort((a, b) => score(b) - score(a));
  return candidates[0];
}

function extractCardFromObjects(objs: XimilarObject[] | undefined): Extracted {
  if (!objs || objs.length === 0) return { match: undefined, tags: undefined };
  const primary = objs.find(o => {
    const n = (o.name ?? "").toLowerCase();
    return n === "card" || n === "comics";
  });
  const cardObj = primary ?? objs.find(o => o._identification?.best_match || (o._identification?.alternatives ?? []).length > 0);
  const match = pickMatch(cardObj, cardObj?._tags);
  const tags = cardObj?._tags;
  return { match, tags };
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const arr = [...values].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function extractPrice(match: BestMatch | undefined): number | undefined {
  const pricing: unknown = match?.pricing as unknown;
  const values: number[] = [];

  const toNum = (v: unknown): number | undefined => {
    if (typeof v === "number") return isFinite(v) && v > 0 ? v : undefined;
    if (typeof v === "string") {
      const n = Number(v.replace(/[^0-9.\-]/g, ""));
      return isFinite(n) && n > 0 ? n : undefined;
    }
    return undefined;
  };

  const pushIfValid = (v: unknown) => {
    const n = toNum(v);
    if (typeof n === "number") values.push(n);
  };

  if (!pricing) return undefined;

  if (typeof pricing === "object" && pricing !== null) {
    const p: Record<string, unknown> = pricing as Record<string, unknown>;

    const list = (p.list as Array<{ price?: unknown }> | undefined) ?? [];
    if (Array.isArray(list)) {
      for (const item of list) pushIfValid(item?.price ?? null);
    }

    pushIfValid((p as any).avg);
    pushIfValid((p as any).median);
    pushIfValid((p as any).low);
    pushIfValid((p as any).high);

    Object.values(p).forEach((v) => {
      if (Array.isArray(v)) {
        for (const it of v) {
          if (typeof it === "number" || typeof it === "string") pushIfValid(it);
          else if (it && typeof it === "object") {
            const obj = it as Record<string, unknown>;
            pushIfValid(obj.price);
            pushIfValid(obj.avg);
            pushIfValid(obj.median);
            pushIfValid((obj as any).low);
            pushIfValid((obj as any).high);
          }
        }
      } else if (v && typeof v === "object") {
        const obj = v as Record<string, unknown>;
        pushIfValid(obj.price);
        pushIfValid(obj.avg);
        pushIfValid(obj.median);
        pushIfValid((obj as any).low);
        pushIfValid((obj as any).mid);
        pushIfValid((obj as any).high);
      } else if (typeof v === "number" || typeof v === "string") {
        pushIfValid(v);
      }
    });
  }

  if (values.length === 0) return undefined;
  const med = median(values);
  return med ?? values[0];
}

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const token = getXimilarToken();
    if (!token) {
      console.error("Ximilar API token missing. Set EXPO_PUBLIC_XIMILAR_TOKEN in your env, add it to app.json -> expo.extra.EXPO_PUBLIC_XIMILAR_TOKEN, or call setXimilarToken(token) at runtime.");
      return null;
    }
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Token ${getXimilarToken()}` },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      let text: string | undefined;
      try { text = await resp.text(); } catch {}
      console.error("postJson HTTP", resp.status, url, text ?? "");
      return null;
    }
    const json = (await resp.json()) as T;
    return json;
  } catch (e) {
    console.error("postJson error", e);
    return null;
  }
}

function normalizeListings(match: BestMatch | undefined): MarketListing[] | undefined {
  const raw = (match?.pricing as any)?.list as Array<Record<string, unknown>> | undefined;
  if (!raw || !Array.isArray(raw)) return undefined;
  const items: MarketListing[] = [];
  for (const it of raw) {
    const priceUnknown = (it as any).price as unknown;
    const priceNum = typeof priceUnknown === "number" ? priceUnknown : (typeof priceUnknown === "string" ? Number(priceUnknown.replace(/[^0-9.\-]/g, "")) : undefined);
    const gradeUnknown = (it as any).grade_value as unknown;
    const gradeNum = typeof gradeUnknown === "number" ? gradeUnknown : (typeof gradeUnknown === "string" ? Number(gradeUnknown.replace(/[^0-9.\-]/g, "")) : undefined);

    const listing: MarketListing = {
      item_id: typeof it.item_id === "string" ? it.item_id : undefined,
      item_link: typeof it.item_link === "string" ? it.item_link : undefined,
      name: typeof it.name === "string" ? it.name : undefined,
      price: typeof priceNum === "number" && isFinite(priceNum) ? priceNum : undefined,
      currency: typeof it.currency === "string" ? it.currency : undefined,
      country_code: typeof it.country_code === "string" ? it.country_code : undefined,
      source: typeof it.source === "string" ? it.source : undefined,
      date_of_creation: typeof it.date_of_creation === "string" ? it.date_of_creation : undefined,
      grade_company: typeof it.grade_company === "string" ? it.grade_company : null,
      grade_value: typeof gradeNum === "number" && isFinite(gradeNum) ? gradeNum : (typeof (it as any).grade === "number" ? (it as any).grade : null),
      date_of_sale: typeof it.date_of_sale === "string" ? it.date_of_sale : null,
    };
    items.push(listing);
  }
  return items.length > 0 ? items : undefined;
}

function toCard(match: BestMatch | undefined, tags?: XimilarObject["_tags"]): Card | null {
  if (!match) return null;
  const price = extractPrice(match);
  const yearVal = match.year != null ? String(match.year) : undefined;
  const cardNo = match.card_number || match.number;
  const listings = normalizeListings(match);
  const card: Card = {
    id: "",
    name: match.name || match.full_name || "Unknown Card",
    year: yearVal,
    set: match.set || match.set_name,
    setCode: match.set_code,
    setSeriesCode: match.set_series_code,
    series: match.series,
    cardNumber: cardNo,
    subcategory: match.subcategory,
    company: match.company,
    team: match.team,
    rarity: match.rarity,
    price,
    grade: tags?.Grade?.[0]?.name || match.grade,
    gradeCompany: tags?.Company?.[0]?.name,
    certificateNumber: match.certificate_number,
    links: match.links,
    listings,
    colors: Array.isArray(match.colors) ? match.colors : undefined,
    color: match.color,
    type: match.type,
    cardId: match.card_id,
    setCodeFull: match.set_code_full,
    title: match.title,
    date: match.date,
    number: match.number,
    publisher: match.publisher,
    origin_date: match.origin_date,
    imageUri: "",
    dateAdded: "",
    folderId: null,
  };
  return card;
}

const TCG_KEYWORDS = [
  "pokemon","pokémon","yugioh","yu-gi-oh","yu gi oh","mtg","magic the gathering","lorcana","one piece","flesh and blood","fab","metazoo","digimon","dragon ball super","dragon ball","dbs","weiss schwarz","vanguard","union arena","grand archive","force of will","marvel champions","garbage pail kids","star wars unlimited","ultraman","riftbound","rune","marvel universe","lotr","lord of the rings","final fantasy","arkham horror"
] as const;

const SPORT_SUBCATEGORIES = ["baseball","basketball","football","hockey","soccer","mma"] as const;

function extractOcrNamesFromResponse(data: XimilarResponse | null): string[] {
  const names: string[] = [];
  const rec = data?.records?.[0];
  const texts: string[] = [];
  const objs = rec?._objects ?? [];
  for (const o of objs) {
    const anyO: any = o as any;
    const ft = anyO?._ocr?.full_text;
    if (typeof ft === "string") texts.push(ft);
    const tarr = anyO?._ocr?.texts;
    if (Array.isArray(tarr)) {
      for (const t of tarr) if (t?.text && typeof t.text === "string") texts.push(t.text);
    }
  }
  const joined = texts.join(" ");
  const tokensUpper = joined.match(/[A-Z][A-Z]+(?:\s+[A-Z0-9#'\-][A-Z0-9#'\-]+)*/g) || [];
  const tokensTitle = joined.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z0-9\-']+)*)\b/g) || [];
  const tokens = [...tokensUpper, ...tokensTitle];
  for (const t of tokens) {
    const norm = t.trim().toLowerCase();
    if (norm.length >= 3 && !names.includes(norm)) names.push(norm);
  }
  return names;
}

export async function identifyCard(base64Image: string): Promise<Card | null> {
  try {
    console.log("identifyCard:start len=", base64Image?.length ?? 0);
    if (!base64Image || base64Image.length < 50) {
      console.warn("identifyCard: invalid base64 input");
      return null;
    }
    const preOcr = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/card_ocr_id`, { records: [{ _base64: base64Image }] });
    const ocrNames = extractOcrNamesFromResponse(preOcr);

    const detect = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/detect`, { records: [{ _base64: base64Image }] });
    const detectObjs = detect?.records?.[0]?._objects ?? [];
    const multiCards = detectObjs.filter(o => (o.name ?? '').toLowerCase() === 'card').length > 1;

    const processData = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/process`, { records: [{ _base64: base64Image }] });
    const procObjs = processData?.records?.[0]?._objects ?? [];
    const topNames = procObjs.map(o => (o.name ?? '').toLowerCase());
    const anyComics = topNames.includes('comics');
    const anyCard = topNames.includes('card');
    const subTag = procObjs.find(Boolean)?._tags?.Subcategory?.[0]?.name?.toLowerCase();

    if (anyComics) {
      const comicsData = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/comics_id`, {
        records: [{ _base64: base64Image, lang: 'en' }],
        pricing: true,
        slab_id: true,
      });
      const comicsRecord = comicsData?.records?.[0];
      if ((comicsRecord?._status?.code ?? 200) === 200) {
        const { match, tags } = extractCardFromObjects(comicsRecord?._objects);
        const chosen = pickMatch((comicsRecord?._objects ?? [])[0], tags, ocrNames) || match;
        const c = toCard(chosen, tags);
        if (c) { console.log('identifyCard:comics_id match'); return c; }
      }
    }

    if (anyCard) {
      const looksTcg = subTag ? TCG_KEYWORDS.some(k => subTag.includes(k)) : false;
      if (looksTcg) {
        const tcgData = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/tcg_id`, {
          records: [{ _base64: base64Image }],
          pricing: true,
          slab_grade: true,
          slab_id: true,
          analyze_all: multiCards,
        });
        const tcgRecord = tcgData?.records?.[0];
        if ((tcgRecord?._status?.code ?? 200) === 200) {
          const { match, tags } = extractCardFromObjects(tcgRecord?._objects);
          const chosen = pickMatch((tcgRecord?._objects ?? [])[0], tags, ocrNames) || match;
          const c = toCard(chosen, tags);
          if (c) { console.log('identifyCard:tcg_id match'); return c; }
        }
      } else {
        const sportData = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/sport_id`, {
          records: [{ _base64: base64Image }],
          pricing: true,
          slab_grade: true,
          slab_id: true,
          analyze_all: multiCards,
        });
        const sportRecord = sportData?.records?.[0];
        if ((sportRecord?._status?.code ?? 200) === 200) {
          const { match, tags } = extractCardFromObjects(sportRecord?._objects);
          const chosen = pickMatch((sportRecord?._objects ?? [])[0], tags, ocrNames) || match;
          const c = toCard(chosen, tags);
          if (c) { console.log('identifyCard:sport_id match'); return c; }
        }
      }
    }

    const analyzeData = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/analyze`, {
      records: [{ _base64: base64Image }],
      pricing: true,
    });
    const analyzeRecord = analyzeData?.records?.[0];
    if ((analyzeRecord?._status?.code ?? 200) === 200) {
      const { match, tags } = extractCardFromObjects(analyzeRecord?._objects);
      const chosen = pickMatch((analyzeRecord?._objects ?? [])[0], tags, ocrNames) || match;
      const c = toCard(chosen, tags);
      if (c) { console.log('identifyCard:analyze match'); return c; }
    }

    const slabData = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/slab_id`, {
      records: [{ _base64: base64Image }],
    });
    const slabRecord = slabData?.records?.[0];
    if ((slabRecord?._status?.code ?? 200) === 200) {
      const { match, tags } = extractCardFromObjects(slabRecord?._objects);
      const chosen = pickMatch((slabRecord?._objects ?? [])[0], tags, ocrNames) || match;
      const c = toCard(chosen, tags);
      if (c) { console.log('identifyCard:slab_id match'); return c; }
    }

    const ocrData = preOcr;
    const ocrRecord = ocrData?.records?.[0];
    const firstObj = ocrRecord?._objects?.find(o => {
      const n = (o.name ?? '').toLowerCase();
      return n === 'card' || n === 'comics' || !!o._identification;
    }) ?? ocrRecord?._objects?.[0];
    const ocrMatch = firstObj?._identification?.best_match ?? (firstObj?._identification?.alternatives ?? [])[0];
    const ocrCard = toCard(ocrMatch, firstObj?._tags);
    if (ocrCard) { console.log('identifyCard:ocr match'); return ocrCard; }

    console.warn('identifyCard: no identification, detect objects=', detectObjs.length);
    return null;
  } catch (error) {
    console.error("Error identifying card:", error);
    return null;
  }
}

export type ConditionMode = "ebay" | "psa" | "bgs" | "sgc" | "cgc";

export async function gradeCard(frontBase64: string, backBase64?: string): Promise<{
  corners?: number;
  edges?: number;
  surface?: number;
  centering?: number;
  final?: number;
  condition?: string;
} | null> {
  try {
    const records: Array<{ _base64: string; Side?: string }> = [{ _base64: frontBase64, Side: "front" }];
    if (backBase64 && backBase64.length > 0) {
      records.push({ _base64: backBase64, Side: "back" });
    }
    const resp = await fetch(`${API_BASE_URL}/card-grader/v2/grade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${getXimilarToken()}`,
      },
      body: JSON.stringify({ records }),
    });
    if (!resp.ok) {
      console.error("gradeCard HTTP", resp.status);
      return null;
    }
    const json = (await resp.json()) as XimilarResponse;
    const grades = json?.records?.[0]?.grades ?? {};
    return {
      corners: typeof (grades as any).corners === "number" ? (grades as any).corners : undefined,
      edges: typeof (grades as any).edges === "number" ? (grades as any).edges : undefined,
      surface: typeof (grades as any).surface === "number" ? (grades as any).surface : undefined,
      centering: typeof (grades as any).centering === "number" ? (grades as any).centering : undefined,
      final: typeof (grades as any).final === "number" ? (grades as any).final : undefined,
      condition: typeof (grades as any).condition === "string" ? (grades as any).condition : undefined,
    };
  } catch (e) {
    console.error("gradeCard error", e);
    return null;
  }
}

export async function conditionCard(mode: ConditionMode, frontBase64: string): Promise<{
  label?: string;
  scale_value?: number;
  max_scale_value?: number;
  mode?: string;
} | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/card-grader/v2/condition`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${getXimilarToken()}`,
      },
      body: JSON.stringify({
        records: [{ _base64: frontBase64 }],
        mode,
      }),
    });
    if (!resp.ok) {
      console.error("conditionCard HTTP", resp.status);
      return null;
    }
    const json = (await resp.json()) as any;
    const obj = json?.records?.[0]?._objects?.[0]?.Condition?.[0] ?? json?.records?.[0]?.Condition?.[0] ?? null;
    if (!obj) return null;
    return {
      label: typeof obj.label === "string" ? obj.label : undefined,
      scale_value: typeof obj.scale_value === "number" ? obj.scale_value : undefined,
      max_scale_value: typeof obj.max_scale_value === "number" ? obj.max_scale_value : undefined,
      mode: typeof obj.mode === "string" ? obj.mode : undefined,
    };
  } catch (e) {
    console.error("conditionCard error", e);
    return null;
  }
}

export async function centeringCard(frontBase64: string): Promise<{
  centering?: number;
  leftRight?: string;
  topBottom?: string;
} | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/card-grader/v2/centering`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${getXimilarToken()}`,
      },
      body: JSON.stringify({ records: [{ _base64: frontBase64 }] }),
    });
    if (!resp.ok) {
      console.error("centeringCard HTTP", resp.status);
      return null;
    }
    const json = (await resp.json()) as any;
    const grades = json?.records?.[0]?.grades ?? {};
    const cardInfo = json?.records?.[0]?.card?.[0]?.centering ?? {};
    return {
      centering: typeof grades.centering === "number" ? grades.centering : undefined,
      leftRight: typeof cardInfo["left/right"] === "string" ? cardInfo["left/right"] : undefined,
      topBottom: typeof cardInfo["top/bottom"] === "string" ? cardInfo["top/bottom"] : undefined,
    };
  } catch (e) {
    console.error("centeringCard error", e);
    return null;
  }
}

export async function sportId(input: { base64?: string; url?: string; pricing?: boolean; slab_id?: boolean; slab_grade?: boolean; analyze_all?: boolean; lang?: string | boolean }): Promise<XimilarResponse | null> {
  const recBase = input.base64 ? [{ _base64: input.base64 }] : input.url ? [{ _url: input.url }] : [];
  const records = recBase.map(r => ({ ...r, ...(input.lang !== undefined ? { lang: input.lang } : {}) }));
  return postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/sport_id`, {
    records,
    pricing: input.pricing ?? false,
    slab_id: input.slab_id ?? false,
    slab_grade: input.slab_grade ?? false,
    analyze_all: input.analyze_all ?? false,
  });
}

export async function tcgId(input: { base64?: string; url?: string; pricing?: boolean; slab_id?: boolean; slab_grade?: boolean; analyze_all?: boolean; lang?: string | boolean }): Promise<XimilarResponse | null> {
  const recBase = input.base64 ? [{ _base64: input.base64 }] : input.url ? [{ _url: input.url }] : [];
  const records = recBase.map(r => ({ ...r, ...(input.lang !== undefined ? { lang: input.lang } : {}) }));
  return postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/tcg_id`, {
    records,
    pricing: input.pricing ?? false,
    slab_id: input.slab_id ?? false,
    slab_grade: input.slab_grade ?? false,
    analyze_all: input.analyze_all ?? false,
  });
}

export async function comicsId(input: { base64?: string; url?: string; pricing?: boolean; slab_id?: boolean; lang?: string | boolean; analyze_all?: boolean }): Promise<XimilarResponse | null> {
  const recBase = input.base64 ? [{ _base64: input.base64 }] : input.url ? [{ _url: input.url }] : [];
  const records = recBase.map(r => ({ ...r, ...(input.lang !== undefined ? { lang: input.lang } : {}) }));
  return postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/comics_id`, {
    records,
    pricing: input.pricing ?? false,
    slab_id: input.slab_id ?? false,
    analyze_all: input.analyze_all ?? false,
  });
}

export async function cardOcrId(input: { base64?: string; url?: string; lang?: string | boolean }): Promise<XimilarResponse | null> {
  const recBase = input.base64 ? [{ _base64: input.base64 }] : input.url ? [{ _url: input.url }] : [];
  const records = recBase.map(r => ({ ...r, ...(input.lang !== undefined ? { lang: input.lang } : {}) }));
  return postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/card_ocr_id`, { records });
}

export async function slabId(input: { base64?: string; url?: string }): Promise<XimilarResponse | null> {
  const records = input.base64 ? [{ _base64: input.base64 }] : input.url ? [{ _url: input.url }] : [];
  return postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/slab_id`, { records });
}

export async function slabGrade(input: { base64?: string; url?: string }): Promise<XimilarResponse | null> {
  const records = input.base64 ? [{ _base64: input.base64 }] : input.url ? [{ _url: input.url }] : [];
  return postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/slab_grade`, { records });
}

export async function detectCollectibles(input: { base64?: string; url?: string }): Promise<XimilarResponse | null> {
  const records = input.base64 ? [{ _base64: input.base64 }] : input.url ? [{ _url: input.url }] : [];
  return postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/detect`, { records });
}

export async function processCollectibles(input: { base64?: string; url?: string }): Promise<XimilarResponse | null> {
  const records = input.base64 ? [{ _base64: input.base64 }] : input.url ? [{ _url: input.url }] : [];
  return postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/process`, { records });
}

export async function analyzeCollectibles(input: { base64?: string; url?: string; pricing?: boolean; analyze_all?: boolean; lang?: string | boolean }): Promise<XimilarResponse | null> {
  const recBase = input.base64 ? [{ _base64: input.base64 }] : input.url ? [{ _url: input.url }] : [];
  const records = recBase.map(r => ({ ...r, ...(input.lang !== undefined ? { lang: input.lang } : {}) }));
  return postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/analyze`, { records, pricing: input.pricing ?? false, analyze_all: input.analyze_all ?? false });
}
