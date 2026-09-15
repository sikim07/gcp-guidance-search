/**
 * v1 시드 코퍼스. 실제 공개 가이드라인 원문에서 조항 단위로 발췌했다.
 * 전체 PDF는 파이프라인이 재수집할 때 대체한다.
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
    text: `1.24 Source Data
All information in original records and certified copies of original records of clinical findings, observations, or other activities in a clinical trial necessary for the reconstruction and evaluation of the trial. Source data are contained in source documents (original records or certified copies).

1.64 Certified Copy
A copy (irrespective of the type of media used) of the original record that has been verified (i.e., by a dated signature or by generation through a validated process) to have the same information, including data that describe the context, content, and structure, as the original.

2.10 All clinical trial information should be recorded, handled, and stored in a way that allows its accurate reporting, interpretation and verification.

2.13 Systems with procedures that assure the quality of every aspect of the trial should be implemented. Aspects of the trial that are essential to ensure human subject protection and reliability of trial results should be the focus of such systems.

4.8 Informed Consent of Trial Subjects
4.8.1 In obtaining and documenting informed consent, the investigator should comply with the applicable regulatory requirement(s), and should adhere to GCP and to the ethical principles that have their origin in the Declaration of Helsinki. Prior to the beginning of the trial, the investigator should have the IRB/IEC's written approval/favourable opinion of the written informed consent form and any other written information to be provided to subjects.

4.8.8 The written informed consent form and any other written information to be provided to subjects should be revised whenever important new information becomes available that may be relevant to the subject's consent. Any revised written informed consent form, and written information should receive the IRB/IEC's approval/favourable opinion in advance of use. The subject or the subject's legally acceptable representative should be informed of the new information in a timely manner.

4.9 Records and Reports
4.9.0 The investigator/institution should maintain adequate and accurate source documents and trial records that include all pertinent observations on each of the site's trial subjects. Source data should be attributable, legible, contemporaneous, original, accurate, and complete. Changes to source data should be traceable, should not obscure the original entry, and should be explained if necessary (e.g., via an audit trail).

5.5 Trial Management, Data Handling, and Record Keeping
5.5.3 When using electronic trial data handling and/or remote electronic trial data systems, the sponsor should:
(a) Ensure and document that the electronic data processing system(s) conforms to the sponsor's established requirements for completeness, accuracy, reliability, and consistent intended performance (i.e., validation).
(b) Maintains SOPs for using these systems.
(c) Ensure that the systems are designed to permit data changes in such a way that the data changes are documented and that there is no deletion of entered data (i.e., maintain an audit trail, data trail, edit trail).
(d) Maintain a security system that prevents unauthorized access to the data.
(e) Maintain a list of the individuals who are authorized to make data changes.
(f) Maintain adequate backup of the data.
(g) Safeguard the blinding, if any (e.g., maintain the blinding during data entry and processing).

5.18 Monitoring
5.18.1 The purposes of trial monitoring are to verify that: (a) The rights and well-being of human subjects are protected. (b) The reported trial data are accurate, complete, and verifiable from source documents. (c) The conduct of the trial is in compliance with the currently approved protocol/amendment(s), with GCP, and with the applicable regulatory requirement(s).

5.18.3 Extent and Nature of Monitoring
The sponsor should ensure that trials are adequately monitored. The sponsor should determine the appropriate extent and nature of monitoring. The determination of the extent and nature of monitoring should be based on considerations such as the objective, purpose, design, complexity, blinding, size, and endpoints of the trial. In general there is a need for on-site monitoring, before, during, and after the trial; however in exceptional circumstances the sponsor may determine that central monitoring in conjunction with procedures such as investigators' training and meetings and extensive written guidance can assure appropriate conduct of the trial in accordance with GCP. Statistically controlled sampling may be an acceptable method for selecting the data to be verified.

ADDENDUM 5.0 Quality Management
The sponsor should implement a system to manage quality throughout all stages of the trial process. Sponsors should focus on trial activities essential to ensuring human subject protection and the reliability of trial results. Quality management includes the design of efficient clinical trial protocols, tools, and procedures for data collection and processing, as well as the collection of information that is essential to decision making. The methods used to assure and control the quality of the trial should be proportionate to the risks inherent in the trial and the importance of the information collected.

ADDENDUM 5.18.6 Monitoring Plan
The sponsor should develop a monitoring plan that is tailored to the specific human subject protection and data integrity risks of the trial. The plan should describe the monitoring strategy, the monitoring responsibilities of all the parties involved, the various monitoring methods to be used, and the rationale for their use. The plan should also emphasize the monitoring of critical data and processes. Particular attention should be given to those aspects that are not routine clinical practice and that require additional training. The monitoring plan should reference the applicable policies and procedures.
`,
  },
  {
    source: "fda-guidance",
    title: "Electronic Systems, Electronic Records, and Electronic Signatures in Clinical Investigations: Questions and Answers",
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
    title: "Informed Consent Information Sheet: Guidance for IRBs, Clinical Investigators, and Sponsors",
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
    source: "kgcp",
    title: "의약품 등의 안전에 관한 규칙 [별표 4] 의약품 임상시험 관리기준 (KGCP)",
    url: "https://www.law.go.kr/법령/의약품등의안전에관한규칙/별표4",
    issuedDate: "2025-02-21",
    category: "법령 / KGCP",
    externalId: "kgcp:011794:annex-4",
    text: `제1호 목적
이 기준은 「약사법」 및 「의약품 등의 안전에 관한 규칙」에 따라 의약품 임상시험을 과학적이고 윤리적으로 실시하기 위하여 임상시험의 계획, 실시, 모니터링, 점검, 자료의 기록 및 분석, 임상시험 결과보고 등에 관한 기준을 정함을 목적으로 한다.

제2호 정의
"임상시험 대상자"란 임상시험에 참여하여 임상시험용의약품을 투여받거나 대조군에 포함되는 사람을 말한다. "원자료"란 임상시험과 관련된 임상 소견, 관찰, 그 밖의 활동을 재구성하고 평가하는 데 필요한 원본기록 또는 인증등본을 말한다. "모니터링"이란 임상시험의 진행과정을 감독하고, 임상시험이 계획서, 표준작업지침서, 이 기준 및 관련 규정에 따라 실시·기록·보고되는지를 확인하는 활동을 말한다.

제3호 기본원칙
임상시험은 헬싱키선언에 근거한 윤리규정, 이 기준 및 관련 규정에 따라 실시하여야 한다. 시험대상자의 권리·안전·복지를 우선하여야 하며, 임상시험 자료는 정확하게 기록·처리·보관하여 결과의 신뢰성을 확보하여야 한다.

제4호 임상시험심사위원회
임상시험실시기관의 장은 임상시험심사위원회를 설치·운영하여야 한다. 심사위원회는 임상시험계획서, 시험대상자 설명서 및 동의서, 시험대상자 모집 절차 등을 심사하고 승인 또는 보완·반려를 결정한다. 심사 중인 임상시험의 실시 상황을 주기적으로 검토하여야 한다.

제5호 시험대상자 동의
시험책임자는 임상시험 실시 전에 시험대상자 또는 대리인에게 임상시험의 목적, 방법, 예상되는 이익과 위험, 개인정보 보호, 중도 탈퇴의 권리 등을 설명하고 자발적인 서면 동의를 받아야 한다. 동의는 시험대상자가 질문하고 그 답을 들을 충분한 시간을 준 뒤에 받아야 하며, 동의서에는 서명과 날짜가 기재되어야 한다.

제6호 기록 및 자료
시험책임자 및 의뢰자는 원자료와 필수문서를 보관하여야 한다. 자료의 변경은 원래의 기록이 가려지지 않도록 하고, 변경한 사람·일시·사유가 추적 가능하여야 한다. 전자기록을 사용하는 경우 시스템에 대한 검증, 접근 통제, 감사추적, 백업을 갖추어야 한다.

제7호 모니터링
의뢰자는 임상시험이 이 기준과 승인된 계획서에 따라 실시되는지를 확인하기 위하여 모니터링을 실시하여야 한다. 모니터링의 범위와 방법은 시험의 목적, 설계, 규모, 복잡도 및 시험대상자 보호와 자료 신뢰성에 대한 위험을 고려하여 정한다.

제8호 이상반응 보고
시험책임자는 중대하고 예상하지 못한 약물이상반응을 의뢰자와 심사위원회 및 식품의약품안전처장에게 이 기준과 관련 규정이 정하는 기한 내에 보고하여야 한다.
`,
  },
];
