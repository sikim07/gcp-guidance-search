export const PRESET_QUERIES = [
  {
    id: "audit-trail",
    label: "전자기록 감사추적",
    query: "전자기록 감사추적은 어떤 항목을 남겨야 하나?",
  },
  {
    id: "consent",
    label: "시험대상자 동의",
    query: "시험대상자 서면 동의는 어떻게 받나?",
  },
  {
    id: "monitoring",
    label: "모니터링 범위",
    query: "임상시험 모니터링 범위는 어떻게 정하나?",
  },
  {
    id: "sensitive",
    label: "민감정보 동의",
    query: "건강정보 등 민감정보는 별도 동의가 필요한가?",
  },
  {
    id: "device-trial",
    label: "의료기기 임상시험 승인",
    query: "의료기기 임상시험계획은 식약처 승인이 필요한가?",
  },
] as const;
