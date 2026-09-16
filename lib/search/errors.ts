export type SearchFailureKind = "network" | "limit" | "invalid" | "server";

export function classifySearchFailure(status?: number): SearchFailureKind {
  if (!status) return "network";
  if (status === 429) return "limit";
  if (status === 400) return "invalid";
  return "server";
}

export function searchFailureCopy(kind: SearchFailureKind, fallback?: string): {
  title: string;
  detail: string;
  retry: boolean;
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
      detail: fallback ?? "내일 다시 열어 주세요. 한도는 IP당 하루 20건입니다.",
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
  return {
    title: "지금은 조항을 가져오지 못했습니다",
    detail: fallback ?? "잠시 후 다시 찾아보면 됩니다.",
    retry: true,
  };
}

export function translateFailureCopy(network: boolean): { title: string; detail: string } {
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
