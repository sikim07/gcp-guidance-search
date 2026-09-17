import type { ParsedArticle } from "@/lib/pipeline/sources/law-parser";
import { loadExtractedJson, loadExtractedText } from "@/lib/pipeline/seed/load-extracted";

const KGCP_ANNEX_META = loadExtractedJson<{
  lawId: string;
  mst: string;
  title: string;
  promulgatedDate: string;
  effectiveDate: string;
  amendmentType: string;
  articleKey: string;
  section: string;
}>("kgcp-annex-4.meta.json");

export type SeedStatute = {
  lawId: string;
  mst: string;
  title: string;
  shortTitle: string;
  promulgatedDate: string;
  effectiveDate: string;
  amendmentType: string;
  annexTitle?: string;
  articles: ParsedArticle[];
};

export const SEED_STATUTES: SeedStatute[] = [
  {
    lawId: "011357",
    mst: "seed",
    title: "개인정보 보호법",
    shortTitle: "개인정보 보호법",
    promulgatedDate: "2026-03-10",
    effectiveDate: "2026-09-11",
    amendmentType: "일부개정",
    articles: [
      {
        articleKey: "0004001",
        section: "제4조(정보주체의 권리)",
        kind: "article",
        text: `제4조(정보주체의 권리) 정보주체는 자신의 개인정보 처리와 관련하여 다음 각 호의 권리를 가진다.
1. 개인정보의 처리에 관한 정보를 제공받을 권리
2. 개인정보의 처리에 관한 동의 여부, 동의 범위 등을 선택하고 결정할 권리
3. 개인정보의 처리 여부를 확인하고 개인정보에 대한 열람 및 전송을 요구할 권리
4. 개인정보의 처리 정지, 정정·삭제 및 파기를 요구할 권리`,
      },
      {
        articleKey: "0015001",
        section: "제15조(개인정보의 수집·이용)",
        kind: "article",
        text: `제15조(개인정보의 수집·이용) 개인정보처리자는 다음 각 호의 어느 하나에 해당하는 경우에는 개인정보를 수집할 수 있으며 그 수집 목적의 범위에서 이용할 수 있다.
1. 정보주체의 동의를 받은 경우
2. 법률에 특별한 규정이 있거나 법령상 의무를 준수하기 위하여 불가피한 경우
임상시험 등에서 개인정보를 처리하는 경우에도 수집 목적, 보유 기간, 동의 범위를 명확히 해야 한다.`,
      },
      {
        articleKey: "0023001",
        section: "제23조(민감정보의 처리 제한)",
        kind: "article",
        text: `제23조(민감정보의 처리 제한) 개인정보처리자는 사상·신념, 노동조합·정당의 가입·탈퇴, 정치적 견해, 건강, 성생활 등에 관한 정보, 그 밖에 정보주체의 사생활을 현저히 침해할 우려가 있는 개인정보로서 대통령령으로 정하는 정보(이하 "민감정보"라 한다)를 처리하여서는 아니 된다. 다만, 정보주체에게 제15조제2항 각 호 또는 제17조제2항 각 호의 사항을 알리고 다른 개인정보의 처리에 대한 동의와 별도로 동의를 받은 경우와 법령에서 민감정보의 처리를 요구하거나 허용하는 경우에는 그러하지 아니하다.
임상시험 과정에서 건강정보를 다루는 경우 민감정보에 해당할 수 있으므로 별도 동의가 필요하다.`,
      },
    ],
  },
  {
    lawId: "009514",
    mst: "seed",
    title: "의료기기법",
    shortTitle: "의료기기법",
    promulgatedDate: "2026-09-15",
    effectiveDate: "2027-03-16",
    amendmentType: "일부개정",
    articles: [
      {
        articleKey: "0002001",
        section: "제2조(정의)",
        kind: "article",
        text: `제2조(정의) 이 법에서 "의료기기"란 사람이나 동물에게 단독 또는 조합하여 사용되는 기구·기계·장치·재료·소프트웨어 또는 이와 유사한 제품으로서 질병을 진단·치료·경감·처치 또는 예방할 목적으로 사용되는 제품 등을 말한다. 다만, 「약사법」에 따른 의약품과 의약외품은 제외한다.`,
      },
      {
        articleKey: "0010001",
        section: "제10조(임상시험계획의 승인 등)",
        kind: "article",
        text: `제10조(임상시험계획의 승인 등) 의료기기로 임상시험을 하려는 자는 임상시험계획서를 작성하여 식품의약품안전처장의 승인을 받아야 하며, 임상시험계획서를 변경할 때에도 또한 같다. 다만, 시판 중인 의료기기의 허가사항에 대한 임상적 효과를 관찰하거나 임상시험 대상자에게 위해를 끼칠 우려가 적은 경우 등 총리령으로 정하는 임상시험의 경우에는 그러하지 아니하다.`,
      },
    ],
  },
  {
    lawId: "001783",
    mst: "seed",
    title: "약사법",
    shortTitle: "약사법",
    promulgatedDate: "2026-03-10",
    effectiveDate: "2026-09-11",
    amendmentType: "타법개정",
    articles: [
      {
        articleKey: "0031001",
        section: "제31조(제조업 허가 등)",
        kind: "article",
        text: `제31조(제조업 허가 등) 의약품 제조를 업으로 하려는 자는 식품의약품안전처장의 허가를 받아야 한다. 품목허가를 받은 의약품이 임상시험을 거쳐 안전성·유효성이 확인된 경우에 한하여 제조·판매할 수 있다.`,
      },
      {
        articleKey: "0034001",
        section: "제34조(임상시험의 계획 승인)",
        kind: "article",
        text: `제34조(임상시험의 계획 승인) 의약품으로 임상시험을 하려는 자는 임상시험계획서를 식품의약품안전처장에게 제출하여 승인을 받아야 한다. 임상시험은 시험대상자의 안전과 권리 보호, 자료의 신뢰성이 확보되도록 실시하여야 한다.`,
      },
    ],
  },
  {
    lawId: "013572",
    mst: "seed",
    title: "첨단재생의료 및 첨단바이오의약품 안전 및 지원에 관한 법률",
    shortTitle: "첨단재생바이오법",
    promulgatedDate: "2025-11-11",
    effectiveDate: "2026-05-12",
    amendmentType: "일부개정",
    articles: [
      {
        articleKey: "0002001",
        section: "제2조(정의)",
        kind: "article",
        text: `제2조(정의) "첨단재생의료"란 사람의 신체 구조 또는 기능을 재생, 회복 또는 형성하거나 질병을 치료 또는 예방하기 위하여 인체세포등을 이용하여 실시하는 세포치료, 유전자치료, 조직공학치료 등 대통령령으로 정하는 것을 말한다. "첨단바이오의약품"이란 세포치료제, 유전자치료제 등 바이오의약품으로서 대통령령으로 정하는 것을 말한다.`,
      },
      {
        articleKey: "0003001",
        section: "제3조(다른 법률과의 관계)",
        kind: "article",
        text: `제3조(다른 법률과의 관계) 첨단재생의료에 관하여 이 법에서 규정한 것을 제외하고는 「의료법」, 「환자안전법」 및 「생명윤리 및 안전에 관한 법률」에 따른다. 첨단바이오의약품에 관하여 이 법에서 규정한 것을 제외하고는 「약사법」에 따른다.`,
      },
    ],
  },
  {
    lawId: KGCP_ANNEX_META.lawId,
    mst: KGCP_ANNEX_META.mst,
    title: KGCP_ANNEX_META.title,
    shortTitle: KGCP_ANNEX_META.title,
    promulgatedDate: KGCP_ANNEX_META.promulgatedDate,
    effectiveDate: KGCP_ANNEX_META.effectiveDate,
    amendmentType: KGCP_ANNEX_META.amendmentType,
    annexTitle: "의약품 임상시험 관리기준",
    articles: [
      {
        articleKey: "0030001",
        section: "제30조(임상시험의 실시 기준 등)",
        kind: "article",
        text: `제30조(임상시험의 실시 기준 등) 임상시험을 하려는 자는 별표 4의 의약품 임상시험 관리기준을 지켜야 한다. 시험대상자의 권리·안전·복지를 우선하여야 하며, 자료의 변경은 원래 기록이 가려지지 않도록 하고 변경한 사람·일시·사유가 추적 가능하여야 한다.`,
      },
      {
        articleKey: "annex-4",
        section: KGCP_ANNEX_META.section,
        kind: "annex",
        text: loadExtractedText("kgcp-annex-4.txt"),
      },
    ],
  },
];
