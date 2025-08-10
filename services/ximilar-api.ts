import { Card } from "@/types/card";

const API_TOKEN = "4a1a39b8d2b6795a8d4fd172183147a9b5e5b8ef";
const API_BASE_URL = "https://api.ximilar.com";

interface XimilarObject {
  name?: string;
  _identification?: {
    best_match?: BestMatch;
    alternatives?: BestMatch[];
  };
  _tags?: {
    Grade?: { name: string }[];
    Company?: { name: string }[];
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
}

type BestMatch = {
  name: string;
  year?: string | number | null;
  set?: string;
  set_name?: string;
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
  pricing?: {
    list?: Array<{
      price?: number | null;
      currency?: string;
    }>;
    avg?: number | null;
    median?: number | null;
    low?: number | null;
    high?: number | null;
  };
};

type Extracted = { match: BestMatch | undefined; tags: XimilarObject["_tags"] | undefined };

function pickMatch(obj: XimilarObject | undefined): BestMatch | undefined {
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
    return s;
  };
  candidates.sort((a, b) => score(b) - score(a));
  return candidates[0];
}

function extractCardFromObjects(objs: XimilarObject[] | undefined): Extracted {
  if (!objs || objs.length === 0) return { match: undefined, tags: undefined };
  const cardObj = objs.find(o => (o.name ?? "").toLowerCase() === "card") ?? objs.find(o => o._identification?.best_match || (o._identification?.alternatives ?? []).length > 0);
  const match = pickMatch(cardObj);
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

  const pushIfValid = (v: unknown) => {
    if (typeof v === "number" && isFinite(v) && v > 0) values.push(v);
  };

  if (!pricing) return undefined;

  if (typeof pricing === "object" && pricing !== null) {
    const p: Record<string, unknown> = pricing as Record<string, unknown>;

    const list = (p.list as Array<{ price?: number | null }> | undefined) ?? [];
    if (Array.isArray(list)) {
      for (const item of list) pushIfValid((item?.price ?? null) as unknown);
    }

    if (typeof p.avg === "number") pushIfValid(p.avg);
    if (typeof p.median === "number") pushIfValid(p.median);
    if (typeof p.low === "number") pushIfValid(p.low);
    if (typeof p.high === "number") pushIfValid(p.high);

    Object.values(p).forEach((v) => {
      if (typeof v === "number") {
        pushIfValid(v);
      } else if (Array.isArray(v)) {
        for (const it of v) {
          if (typeof it === "number") pushIfValid(it);
          else if (it && typeof it === "object") {
            const obj = it as Record<string, unknown>;
            if (typeof obj.price === "number") pushIfValid(obj.price);
            if (typeof obj.avg === "number") pushIfValid(obj.avg);
            if (typeof obj.median === "number") pushIfValid(obj.median);
          }
        }
      } else if (v && typeof v === "object") {
        const obj = v as Record<string, unknown>;
        if (typeof obj.price === "number") pushIfValid(obj.price);
        if (typeof obj.avg === "number") pushIfValid(obj.avg);
        if (typeof obj.median === "number") pushIfValid(obj.median);
        if (typeof obj.low === "number") pushIfValid(obj.low);
        if (typeof obj.mid === "number") pushIfValid(obj.mid);
        if (typeof obj.high === "number") pushIfValid(obj.high);
      }
    });
  }

  if (values.length === 0) return undefined;
  const med = median(values);
  return med ?? values[0];
}

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Token ${API_TOKEN}` },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      console.error("postJson HTTP", resp.status, url);
      return null;
    }
    const json = (await resp.json()) as T;
    return json;
  } catch (e) {
    console.error("postJson error", e);
    return null;
  }
}

function toCard(match: BestMatch | undefined, tags?: XimilarObject["_tags"]): Card | null {
  if (!match) return null;
  const price = extractPrice(match);
  const yearVal = match.year != null ? String(match.year) : undefined;
  const cardNo = match.card_number || match.number;
  const card: Card = {
    id: "",
    name: match.name || match.full_name || "Unknown Card",
    year: yearVal,
    set: match.set || match.set_name,
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
    imageUri: "",
    dateAdded: "",
    folderId: null,
  };
  return card;
}

export async function identifyCard(base64Image: string): Promise<Card | null> {
  try {
    console.log("identifyCard: sport_id pass 1 (sports first)");
    const sportData = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/sport_id`, {
      records: [{ _base64: base64Image }],
      pricing: true,
      price_sources: ["tcgplayer", "ebay"],
      slab_grade: true,
      slab_id: true,
    });
    const sportRecord = sportData?.records?.[0];
    if ((sportRecord?._status?.code ?? 200) === 200) {
      const { match, tags } = extractCardFromObjects(sportRecord?._objects);
      const c = toCard(match, tags);
      if (c) {
        console.log("identifyCard: sport_id success", { name: c.name, price: c.price });
        return c;
      }
    }

    console.log("identifyCard: analyze pass 2 (broad)");
    const analyzeData = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/analyze`, {
      records: [{ _base64: base64Image }],
      pricing: true,
      price_sources: ["tcgplayer", "ebay", "cardmarket"],
    });
    const analyzeRecord = analyzeData?.records?.[0];
    if ((analyzeRecord?._status?.code ?? 200) === 200) {
      const { match, tags } = extractCardFromObjects(analyzeRecord?._objects);
      const c = toCard(match, tags);
      if (c) {
        console.log("identifyCard: analyze success", { name: c.name, price: c.price });
        return c;
      }
    }

    console.log("identifyCard: tcg_id pass 3");
    const tcgData = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/tcg_id`, {
      records: [{ _base64: base64Image }],
      pricing: true,
      price_sources: ["tcgplayer", "cardmarket", "ebay"],
      slab_grade: true,
      slab_id: true,
    });
    const tcgRecord = tcgData?.records?.[0];
    if ((tcgRecord?._status?.code ?? 200) === 200) {
      const { match, tags } = extractCardFromObjects(tcgRecord?._objects);
      const c = toCard(match, tags);
      if (c) {
        console.log("identifyCard: tcg_id success", { name: c.name, price: c.price });
        return c;
      }
    }

    console.log("identifyCard: slab_id pass 4");
    const slabData = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/slab_id`, {
      records: [{ _base64: base64Image }],
      slab_grade: true,
    });
    const slabRecord = slabData?.records?.[0];
    if ((slabRecord?._status?.code ?? 200) === 200) {
      const { match, tags } = extractCardFromObjects(slabRecord?._objects);
      const c = toCard(match, tags);
      if (c) {
        console.log("identifyCard: slab_id success", { name: c.name, price: c.price });
        return c;
      }
    }

    console.log("identifyCard: comics_id pass 5");
    const comicsData = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/comics_id`, {
      records: [{ _base64: base64Image }],
      pricing: true,
      price_sources: ["ebay"],
    });
    const comicsRecord = comicsData?.records?.[0];
    if ((comicsRecord?._status?.code ?? 200) === 200) {
      const { match, tags } = extractCardFromObjects(comicsRecord?._objects);
      const c = toCard(match, tags);
      if (c) {
        console.log("identifyCard: comics_id success", { name: c.name, price: c.price });
        return c;
      }
    }

    console.log("identifyCard: OCR fallback pass 6 (card_ocr_id)");
    const ocrData = await postJson<XimilarResponse>(`${API_BASE_URL}/collectibles/v2/card_ocr_id`, {
      records: [{ _base64: base64Image }],
    });
    const ocrRecord = ocrData?.records?.[0];
    const firstObj = ocrRecord?._objects?.find(o => (o.name ?? "").toLowerCase() === "card") ?? ocrRecord?._objects?.[0];
    const ocrMatch = firstObj?._identification?.best_match ?? (firstObj?._identification?.alternatives ?? [])[0];
    const ocrCard = toCard(ocrMatch, firstObj?._tags);
    if (ocrCard) {
      console.log("identifyCard: OCR best-effort result", { name: ocrCard.name });
      return ocrCard;
    }

    console.warn("identifyCard: no match across all strategies");
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
    console.log("gradeCard: calling /card-grader/v2/grade with", { hasBack: !!backBase64 });
    const records: Array<{ _base64: string; Side?: string }> = [{ _base64: frontBase64, Side: "front" }];
    if (backBase64 && backBase64.length > 0) {
      records.push({ _base64: backBase64, Side: "back" });
    }
    const resp = await fetch(`${API_BASE_URL}/card-grader/v2/grade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${API_TOKEN}`,
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
    console.log("conditionCard: calling /card-grader/v2/condition with mode", mode);
    const resp = await fetch(`${API_BASE_URL}/card-grader/v2/condition`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${API_TOKEN}`,
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
    console.log("centeringCard: calling /card-grader/v2/centering");
    const resp = await fetch(`${API_BASE_URL}/card-grader/v2/centering`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${API_TOKEN}`,
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
