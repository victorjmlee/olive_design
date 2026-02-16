// ─── Style Analysis ─────────────────────────────────────────────────────────

export interface StyleProfile {
  colors: string[];          // hex codes e.g. ["#8B7355", "#F5F0E8"]
  materials: string[];       // e.g. ["원목", "대리석", "린넨"]
  mood: string;              // e.g. "따뜻하고 자연스러운 내추럴 무드"
  style: string;             // e.g. "내추럴 모던"
  keywords: string[];        // e.g. ["우드톤", "미니멀", "따뜻한"]
  summary: string;           // 2-3 sentence Korean description
}

// ─── Design Generation ──────────────────────────────────────────────────────

export interface DesignMessage {
  role: "user" | "assistant";
  content: string;
  imageBase64?: string;
}

export interface DesignRequest {
  prompt: string;            // user room description (Korean)
  styleProfile: StyleProfile;
}

export interface DesignResult {
  imageBase64: string;       // base64-encoded generated image
  description: string;       // Claude Korean description
  prompt: string;            // original user prompt
}

// ─── Materials ──────────────────────────────────────────────────────────────

export interface Material {
  name: string;              // e.g. "원목 헤링본 마루"
  category: string;          // e.g. "바닥재"
  searchKeyword: string;     // Naver search keyword
  estimatedSpec: string;     // e.g. "120x600mm"
}

// ─── Naver Shopping ─────────────────────────────────────────────────────────

export interface NaverItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  category1: string;
  category2: string;
  category3: string;
}

export interface NaverSearchResult {
  items: NaverItem[];
  total: number;
  start: number;
}

// ─── Estimate ───────────────────────────────────────────────────────────────

export interface EstimateRow {
  name: string;
  price: string;
  qty: number;
}

// ─── App State ──────────────────────────────────────────────────────────────

export interface AppState {
  step: number;
  // Step 1
  uploadedImages: string[];     // base64 data URIs
  styleText: string;
  styleProfile: StyleProfile | null;
  // Step 2
  designPrompt: string;
  // Step 3
  designResult: DesignResult | null;
  designMessages: DesignMessage[];
  // Step 4
  materials: Material[];
  // Step 5
  estimateRows: EstimateRow[];
  customerName: string;
}
