import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PLASTIC_BASE,
  CLEAN_MULT,
  type PlasticType,
  type Cleanliness,
  type Locale,
  useTranslation,
} from "@/lib/yoha-store";
import petImg from "@/assets/plastic-pet.jpg";
import hdpeImg from "@/assets/plastic-hdpe.jpg";
import ppImg from "@/assets/plastic-pp.jpg";
import ldpeImg from "@/assets/plastic-ldpe.jpg";
import psImg from "@/assets/plastic-ps.jpg";

export const Route = createFileRoute("/app/guide")({
  component: GuidePage,
});

type Guide = {
  code: PlasticType | "PVC";
  emoji: string;
  name: string;
  value: string;
  features: string;
  examples: string[];
  tone: string;
  accepted: boolean;
  image?: string;
  imageLabels?: [string, string, string];
};

type GuideCode = Guide["code"];
type GuideCopy = Pick<Guide, "name" | "value" | "features" | "examples" | "imageLabels">;
type GuideMeta = Omit<Guide, keyof GuideCopy>;

const GUIDE_ORDER: GuideCode[] = ["PET", "HDPE", "PP", "LDPE", "PS", "PVC"];

const GUIDE_METADATA: Record<GuideCode, GuideMeta> = {
  PET: {
    code: "PET",
    emoji: "🧴",
    tone: "bg-primary/10 text-primary border-primary/30",
    accepted: true,
    image: petImg,
  },
  HDPE: {
    code: "HDPE",
    emoji: "🧼",
    tone: "bg-leaf/15 text-foreground border-leaf/40",
    accepted: true,
    image: hdpeImg,
  },
  PP: {
    code: "PP",
    emoji: "🥤",
    tone: "bg-sunshine/20 text-foreground border-sunshine/40",
    accepted: true,
    image: ppImg,
  },
  LDPE: {
    code: "LDPE",
    emoji: "🛍️",
    tone: "bg-ocean/15 text-ocean border-ocean/30",
    accepted: true,
    image: ldpeImg,
  },
  PS: {
    code: "PS",
    emoji: "🥡",
    tone: "bg-coral/15 text-coral border-coral/30",
    accepted: true,
    image: psImg,
  },
  PVC: {
    code: "PVC",
    emoji: "🚫",
    tone: "bg-muted text-muted-foreground border-border",
    accepted: false,
  },
};

const GUIDE_COPIES: Record<Locale, Record<GuideCode, GuideCopy>> = {
  vi: {
    PET: {
      name: "PET (Số 1)",
      value: "Giá trị tái chế: Rất cao",
      features: "Thường trong suốt, nhẹ, cứng vừa phải.",
      examples: [
        "Chai nước suối (Aquafina, Lavie...)",
        "Chai nước ngọt có ga",
        "Ly nhựa trong đựng trà sữa (loại mỏng)",
        "Hộp trong suốt đựng trái cây",
      ],
      imageLabels: ["Chai nước suối", "Chai nước ngọt", "Hộp trái cây"],
    },
    HDPE: {
      name: "HDPE (Số 2)",
      value: "Giá trị tái chế: Rất cao, an toàn",
      features: "Thường đục, màu sắc đậm, cứng cáp, chịu nhiệt tốt.",
      examples: [
        "Chai sữa uống đóng chai",
        "Chai mỹ phẩm, sữa tắm, dầu gội",
        "Túi nilon dày từ siêu thị",
      ],
      imageLabels: ["Chai sữa đục", "Chai dầu gội", "Túi siêu thị"],
    },
    PP: {
      name: "PP (Số 5)",
      value: "Giá trị tái chế: Cao",
      features: "Chịu nhiệt rất tốt, hơi đục hoặc có màu, dẻo dai.",
      examples: [
        "Cốc trà sữa loại cứng (dập màng)",
        "Hộp đựng cơm take-away",
        "Nắp chai nước suối / nước ngọt",
        "Ống hút nhựa loại tốt",
      ],
      imageLabels: ["Ly trà sữa", "Hộp cơm", "Nắp chai"],
    },
    LDPE: {
      name: "LDPE (Số 4)",
      value: "Giá trị tái chế: Trung bình - Thấp",
      features: "Mỏng, mềm dẻo, dễ kéo giãn.",
      examples: [
        "Túi nilon thông thường",
        "Màng bọc thực phẩm",
        "Bao bì bọc ngoài lốc sữa, lốc nước ngọt",
      ],
      imageLabels: ["Túi nilon", "Màng bọc", "Bao bì lốc sữa"],
    },
    PS: {
      name: "PS (Số 6)",
      value: "Giá trị tái chế: Rất thấp",
      features: "Nhẹ, xốp, hoặc dạng cứng giòn dễ nứt vỡ.",
      examples: [
        "Hộp xốp đựng xôi, cơm rang, bánh bao",
        "Muỗng / nĩa / dao nhựa dùng một lần",
        "Ly nhựa mỏng dùng một lần",
      ],
      imageLabels: ["Hộp xốp", "Muỗng / nĩa", "Ly nhựa mỏng"],
    },
    PVC: {
      name: "PVC (Số 3) & OTHER (Số 7)",
      value: "Khó tái chế, chứa phụ gia phức tạp",
      features: "Bao gồm thẻ nhựa, bìa file hồ sơ, bình nước cá nhân dùng nhiều lần.",
      examples: ["Thẻ sinh viên, bìa file (PVC)", "Bình nước cá nhân (PC - Số 7)"],
    },
  },
  en: {
    PET: {
      name: "PET (No. 1)",
      value: "Recycling value: Very high",
      features: "Usually clear, lightweight, and moderately rigid.",
      examples: [
        "Water bottles (Aquafina, Lavie, etc.)",
        "Carbonated drink bottles",
        "Thin clear milk-tea cups",
        "Clear fruit containers",
      ],
      imageLabels: ["Water bottle", "Soft-drink bottle", "Fruit container"],
    },
    HDPE: {
      name: "HDPE (No. 2)",
      value: "Recycling value: Very high and safe",
      features: "Usually opaque, strongly coloured, sturdy, and heat resistant.",
      examples: [
        "Bottled milk containers",
        "Cosmetic, body-wash, and shampoo bottles",
        "Thick supermarket bags",
      ],
      imageLabels: ["Opaque milk bottle", "Shampoo bottle", "Supermarket bag"],
    },
    PP: {
      name: "PP (No. 5)",
      value: "Recycling value: High",
      features: "Very heat resistant, slightly opaque or coloured, and durable.",
      examples: [
        "Rigid sealed milk-tea cups",
        "Takeaway food containers",
        "Water and soft-drink bottle caps",
        "Sturdy plastic straws",
      ],
      imageLabels: ["Milk-tea cup", "Food container", "Bottle cap"],
    },
    LDPE: {
      name: "LDPE (No. 4)",
      value: "Recycling value: Medium to low",
      features: "Thin, soft, flexible, and easy to stretch.",
      examples: [
        "Regular plastic bags",
        "Food wrap",
        "Outer packaging for milk and soft-drink multipacks",
      ],
      imageLabels: ["Plastic bag", "Food wrap", "Multipack packaging"],
    },
    PS: {
      name: "PS (No. 6)",
      value: "Recycling value: Very low",
      features: "Lightweight, foamed, or rigid and brittle enough to crack easily.",
      examples: [
        "Foam food boxes",
        "Single-use plastic spoons, forks, and knives",
        "Thin single-use plastic cups",
      ],
      imageLabels: ["Foam container", "Plastic cutlery", "Thin plastic cup"],
    },
    PVC: {
      name: "PVC (No. 3) & OTHER (No. 7)",
      value: "Difficult to recycle; contains complex additives",
      features: "Includes plastic cards, document folders, and reusable personal water bottles.",
      examples: ["Student cards and document folders (PVC)", "Reusable water bottles (PC — No. 7)"],
    },
  },
  ko: {
    PET: {
      name: "PET (1번)",
      value: "재활용 가치: 매우 높음",
      features: "대체로 투명하고 가벼우며 적당히 단단합니다.",
      examples: [
        "생수병(Aquafina, Lavie 등)",
        "탄산음료병",
        "얇은 투명 밀크티 컵",
        "투명 과일 용기",
      ],
      imageLabels: ["생수병", "탄산음료병", "과일 용기"],
    },
    HDPE: {
      name: "HDPE (2번)",
      value: "재활용 가치: 매우 높고 안전함",
      features: "대체로 불투명하고 색이 진하며, 단단하고 내열성이 좋습니다.",
      examples: ["병 우유 용기", "화장품·바디워시·샴푸 용기", "두꺼운 마트 비닐봉지"],
      imageLabels: ["불투명 우유병", "샴푸 용기", "마트 봉지"],
    },
    PP: {
      name: "PP (5번)",
      value: "재활용 가치: 높음",
      features: "내열성이 매우 좋고, 약간 불투명하거나 색이 있으며 질깁니다.",
      examples: [
        "단단한 밀크티 컵",
        "포장 음식 용기",
        "생수·탄산음료 병뚜껑",
        "단단한 플라스틱 빨대",
      ],
      imageLabels: ["밀크티 컵", "음식 용기", "병뚜껑"],
    },
    LDPE: {
      name: "LDPE (4번)",
      value: "재활용 가치: 중간~낮음",
      features: "얇고 부드러우며 유연하고 잘 늘어납니다.",
      examples: ["일반 비닐봉지", "식품 포장 랩", "우유·음료 묶음의 겉포장"],
      imageLabels: ["비닐봉지", "포장 랩", "묶음 포장"],
    },
    PS: {
      name: "PS (6번)",
      value: "재활용 가치: 매우 낮음",
      features: "가볍고 스티로폼 형태이거나 단단하지만 쉽게 깨집니다.",
      examples: ["스티로폼 음식 용기", "일회용 플라스틱 숟가락·포크·칼", "얇은 일회용 플라스틱 컵"],
      imageLabels: ["스티로폼 용기", "플라스틱 식기", "얇은 플라스틱 컵"],
    },
    PVC: {
      name: "PVC (3번) 및 OTHER (7번)",
      value: "재활용이 어렵고 복합 첨가제가 포함됨",
      features: "플라스틱 카드, 서류 파일, 재사용 개인 물병 등이 포함됩니다.",
      examples: ["학생증·서류 파일(PVC)", "개인 물병(PC — 7번)"],
    },
  },
};

const CLEANLINESS_LABEL_KEYS = {
  CLEAN: "guideCleanDry",
  NORMAL: "guideNormal",
  DIRTY: "guideDirtyWet",
} as const;

function GuidePage() {
  const { t, locale } = useTranslation();
  const guides = GUIDE_ORDER.map((code) => ({
    ...GUIDE_METADATA[code],
    ...GUIDE_COPIES[locale][code],
  }));

  return (
    <div className="mx-auto max-w-md px-5 pt-8 animate-fade-in">
      <Link to="/app" className="text-sm font-semibold text-muted-foreground">
        {t("backHome")}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{t("guideTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("guideDescription")}</p>

      <section className="mt-6 space-y-3">
        {guides.map((g) => (
          <div key={g.code} className={`rounded-3xl border-2 p-5 ${g.tone}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{g.emoji}</span>
                <div>
                  <h3 className="font-bold">{g.name}</h3>
                  <p className="text-[11px] opacity-80">{g.value}</p>
                </div>
              </div>
              {g.accepted && g.code in PLASTIC_BASE ? (
                <span className="rounded-full bg-card px-3 py-1 text-xs font-bold text-primary ring-1 ring-primary/30">
                  {PLASTIC_BASE[g.code as PlasticType]} {t("guidePointUnit")}
                </span>
              ) : (
                <span className="rounded-full bg-card px-3 py-1 text-[10px] font-bold uppercase text-coral ring-1 ring-coral/30">
                  {t("guideNotAccepted")}
                </span>
              )}
            </div>
            <p className="mt-3 text-xs">
              <b>{t("guideDetailsLabel")}</b> <span className="opacity-80">{g.features}</span>
            </p>
            <div className="mt-2">
              <p className="text-xs font-bold">{t("guideCommonItemsLabel")}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs opacity-90">
                {g.examples.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
            {g.image && g.imageLabels && (
              <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-border bg-card">
                <img
                  src={g.image}
                  alt={`${t("guideExampleTitle")}: ${g.name}`}
                  loading="lazy"
                  width={1280}
                  height={512}
                  className="block w-full"
                />
                <div className="grid grid-cols-3 divide-x divide-border border-t border-border bg-card text-center text-[10px] font-semibold text-muted-foreground">
                  {g.imageLabels.map((l) => (
                    <span key={l} className="px-1 py-1.5 truncate">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-3xl border border-border bg-card p-5">
        <h2 className="font-bold">{t("guideQuality")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("guideQualityHelp")}</p>
        <div className="mt-4 space-y-2">
          {(["CLEAN", "NORMAL", "DIRTY"] as Cleanliness[]).map((c) => (
            <div
              key={c}
              className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm"
            >
              <span className="font-semibold">{t(CLEANLINESS_LABEL_KEYS[c])}</span>
              <span className="font-bold text-primary">×{CLEAN_MULT[c]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-gradient-to-br from-primary/15 to-leaf/10 p-5 ring-1 ring-primary/20">
        <h2 className="font-bold">{t("guideQuality")}</h2>
        <p className="mt-2 rounded-xl bg-card/70 p-3 text-center text-sm font-mono">
          {t("guideFormula")}
        </p>
        <div className="mt-4 space-y-2 text-xs">
          <p className="font-bold text-foreground">{t("guideExampleTitle")}</p>
          <div className="rounded-xl bg-card/70 p-3">
            <p>{t("guideExampleCleanDry")}</p>
            <p>{t("guideExampleDirty")}</p>
            <p className="mt-1 font-bold text-primary">{t("guideRewardFormula", { total: 34 })}</p>
          </div>
        </div>
      </section>

      <div className="h-8" />
    </div>
  );
}
