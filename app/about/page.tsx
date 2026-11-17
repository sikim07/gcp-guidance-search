import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "안내와 면책",
  description:
    "GCP 가이드라인 검색기는 비공식 실무 참고 도구입니다. ICH GCP, FDA, 식약처·KGCP 원문 링크를 붙이며 법적 자문이 아닙니다.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="max-w-2xl space-y-4 text-sm leading-7">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">안내와 면책</h1>
      <p>
        이 사이트는 필드 검증·감사추적 근거를 찾기 위해 만든 비공식 도구입니다. CRA/RA
        실무 참고용으로 공개할 예정이며, 규제 당국의 공식 창구가 아닙니다.
      </p>
      <h2 className="text-xl font-semibold">무엇을 찾나</h2>
      <p>
        전자기록 감사추적, 시험대상자 서면 동의, 위험기반 모니터링, eSource, KGCP 별표
        4, 의료기기 임상시험계획 승인처럼 CRA/RA가 필드 검증 때 자주 여는 조항을
        한국어 질문으로 고릅니다. 답은 적재된 청크만 쓰고 원문 URL을 붙입니다.
      </p>
      <h2 className="text-xl font-semibold">출처</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>FDA ICH Guidance Documents</li>
        <li>FDA Clinical Trials Guidance Documents</li>
        <li>식약처 민원인안내서 게시판 (m_1060)</li>
        <li>
          국가법령정보센터 현행법령 — 개인정보 보호법, 의료기기법, 약사법,
          첨단재생바이오법, 의약품 등의 안전에 관한 규칙 (별표 4 KGCP)
        </li>
      </ul>
      <p>
        답변은 적재된 청크에만 근거합니다. 항상 원문 PDF/법령 본문을 확인하세요. 스캔본
        PDF는 v1에서 OCR하지 않으며, 본문 미추출로 표시됩니다.
      </p>
      <h2 id="analytics" className="text-xl font-semibold scroll-mt-24">
        방문 통계와 쿠키
      </h2>
      <p>
        서비스 개선을 위해 Google Analytics 4로 페이지 조회·검색·버튼 사용 통계를 수집할
        수 있습니다. 동의는 이 브라우저의 저장소에만 남으며, 거부하면 GA 스크립트를
        불러오지 않습니다. 검색어 원문·의견 본문은 Analytics로 보내지 않습니다.
      </p>
      <p>
        광고(Google AdSense)는 분석 동의와 별도로 동작하며, 현재는 광고 스크립트에 대한
        동의 게이트가 없습니다. 거부해도 AdSense는 로드될 수 있습니다.
      </p>
    </article>
  );
}
