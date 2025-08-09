import { Card } from "@/types/card";

const API_TOKEN = "4a1a39b8d2b6795a8d4fd172183147a9b5e5b8ef";
const API_BASE_URL = "https://api.ximilar.com/collectibles/v2";

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

function averagePrice(match: NonNullable<XimilarObject["_identification"]>["best_match"] | undefined): number | undefined {
  const list = match?.pricing?.list ?? [];
  const valid = list.map(p => p?.price ?? null).filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
  if (valid.length === 0) return undefined;
  const sum = valid.reduce((a, b) => a + b, 0);
  return sum / valid.length;
}

export async function identifyCard(base64Image: string): Promise<Card | null> {
  try {
    console.log("identifyCard: starting sport_id request with pricing=true");
    const response = await fetch(`${API_BASE_URL}/sport_id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${API_TOKEN}`,
      },
      body: JSON.stringify({
        records: [
          {
            _base64: base64Image,
          },
        ],
        pricing: true,
        slab_grade: true,
        slab_id: true,
      }),
    });

    if (!response.ok) {
      console.error("identifyCard: sport_id HTTP", response.status);
    } else {
      const data: XimilarResponse = await response.json();
      const { match, tags } = extractCardFromObjects(data.records?.[0]?._objects);
      if (match) {
        const price = averagePrice(match);
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
    }

    console.log("identifyCard: falling back to tcg_id with pricing=true");
    const tcgResponse = await fetch(`${API_BASE_URL}/tcg_id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${API_TOKEN}`,
      },
      body: JSON.stringify({
        records: [
          {
            _base64: base64Image,
          },
        ],
        pricing: true,
      }),
    });

    if (!tcgResponse.ok) {
      console.error("identifyCard: tcg_id HTTP", tcgResponse.status);
      return null;
    }

    const tcgData: XimilarResponse = await tcgResponse.json();
    const { match: tcgMatch } = extractCardFromObjects(tcgData.records?.[0]?._objects);
    if (!tcgMatch) {
      console.warn("identifyCard: tcg_id returned no match");
      return null;
    }

    const tcgPrice = averagePrice(tcgMatch);
    const card: Card = {
      id: "",
      name: tcgMatch.name || tcgMatch.full_name || "Unknown Card",
      year: (tcgMatch.year ?? undefined) as string | undefined,
      set: tcgMatch.set || tcgMatch.set_name,
      cardNumber: tcgMatch.card_number,
      subcategory: tcgMatch.subcategory || "TCG",
      rarity: tcgMatch.rarity,
      price: tcgPrice,
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