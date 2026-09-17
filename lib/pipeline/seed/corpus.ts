import { loadExtractedText } from "@/lib/pipeline/seed/load-extracted";

/**
 * v1 시드 코퍼스. E6(R2)·별표 4는 `scripts/refresh-seed-corpus.ts`가
 * fetch 파이프라인으로 받은 원문을 extracted/에서 읽는다. 손으로 옮겨 적지 않는다.
 */
export type SeedDoc = {
  source: "fda-ich" | "fda-guidance" | "mfds" | "kgcp";
  title: string;
  url: string;
  pdfUrl?: string;
  issuedDate: string;
  category: string;
  externalId: string;
  text: string;
};

export const PRIORITY_TITLE_NEEDLES = [
  "e6(r3)",
  "e6(r2)",
  "good clinical practice",
  "electronic systems, electronic records, and electronic signatures",
  "electronic source data",
  "part 11",
  "risk-based approach to monitoring",
  "informed consent",
  "ich gcp",
  "임상시험 관리기준",
  "kgcp",
];

export function isPriorityTitle(title: string): boolean {
  const hay = title.toLowerCase();
  return PRIORITY_TITLE_NEEDLES.some((n) => hay.includes(n));
}

export const SEED_CORPUS: SeedDoc[] = [
  {
    source: "fda-ich",
    title: "E6(R2) Good Clinical Practice: Integrated Addendum to ICH E6(R1)",
    url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/e6r2-good-clinical-practice-integrated-addendum-ich-e6r1",
    pdfUrl: "https://www.fda.gov/media/93884/download",
    issuedDate: "2018-03-01",
    category: "ICH",
    externalId: "fda-ich:93884",
    text: loadExtractedText("e6-r2.txt"),
  },
  {
    source: "fda-guidance",
    title:
      "Electronic Systems, Electronic Records, and Electronic Signatures in Clinical Investigations: Questions and Answers",
    url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/electronic-systems-electronic-records-and-electronic-signatures-clinical-investigations-questions",
    pdfUrl: "https://www.fda.gov/media/166215/download",
    issuedDate: "2024-10-02",
    category: "Clinical Trials / Part 11",
    externalId: "fda-guidance:166215",
    text: `Q1. When does part 11 apply to electronic systems, electronic records, and electronic signatures used in clinical investigations?
Part 11 applies to records in electronic form that are created, modified, maintained, archived, retrieved, or transmitted under any records requirements set forth in FDA regulations. Part 11 also applies to electronic records submitted to FDA under the FD&C Act and the Public Health Service Act, even if such records are not specifically identified in FDA regulations. Electronic signatures that are intended to be the equivalent of handwritten signatures, initials, and other general signings required by predicate rules are subject to part 11.

Q7. What should be considered when using a risk-based approach for validation of electronic systems deployed in clinical investigations?
This guidance recommends that industry base its approach to validation on a justified and documented risk assessment. The level of validation may vary depending on the nature of the electronic systems (e.g., bespoke or customized systems, systems that are designed to be configured for the proposed use, and systems where no alterations are needed). Considerations include: the intended use of the system; the purpose and importance of the data or records; and the potential of the system to affect the rights, safety, and welfare of participants or the reliability of trial results. Validation should be applied to system functionality, configurations specific to the clinical trial protocol, customizations, data transfers, and interfaces between systems.

Q8. What is FDA's expectation for audit trails in electronic systems used in clinical investigations?
Electronic systems should be designed to generate audit trails that record changes to data. The audit trail should capture who made the change, when the change was made, and why the change was made, without obscuring the original entry. Sponsors and other regulated entities should ensure that audit trail functionality is enabled and that users cannot disable it. FDA may inspect audit trail records to reconstruct the data lifecycle.

Q10. What agreements should be in place with IT service providers?
When an IT service provider deploys or hosts electronic systems used in a clinical investigation, the regulated entity remains responsible for the reliability of the records and for compliance with applicable predicate rules and part 11. Agreements should address data ownership, access for FDA inspection, validation documentation, security, backup, and procedures for change control.

Q14. How should electronic signatures be implemented in clinical investigations?
Electronic signatures must be unique to one individual and must not be reused by, or reassigned to, anyone else. When a signature is executed, the signed record should include the printed name of the signer, the date and time of the signing, and the meaning of the signature (e.g., review, approval, responsibility). A letter of non-repudiation may be submitted to FDA to certify that the electronic signature is the legally binding equivalent of a handwritten signature.
`,
  },
  {
    source: "fda-guidance",
    title: "Electronic Source Data in Clinical Investigations",
    url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/electronic-source-data-clinical-investigations",
    pdfUrl: "https://www.fda.gov/media/85183/download",
    issuedDate: "2013-09-01",
    category: "Clinical Trials / eSource",
    externalId: "fda-guidance:85183",
    text: `III. SOURCE DATA ORIGINATORS
Each data element should have an originator. Originators can include clinical investigators and delegated study staff, devices, instruments, and other computerized systems. Sponsors should identify and specify authorized source data originators in the protocol or in another record before the investigation begins.

IV. DATA ELEMENT IDENTIFIERS
Each data element in the eCRF should be associated with an identifier that includes the originator of the data element, the date and time the data element was entered or generated, and the subject to whom the data element belongs. These identifiers facilitate examination of the audit trail by sponsors, FDA, and other authorized parties.

V. MODIFICATIONS AND CORRECTIONS
Only a clinical investigator or delegated clinical study staff should perform modifications or corrections to eCRF data. Modified and/or corrected data elements must have data element identifiers that reflect the date, time, originator and reason for the change and must not obscure the original entry (i.e., an audit trail must preserve the original value).

VI. USE OF ELECTRONIC PROMPTS, FLAGS, AND DATA QUALITY CHECKS
Electronic prompts, flags, and data quality checks (for example, to identify missing data, inconsistencies, or inadmissible values) can be used in the eCRF. These checks should not automatically replace investigator judgment. Issues associated with the data should remain visible to the investigator.

VII. INVESTIGATOR REVIEW AND RETENTION
To comply with the requirement to maintain accurate case histories, clinical investigators should review and electronically sign the completed eCRF for each subject before the data are archived or submitted to FDA. Use of electronic signatures must comply with 21 CFR part 11. Investigators must retain control of source data and provide FDA with access to the records during an inspection.

VIII. COMPUTERIZED SYSTEMS
Computerized systems used to create, modify, maintain, archive, retrieve, or transmit clinical data should be validated for their intended use, have access controls, and generate audit trails. The study protocol or data management plan should describe how source data flow into the eCRF, including direct electronic capture versus transcription.
`,
  },
  {
    source: "fda-guidance",
    title: "Part 11, Electronic Records; Electronic Signatures — Scope and Application",
    url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application",
    pdfUrl: "https://www.fda.gov/media/75414/download",
    issuedDate: "2003-08-01",
    category: "Part 11",
    externalId: "fda-guidance:75414",
    text: `I. INTRODUCTION
This guidance describes FDA's current thinking regarding the scope and application of part 11 of Title 21 of the Code of Federal Regulations; Electronic Records; Electronic Signatures (21 CFR Part 11). Part 11 applies to records in electronic form that are created, modified, maintained, archived, retrieved, or transmitted under any records requirements set forth in FDA regulations.

III.A Overall Approach to Part 11 Requirements
FDA intends to interpret the scope of part 11 narrowly and to exercise enforcement discretion with regard to certain part 11 requirements. We intend to enforce all predicate rule requirements, including predicate rule record and recordkeeping requirements.

III.B.1 Narrow Interpretation of Scope
Under this narrow interpretation, FDA considers part 11 to be applicable to the following records and signatures in electronic format: records that are required to be maintained under predicate rule requirements and that are maintained in electronic format in place of paper format; and records submitted to FDA under predicate rules in electronic format. Records that are not required to be retained under predicate rules, but that are nonetheless maintained in electronic format, are not part 11 records.

III.C.1 Validation
FDA intends to enforce predicate rule requirements for validation as they apply to electronic records and electronic signatures. We recommend that you base your approach to validation on a justified and documented risk assessment and a determination of the potential of the system to affect product quality and safety, and record integrity.

III.C.2 Audit Trail
FDA intends to exercise enforcement discretion regarding specific part 11 requirements related to computer-generated, time-stamped audit trails. Persons must still comply with all applicable predicate rule requirements related to documentation of, for example, date, time, or sequencing of events, as well as any requirements for ensuring that changes to records do not obscure previous entries.

III.C.5 Record Retention
FDA does not intend to object if you decide to archive required records in electronic format to nonelectronic media such as microfilm, microfiche, and paper, or to a standard electronic file format. Persons must still comply with all predicate rule requirements, and the records themselves and any copies of the required records should preserve their content and meaning.
`,
  },
  {
    source: "fda-guidance",
    title: "Oversight of Clinical Investigations — A Risk-Based Approach to Monitoring",
    url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/oversight-clinical-investigations-risk-based-approach-monitoring",
    pdfUrl: "https://www.fda.gov/media/116754/download",
    issuedDate: "2013-08-01",
    category: "Monitoring",
    externalId: "fda-guidance:116754",
    text: `III. A RISK-BASED APPROACH TO MONITORING
FDA encourages sponsors to tailor monitoring plans to the needs of the trial. A monitoring approach should be developed that accounts for the risks to human subjects and data quality identified for the particular clinical investigation.

IV.A Identify Critical Data and Processes to be Monitored
Sponsors should prospectively identify critical data and processes that, if inaccurate, not performed, or performed incorrectly, would threaten the protection of human subjects or the integrity of the study results. Examples of data and processes that should ordinarily be identified as critical include: verification that informed consent was obtained appropriately; adherence to protocol eligibility criteria; identification, documentation, and reporting of serious adverse events; and integrity of the randomization and blinding processes.

IV.B Determine Monitoring Methods
No single approach to monitoring is appropriate for every clinical trial. Sponsors may use a combination of centralized monitoring, on-site monitoring, and other methods. Centralized monitoring can identify missing data, inconsistent data, data outliers, and protocol deviations across sites in near real time. On-site monitoring remains important for processes that cannot be assessed remotely, including assessment of the consent process and review of source records that are not available electronically.

IV.C Factors That Influence Monitoring
Factors include the complexity of study design, types of endpoints, clinical complexity of the study population, geography, relative experience of the investigator, electronic data capture capability, and the safety of the investigational product.

V. MONITORING PLAN
The monitoring plan should describe the monitoring methods, responsibilities, and rationale. It should emphasize critical data and processes and describe how identified issues will be escalated. Routine 100% source data verification is not required and may not be the most effective use of monitoring resources.

VI. Informed Consent Monitoring
Verification of subjects' informed consent is a critical activity. Alternatives to verifying the original signature on every consent form at the site may be more effective, for example remote review of uploaded consent forms or comparison of consent dates against dates of study procedures. Privacy and confidentiality must be protected when consent documents are transferred.
`,
  },
  {
    source: "fda-guidance",
    title:
      "Informed Consent Information Sheet: Guidance for IRBs, Clinical Investigators, and Sponsors",
    url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/informed-consent-information-sheet",
    pdfUrl: "https://www.fda.gov/media/88915/download",
    issuedDate: "2023-08-15",
    category: "Informed Consent",
    externalId: "fda-guidance:88915",
    text: `II. INFORMED CONSENT REQUIREMENTS
FDA's informed consent regulations (21 CFR part 50) require that an investigator obtain the legally effective informed consent of the subject or the subject's legally authorized representative (LAR) before involving the subject in a clinical investigation, except as provided in 21 CFR 50.23 and 50.24. Informed consent shall be documented by the use of a written consent form approved by the IRB and signed and dated by the subject or the subject's LAR at the time of consent (21 CFR 50.27).

III. BASIC ELEMENTS OF INFORMED CONSENT
21 CFR 50.25(a) requires, among other elements: a statement that the study involves research; an explanation of the purposes of the research; the expected duration of the subject's participation; a description of the procedures; identification of any procedures that are experimental; a description of any reasonably foreseeable risks; a description of any benefits; a disclosure of appropriate alternative procedures; a statement describing the extent of confidentiality of records; for research involving more than minimal risk, an explanation as to whether compensation and medical treatments are available if injury occurs; contacts for questions; and a statement that participation is voluntary.

IV. DOCUMENTATION AND THE CONSENT PROCESS
Obtaining informed consent is an ongoing process, not a single event limited to a signature. The subject must be given sufficient opportunity to consider whether to participate and must have the opportunity to ask questions. The consent form must not include exculpatory language through which the subject is made to waive any of the subject's legal rights.

V. ELECTRONIC INFORMED CONSENT
Electronic informed consent may be used if the system captures the date of consent and, for FDA-regulated investigations, electronic signatures comply with 21 CFR part 11. The investigator remains responsible for ensuring that consent is legally effective. The IRB must review and approve the electronic consent materials, including any multimedia content.

VI. SPONSOR AND IRB RESPONSIBILITIES
Sponsors should ensure that investigators understand consent requirements and that monitoring includes verification that consent was obtained prior to study-specific procedures. IRBs must review the consent form and the process for obtaining consent, including how information will be presented to subjects with limited English proficiency or impaired decision-making capacity.
`,
  },
  {
    source: "mfds",
    title: "국제의약품규제조화위원회 임상시험 관리기준(ICH GCP) 민원인 안내서",
    url: "https://www.mfds.go.kr/brd/m_1060/view.do?seq=14675",
    issuedDate: "2020-07-22",
    category: "임상시험",
    externalId: "mfds:m_1060:14675",
    text: `제1장 목적
이 안내서는 ICH E6 GCP(임상시험 관리기준) 가이드라인의 개정된 사항을 중심으로 식품의약품안전처의 입장을 기술한 것이다. 민원인 안내서는 법령 또는 고시를 풀어 설명하는 자료이며, 그 자체로 대외적 구속력을 갖는 것은 아니다.

제2장 ICH E6 GCP와 KGCP의 관계
ICH E6 GCP 가이드라인은 1996년에 제정되어 임상시험의 설계, 수행, 기록, 보고를 위한 윤리적이고 과학적인 국제 표준으로 사용되고 있다. 우리나라는 이를 고시화하여 2001년부터 시행하였으며, 2011년에는 의약품 등의 안전에 관한 규칙 [별표 4] 의약품 임상시험 관리기준(KGCP)으로 정하여 임상시험을 관리하고 있다.

제3장 R2 Addendum의 핵심
ICH E6(R2) 추가사항은 시험의 규모와 복잡성 증가, 전자기록의 활용, 위험 기반 품질관리를 반영한다. 스폰서는 시험대상자 보호와 결과의 신뢰성에 필수적인 활동에 품질관리를 집중해야 하며, 모니터링 전략은 시험의 위험에 비례해야 한다.

제4장 전자자료와 필수문서
전자시스템을 사용하는 경우 검증(validation), 감사추적(audit trail), 보안, 백업, 권한 관리가 필요하다. 원본기록과 동일한 정보가  reproducing 되도록 인증등본(certified copy) 절차를 두어야 한다. eTMF를 포함한 필수문서는 시험의 수행과 평가를 재구성할 수 있도록 보관한다.

제5장 위험기반 모니터링
현장 모니터링과 중앙 모니터링을 병행할 수 있다. 모든 자료의 100% Source Data Verification이 항상 요구되는 것은 아니며, 시험대상자 보호와 자료 신뢰성에 중요한 자료·절차를 중심으로 모니터링 계획을 수립한다.

제6장 시험대상자 동의
시험책임자는 적용 가능한 규정과 GCP, 헬싱키 선언의 윤리적 원칙에 따라 시험대상자 또는 대리인의 서면 동의를 받아야 한다. 중요한 새 정보가 생기면 동의서와 서면 정보를 개정하고 IRB/IEC의 승인을 받은 뒤 사용한다.
`,
  },
  {
    source: "fda-ich",
    title: "E6(R3) Good Clinical Practice",
    url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/e6r3-good-clinical-practice",
    pdfUrl: "https://database.ich.org/sites/default/files/ICH_E6%28R3%29_Guideline.pdf",
    issuedDate: "2025-01-06",
    category: "ICH",
    externalId: "fda-ich:e6-r3",
    text: `Principles
ICH E6(R3) Good Clinical Practice sets proportionate, risk-based principles for designing, conducting, recording, and reporting trials. Quality by design means building quality into the protocol and processes rather than relying only on after-the-fact inspection. Trial procedures should be proportionate to the risks to participants and to the importance of the data for reliability of results.

Data Governance
The sponsor and investigator should implement processes that ensure data are attributable, legible, contemporaneous, original, accurate, complete, consistent, and enduring. Computerized systems used in the trial should be fit for purpose, validated for their intended use, and should maintain an audit trail of data changes.

Quality Management
The sponsor should implement a quality management system that identifies critical-to-quality factors and uses risk proportionate monitoring and review. Essential records should permit reconstruction of the trial. Monitoring, audits, and inspections focus on those critical factors rather than uniform 100% source data verification.

Annex 1 Investigator
The investigator should ensure that informed consent is obtained before trial-specific procedures, that safety information is reported according to the protocol and applicable regulations, and that essential records under the investigator's control are maintained.
`,
  },
  {
    source: "fda-guidance",
    title: "IND Safety Reporting (21 CFR 312.32) — excerpt for reporting clocks",
    url: "https://www.fda.gov/drugs/investigational-new-drug-ind-application/ind-application-reporting-safety-reports",
    issuedDate: "2012-12-19",
    category: "Safety Reporting",
    externalId: "fda-guidance:312-32-clocks",
    text: `312.32 IND safety reporting
The sponsor must notify FDA and all participating investigators in an IND safety report of potential serious risks from clinical trials or any other source.

Fatal or life-threatening unexpected suspected adverse reactions
The sponsor must notify FDA of any unexpected fatal or life-threatening suspected adverse reaction as soon as possible but in no case later than 7 calendar days after the sponsor's initial receipt of the information.

Other serious unexpected suspected adverse reactions
The sponsor must notify FDA of any serious unexpected suspected adverse reaction, and of any findings from other studies or sources that suggest a significant risk, as soon as possible but in no case later than 15 calendar days after the sponsor determines that the information qualifies for reporting.

Follow-up
The sponsor must promptly investigate all safety information and submit follow-up reports as needed to FDA and investigators.
`,
  },
  {
    source: "mfds",
    title: "임상시험 안전성 정보 보고 기한 안내 (발췌)",
    url: "https://www.mfds.go.kr/brd/m_1060/list.do",
    issuedDate: "2021-06-01",
    category: "임상시험",
    externalId: "mfds:safety-clocks",
    text: `중대한 예상하지 못한 약물이상반응 보고
시험책임자는 중대한 이상반응을 인지한 즉시 의뢰자에게 알린다. 의뢰자는 치명적이거나 생명을 위협하는 예상하지 못한 약물이상반응(SUSAR)을 최초 인지 후 7일 이내에 식품의약품안전처장에게 보고하고, 이후 8일 이내에 상세 정보를 보완한다.

그 밖의 중대한 예상하지 못한 약물이상반응
치명적·생명위협이 아닌 중대한 예상하지 못한 약물이상반응은 최초 인지 후 15일 이내에 식품의약품안전처장에게 보고한다. 보고 기한은 관련 규정과 승인된 계획서를 함께 확인한다.

SAE와 SUSAR
중대한 이상반응(SAE)은 사망, 생명위협, 입원 또는 입원기간 연장, 영구적 장애, 선천성 기형 등을 포함한다. 예상하지 못한 중대한 약물이상반응은 SUSAR로 분류하여 위의 7일·15일 기한을 적용한다.
`,
  },
];
