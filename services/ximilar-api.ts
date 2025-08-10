import { Card } from "@/types/card";

const API_TOKEN = "4a1a39b8d2b6795a8d4fd172183147a9b5e5b8ef";
const API_BASE_URL = "https://api.ximilar.com";

interface XimilarObject {
  name?: string;
  _identification?: {
    best_match?: {
      name: string;
      year?: string | number | null;
      set?: string;
      set_name?: string;
      card_number?: string;
      full_name?: string;
      subcategory?: string;
      rarity?: string;
      company?: string;
      team?: string;
      grade?: string;
      certificate_number?: string;
      links?: Record<string, string>;
      pricing?: {
        list?: {
          price?: number | null;
          currency?: string;
        }[];
      };
    };
  };
  _tags?: {
    Grade?: { name: string }[];
    Company?: { name: string }[];
  };
}

interface XimilarResponse {
  records: {
    _objects?: XimilarObject[];
  }[];
}

function extractCardFromObjects(objs: XimilarObject[] | undefined): { match: NonNullable<XimilarObject["_identification"]>["best_match"] | undefined; tags: XimilarObject["_tags"] | undefined } {
  if (!objs || objs.length === 0) return { match: undefined, tags: undefined };
  const cardObj = objs.find(o => (o.name ?? "").toLowerCase() === "card") ?? objs.find(o => o._identification?.best_match);
  const match = cardObj?._identification?.best_match;
  const tags = cardObj?._tags;
  return { match, tags };
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const arr = [...values].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function extractPrice(match: NonNullable<XimilarObject["_identification"]>["best_match"] | undefined): number | undefined {
  const list = match?.pricing?.list ?? [];
  const valid = list.map(p => p?.price ?? null).filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
  if (valid.length === 0) return undefined;
  const med = median(valid);
  return med ?? valid[0];
}

export async function identifyCard(base64Image: string): Promise<Card | null> {
  try {
    console.log("identifyCard: starting sport_id with pricing; sending tags for faster/better match");
    const sportResp = await fetch(`${API_BASE_URL}/collectibles/v2/sport_id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${API_TOKEN}`,
      },
      body: JSON.stringify({
        records: [
          {
            _base64: base64Image,
            Side: "front",
          },
        ],
        pricing: true,
        slab_grade: true,
        slab_id: true,
      }),
    });

    if (sportResp.ok) {
      const data: XimilarResponse = await sportResp.json();
      const { match, tags } = extractCardFromObjects(data.records?.[0]?._objects);
      if (match) {
        const price = extractPrice(match);
        const card: Card = {
          id: "",
          name: match.name || match.full_name || "Unknown Card",
          year: (match.year ?? undefined) as string | undefined,
          set: match.set || match.set_name,
          cardNumber: match.card_number,
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
        console.log("identifyCard: sport_id success", { name: card.name, price: card.price });
        return card;
      }
    } else {
      console.error("identifyCard: sport_id HTTP", sportResp.status);
    }

    console.log("identifyCard: fallback to tcg_id with pricing");
    const tcgResp = await fetch(`${API_BASE_URL}/collectibles/v2/tcg_id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${API_TOKEN}`,
      },
      body: JSON.stringify({
        records: [
          {
            _base64: base64Image,
            Side: "front",
            Alphabet: "latin",
            Category: "Card/Trading Card Game",
          },
        ],
        pricing: true,
      }),
    });

    if (!tcgResp.ok) {
      console.error("identifyCard: tcg_id HTTP", tcgResp.status);
      return null;
    }

    const tcgData: XimilarResponse = await tcgResp.json();
    const { match: tcgMatch } = extractCardFromObjects(tcgData.records?.[0]?._objects);
    if (!tcgMatch) {
      console.warn("identifyCard: tcg_id no match");
      return null;
    }
    const price = extractPrice(tcgMatch);
    const card: Card = {
      id: "",
      name: tcgMatch.name || tcgMatch.full_name || "Unknown Card",
      year: (tcgMatch.year ?? undefined) as string | undefined,
      set: tcgMatch.set || tcgMatch.set_name,
      cardNumber: tcgMatch.card_number,
      subcategory: tcgMatch.subcategory || "TCG",
      rarity: tcgMatch.rarity,
      price,
      links: tcgMatch.links,
      imageUri: "",
      dateAdded: "",
      folderId: null,
    };
    console.log("identifyCard: tcg_id success", { name: card.name, price: card.price });
    return card;
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
    const json = await resp.json();
    const grades = json?.records?.[0]?.grades ?? {};
    return {
      corners: typeof grades.corners === "number" ? grades.corners : undefined,
      edges: typeof grades.edges === "number" ? grades.edges : undefined,
      surface: typeof grades.surface === "number" ? grades.surface : undefined,
      centering: typeof grades.centering === "number" ? grades.centering : undefined,
      final: typeof grades.final === "number" ? grades.final : undefined,
      condition: typeof grades.condition === "string" ? grades.condition : undefined,
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
    const json = await resp.json();
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
    const json = await resp.json();
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
