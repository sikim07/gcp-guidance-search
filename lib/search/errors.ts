import { DEFAULT_IP_DAILY } from "@/lib/cost/limits";

export type SearchFailureKind =
  | "network"
  | "limit"
  | "invalid"
  | "unavailable"
  | "server";

export function classifySearchFailure(
  status?: number,
  code?: string | null,
): SearchFailureKind {
  if (code === "store_unavailable" || status === 503) return "unavailable";
  if (!status) return "network";
  if (status === 429) return "limit";
  if (status === 400) return "invalid";
  return "server";
}

export function searchFailureCopy(
  kind: SearchFailureKind,
  fallback?: string,
): {
  title: string;
  detail: string;
  retry: boolean;
  documentsHref?: string;
} {
  if (kind === "network") {
    return {
      title: "연결이 잠깐 끊겼습니다",
      detail: "같은 질문을 다시 보내 조항을 찾아볼 수 있습니다.",
      retry: true,
    };
  }
  if (kind === "limit") {
    return {
      title: "오늘은 검색 한도에 닿았습니다",
      detail:
        fallback ??
        `내일 다시 열어 주세요. 한도는 IP당 하루 ${DEFAULT_IP_DAILY}건입니다. 같은 질문은 다시 열 수 있습니다.`,
      retry: false,
    };
  }
  if (kind === "invalid") {
    return {
      title: "질문을 조금 더 적어 주세요",
      detail: fallback ?? "두 글자 이상이면 검색할 수 있습니다.",
      retry: false,
    };
  }
  if (kind === "unavailable") {
    return {
      title: "검색 저장소를 잠시 쓸 수 없습니다",
      detail:
        fallback ??
        "사용량 한도나 연결 문제일 수 있습니다. 잠시 후 다시 시도하거나, 문서 목록에서 조항을 직접 열어 보세요.",
      retry: true,
      documentsHref: "/documents",
    };
  }
  return {
    title: "지금은 조항을 가져오지 못했습니다",
    detail: fallback ?? "잠시 후 다시 찾아보면 됩니다.",
    retry: true,
  };
}

export function translateFailureCopy(network: boolean): {
  title: string;
  detail: string;
} {
  if (network) {
    return {
      title: "한국어로 옮기는 중 연결이 끊겼습니다",
      detail: "영어 원문을 보여 줍니다. 다시 시도하면 한국어로 바꿉니다.",
    };
  }
  return {
    title: "지금은 한국어로 옮기지 못했습니다",
    detail: "영어 원문을 그대로 보여 줍니다. 원문 링크로 조항을 확인해 주세요.",
  };
}

export function feedbackFailureCopy(): { title: string; detail: string } {
  return {
    title: "의견을 아직 저장하지 못했습니다",
    detail: "연결을 확인한 뒤 다시 보내 주세요. 시트에 남아야 다음에 반영할 수 있습니다.",
  };
}
