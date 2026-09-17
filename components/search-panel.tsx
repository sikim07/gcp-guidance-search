"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  Button,
  Card,
  Label,
  Skeleton,
  Spinner,
  Tabs,
  TextArea,
  TextField,
} from "@heroui/react";
import { Copy, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { RetryNotice } from "@/components/retry-notice";
import {
  classifySearchFailure,
  feedbackFailureCopy,
  searchFailureCopy,
  translateFailureCopy,
  type SearchFailureKind,
} from "@/lib/search/errors";
import { loadingCopy, loadingPhase } from "@/lib/search/loading";
import { PRESET_QUERIES } from "@/lib/search/presets";
import {
  customRecents,
  getRecentsServerSnapshot,
  getRecentsSnapshot,
  pushRecentQuery,
  removeRecentQuery,
  subscribeRecents,
  writeStoredRecents,
} from "@/lib/search/recent";
import {
  getDraftServerSnapshot,
  getDraftSnapshot,
  patchStoredDraft,
  subscribeDraft,
} from "@/lib/search/draft";
import { DEFAULT_IP_DAILY } from "@/lib/cost/limits";
import { detectPassageLanguage, needsEnglishTranslation } from "@/lib/llm/translate";
import { formatCitations } from "@/lib/retrieval/cite";
import { normalizeQuery } from "@/lib/utils";
import type { SearchResponse } from "@/lib/types";

type Tab = "answer" | "original";

export function SearchPanel() {
  const draft = useSyncExternalStore(
    subscribeDraft,
    getDraftSnapshot,
    getDraftServerSnapshot,
  );
  const query = draft.query;
  const result = draft.result;
  const tab = draft.tab;
  const translations = draft.translations;
  const translatedAnswer = draft.translatedAnswer;
  const showKorean = draft.showKorean;
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<SearchFailureKind | null>(null);
  const [translateNote, setTranslateNote] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<"up" | "down" | null>(null);
  const [showDownForm, setShowDownForm] = useState(false);
  const [downComment, setDownComment] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slotOpen, setSlotOpen] = useState(() => Boolean(getDraftSnapshot().result));
  const progressRef = useRef<HTMLParagraphElement>(null);
  const recents = useSyncExternalStore(
    subscribeRecents,
    getRecentsSnapshot,
    getRecentsServerSnapshot,
  );

  function setQuery(next: string) {
    patchStoredDraft({ query: next });
  }

  function setTab(next: SetStateAction<Tab>) {
    const value = typeof next === "function" ? next(getDraftSnapshot().tab) : next;
    patchStoredDraft({ tab: value });
  }
  const canTranslate = useMemo(
    () =>
      result
        ? needsEnglishTranslation(result.passages) ||
          detectPassageLanguage(result.answer) !== "ko"
        : false,
    [result],
  );

  const activePresetId = PRESET_QUERIES.find(
    (preset) => normalizeQuery(preset.query) === normalizeQuery(query),
  )?.id;

  useEffect(() => {
    if (!loading && !result) return;
    const frame = window.requestAnimationFrame(() => setSlotOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [loading, result]);

  useEffect(() => {
    if (!loading) return;
    progressRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const started = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - started), 200);
    return () => window.clearInterval(timer);
  }, [loading]);

  function remember(nextQuery: string) {
    writeStoredRecents(pushRecentQuery(nextQuery, recents));
  }

  function forget(nextQuery: string) {
    writeStoredRecents(removeRecentQuery(nextQuery, recents));
  }

  async function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;
    patchStoredDraft({
      query: nextQuery,
      tab: "answer",
      translations: null,
      translatedAnswer: null,
      showKorean: false,
    });
    remember(trimmed);
    setElapsedMs(0);
    setLoading(true);
    setError(null);
    setErrorKind(null);
    setTranslateNote(null);
    setFeedbackSent(null);
    setShowDownForm(false);
    setDownComment("");
    setFeedbackError(false);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const body = (await response.json()) as SearchResponse & { error?: string };
      if (!response.ok) {
        setErrorKind(classifySearchFailure(response.status));
        setError(body.error ?? "검색에 실패했습니다.");
        patchStoredDraft({
          result: null,
          translations: null,
          translatedAnswer: null,
          showKorean: false,
        });
        return;
      }
      patchStoredDraft({ result: body });
      await fillKorean(body);
    } catch {
      setErrorKind("network");
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  async function fillKorean(body: SearchResponse) {
    const needs =
      needsEnglishTranslation(body.passages) ||
      detectPassageLanguage(body.answer) !== "ko";
    if (!needs) {
      patchStoredDraft({ showKorean: false });
      return;
    }
    setTranslateNote(null);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passages: body.passages,
          answer: detectPassageLanguage(body.answer) === "ko" ? undefined : body.answer,
        }),
      });
      const translated = (await response.json()) as {
        translations?: Record<string, string>;
        translatedAnswer?: string;
        error?: string;
      };
      if (!response.ok) {
        setTranslateNote(
          translated.error ??
            "지금은 번역을 할 수 없습니다. 영어 원문을 그대로 보여 줍니다.",
        );
        patchStoredDraft({ showKorean: false });
        return;
      }
      patchStoredDraft({
        translations: translated.translations ?? {},
        translatedAnswer: translated.translatedAnswer ?? null,
        showKorean: true,
      });
    } catch {
      setTranslateNote("번역 요청 중 네트워크 오류가 났습니다.");
      patchStoredDraft({ showKorean: false });
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await runSearch(query);
  }

  async function toggleTranslation() {
    if (!result || !canTranslate) return;
    if (showKorean) {
      patchStoredDraft({ showKorean: false });
      return;
    }
    if (translations) {
      patchStoredDraft({ showKorean: true });
      return;
    }
    setTranslating(true);
    setTranslateNote(null);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passages: result.passages,
          answer:
            detectPassageLanguage(result.answer) === "ko" ? undefined : result.answer,
        }),
      });
      const body = (await response.json()) as {
        translations?: Record<string, string>;
        translatedAnswer?: string;
        error?: string;
      };
      if (!response.ok) {
        setTranslateNote(
          body.error ?? "지금은 번역을 할 수 없습니다. 영어 원문을 그대로 보여 줍니다.",
        );
        return;
      }
      patchStoredDraft({
        translations: body.translations ?? {},
        translatedAnswer: body.translatedAnswer ?? null,
        showKorean: true,
      });
    } catch {
      setTranslateNote("번역 요청 중 네트워크 오류가 났습니다.");
    } finally {
      setTranslating(false);
    }
  }

  async function sendFeedback(rating: "up" | "down", comment?: string) {
    if (!result || feedbackSent || feedbackBusy) return;
    setFeedbackBusy(true);
    setFeedbackError(false);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchLogId: result.searchLogId,
          query,
          answer: result.answer,
          rating,
          comment: comment?.trim() || undefined,
        }),
      });
      if (!response.ok) {
        setFeedbackError(true);
        return;
      }
      setFeedbackSent(rating);
      setShowDownForm(false);
    } catch {
      setFeedbackError(true);
    } finally {
      setFeedbackBusy(false);
    }
  }

  const recentChips = customRecents(recents);
  const submitLabel = loading ? loadingCopy(loadingPhase(elapsedMs)) : "검색";

  async function copyCitations() {
    if (!result?.sources.length) return;
    const text = formatCitations(result.sources);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-2">
        <h1 className="text-ink text-[1.65rem] leading-tight font-semibold tracking-tight sm:text-4xl">
          임상시험 규정을 검색
        </h1>
        <p className="text-muted text-sm leading-6">
          가이드라인과 법령에서 근거 조항을 찾습니다. 공식 해석이 아닙니다.
        </p>
      </section>

      <Card className="search-sheet w-full shadow-none">
        <Card.Content className="space-y-4 p-4 sm:p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <TextField
              fullWidth
              name="query"
              value={query}
              onChange={setQuery}
              aria-label="임상시험 규정을 검색"
            >
              <Label className="sr-only">임상시험 규정을 검색</Label>
              <TextArea
                id="query"
                className="min-h-28 sm:min-h-32"
                placeholder="예: 전자기록 감사추적은 어떤 항목을 남겨야 하나?"
              />
            </TextField>
            <div>
              <p className="text-muted mb-3 text-xs tracking-wide">자주 찾는 질문</p>
              <div className="flex flex-wrap gap-3" data-testid="preset-list">
                {PRESET_QUERIES.map((preset) => {
                  const active = preset.id === activePresetId;
                  const searchingThis = loading && active;
                  return (
                    <Button
                      key={preset.id}
                      type="button"
                      size="sm"
                      variant={active ? "primary" : "secondary"}
                      isDisabled={loading || active}
                      aria-busy={searchingThis}
                      className="preset-chip gap-2"
                      data-testid={`preset-${preset.id}`}
                      data-busy={searchingThis ? "true" : "false"}
                      onPress={() => void runSearch(preset.query)}
                    >
                      {searchingThis ? <Spinner color="current" size="sm" /> : null}
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            {recentChips.length > 0 ? (
              <div>
                <p className="text-muted mb-3 text-xs tracking-wide">최근 검색</p>
                <div className="flex flex-wrap gap-3" data-testid="recent-list">
                  {recentChips.map((item) => (
                    <span key={item} className="recent-chip max-w-full">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="preset-chip min-w-0 gap-2"
                        isDisabled={loading}
                        aria-busy={loading && item === query}
                        onPress={() => void runSearch(item)}
                      >
                        {loading && item === query ? (
                          <Spinner color="current" size="sm" />
                        ) : null}
                        {item}
                      </Button>
                      <button
                        type="button"
                        className="recent-chip-remove"
                        aria-label={`${item} 지우기`}
                        data-testid="recent-remove"
                        onClick={() => forget(item)}
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="submit"
                aria-busy={loading}
                isDisabled={loading}
                data-busy={loading ? "true" : "false"}
                className="search-submit w-full justify-center gap-2 sm:w-auto"
              >
                {loading ? <Spinner color="current" size="sm" /> : null}
                <StableLabel sizer="조항 고르는 중">{submitLabel}</StableLabel>
              </Button>
              <p className="text-muted text-xs">
                하루 {DEFAULT_IP_DAILY}건의 새 검색이 가능합니다. 같은 질문은 한도에
                들어가지 않습니다.
              </p>
            </div>
          </form>
        </Card.Content>
      </Card>

      {errorKind ? (
        <RetryNotice
          {...searchFailureCopy(errorKind, error ?? undefined)}
          busy={loading}
          pulseBar={errorKind === "network" || errorKind === "server"}
          onRetry={
            searchFailureCopy(errorKind).retry ? () => void runSearch(query) : undefined
          }
        />
      ) : null}

      {loading || result ? (
        <ResultSlot
          open={slotOpen}
          contentKey={loading ? "loading" : (result?.searchLogId ?? "result")}
        >
          {loading ? (
            <ResultSkeleton elapsedMs={elapsedMs} progressRef={progressRef} />
          ) : result ? (
            <AnswerCard
              result={result}
              tab={tab}
              setTab={setTab}
              canTranslate={canTranslate}
              translating={translating}
              showKorean={showKorean}
              translatedAnswer={translatedAnswer}
              translations={translations}
              translateNote={translateNote}
              toggleTranslation={toggleTranslation}
              copied={copied}
              copyCitations={copyCitations}
              feedbackSent={feedbackSent}
              feedbackBusy={feedbackBusy}
              feedbackError={feedbackError}
              showDownForm={showDownForm}
              downComment={downComment}
              setDownComment={setDownComment}
              setShowDownForm={setShowDownForm}
              sendFeedback={sendFeedback}
            />
          ) : null}
        </ResultSlot>
      ) : null}
    </div>
  );
}

function ResultSlot({
  open,
  contentKey,
  children,
}: {
  open: boolean;
  contentKey: string;
  children: ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const previousHeight = useRef<number | null>(null);
  const firstOpen = useRef(true);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const node = innerRef.current;
    if (!node || !open) {
      firstOpen.current = true;
      previousHeight.current = null;
      setHeight(undefined);
      return;
    }

    const next = node.scrollHeight;
    if (firstOpen.current) {
      firstOpen.current = false;
      previousHeight.current = next;
      setHeight(undefined);
      return;
    }

    const from = previousHeight.current ?? node.getBoundingClientRect().height;
    previousHeight.current = next;
    if (Math.abs(from - next) < 2) return;
    setHeight(from);
    const frame = window.requestAnimationFrame(() => setHeight(next));
    return () => window.cancelAnimationFrame(frame);
  }, [open, contentKey]);

  return (
    <div className={`result-slot ${open ? "is-open" : ""}`}>
      <div
        ref={innerRef}
        className="result-slot-inner"
        style={height == null ? undefined : { height }}
        onTransitionEnd={(event) => {
          if (event.propertyName !== "height") return;
          const node = innerRef.current;
          setHeight(undefined);
          if (node) previousHeight.current = node.scrollHeight;
        }}
      >
        {children}
      </div>
    </div>
  );
}

function StableLabel({ sizer, children }: { sizer: ReactNode; children: ReactNode }) {
  return (
    <span className="stable-label">
      <span className="stable-label-sizer" aria-hidden>
        {sizer}
      </span>
      <span className="stable-label-live">{children}</span>
    </span>
  );
}

function ResultSkeleton({
  elapsedMs,
  progressRef,
}: {
  elapsedMs: number;
  progressRef: RefObject<HTMLParagraphElement | null>;
}) {
  return (
    <Card
      className="search-sheet result-panel w-full shadow-none"
      data-testid="loading-card"
    >
      <Card.Content className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-14 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-full" />
          </div>
          <Skeleton className="h-8 w-28 shrink-0 rounded-full" />
        </div>
        <div className="space-y-3 pt-5">
          <p
            ref={progressRef}
            id="search-progress"
            role="status"
            aria-live="polite"
            data-testid="search-progress"
            className="text-muted flex h-7 items-center gap-2 text-sm"
          >
            <Spinner size="sm" />
            {loadingCopy(loadingPhase(elapsedMs))}
          </p>
          <Skeleton className="h-7 w-full rounded-lg" />
          <Skeleton className="h-7 w-11/12 rounded-lg" />
          <Skeleton className="h-7 w-4/5 rounded-lg" />
          <Skeleton className="h-7 w-5/6 rounded-lg" />
          <Skeleton className="h-7 w-2/3 rounded-lg" />
        </div>
        <div className="border-border mt-5 space-y-3 border-t pt-5">
          <Skeleton className="h-4 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-2/3 rounded-lg" />
        </div>
        <div className="mt-5 flex gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>
      </Card.Content>
    </Card>
  );
}

function AnswerCard({
  result,
  tab,
  setTab,
  canTranslate,
  translating,
  showKorean,
  translatedAnswer,
  translations,
  translateNote,
  toggleTranslation,
  copied,
  copyCitations,
  feedbackSent,
  feedbackBusy,
  feedbackError,
  showDownForm,
  downComment,
  setDownComment,
  setShowDownForm,
  sendFeedback,
}: {
  result: SearchResponse;
  tab: Tab;
  setTab: Dispatch<SetStateAction<Tab>>;
  canTranslate: boolean;
  translating: boolean;
  showKorean: boolean;
  translatedAnswer: string | null;
  translations: Record<string, string> | null;
  translateNote: string | null;
  toggleTranslation: () => Promise<void>;
  copied: boolean;
  copyCitations: () => Promise<void>;
  feedbackSent: "up" | "down" | null;
  feedbackBusy: boolean;
  feedbackError: boolean;
  showDownForm: boolean;
  downComment: string;
  setDownComment: Dispatch<SetStateAction<string>>;
  setShowDownForm: Dispatch<SetStateAction<boolean>>;
  sendFeedback: (rating: "up" | "down", comment?: string) => Promise<void>;
}) {
  return (
    <Card
      className="search-sheet result-panel w-full shadow-none"
      data-testid="answer-card"
    >
      <Card.Content className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <Tabs
            className="w-full min-w-0"
            selectedKey={tab}
            variant="secondary"
            onSelectionChange={(key) => setTab(String(key) as Tab)}
          >
            <div className="flex items-center justify-between gap-2">
              <Tabs.ListContainer className="min-w-0">
                <Tabs.List aria-label="검색 결과">
                  <Tabs.Tab data-testid="tab-answer" id="answer">
                    답변
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab data-testid="tab-original" id="original">
                    원문
                    <Tabs.Indicator />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
              <Button
                size="sm"
                variant="outline"
                className={`translate-toggle shrink-0 ${canTranslate ? "" : "invisible"}`}
                data-testid="toggle-translation"
                isDisabled={!canTranslate}
                aria-busy={translating}
                onPress={() => void toggleTranslation()}
              >
                <StableLabel sizer="한국어로 보기">
                  {translating
                    ? "번역하는 중"
                    : showKorean
                      ? "원문 보기"
                      : "한국어로 보기"}
                </StableLabel>
              </Button>
            </div>
            <Tabs.Panel className="pt-5" id="answer">
              <p className="clause-body text-sm leading-7 whitespace-pre-wrap sm:text-[15px]">
                {showKorean && translatedAnswer ? translatedAnswer : result.answer}
              </p>
            </Tabs.Panel>
            <Tabs.Panel className="pt-5" id="original">
              {translating ? (
                <div className="min-h-52 space-y-3">
                  <Skeleton className="h-4 w-full rounded-lg" />
                  <Skeleton className="h-4 w-5/6 rounded-lg" />
                  <Skeleton className="h-4 w-2/3 rounded-lg" />
                </div>
              ) : (
                <PassageList
                  passages={result.passages}
                  textFor={(p) =>
                    showKorean ? (translations?.[p.chunkId] ?? p.original) : p.original
                  }
                  empty="이 질문과 맞춰 볼 조항이 없습니다. 임상시험 규정으로 다시 물어 보세요."
                />
              )}
            </Tabs.Panel>
          </Tabs>
        </div>
        {translateNote ? (
          <RetryNotice
            className="mt-4"
            {...translateFailureCopy(translateNote.includes("네트워크"))}
            retryLabel="한국어 다시 시도"
            busy={translating}
            pulseBar={translating || translateNote.includes("네트워크")}
            onRetry={() => void toggleTranslation()}
          />
        ) : null}
        {result.cacheHit ? (
          <p className="text-muted mt-4 text-xs">같은 질문의 답을 다시 보여 줍니다.</p>
        ) : null}
        <div className="border-border mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-5">
          <p className="text-muted text-xs">출처</p>
          {result.sources.length > 0 ? (
            <Button
              size="sm"
              variant="outline"
              data-testid="copy-citations"
              onPress={() => void copyCitations()}
            >
              <Copy className="size-3.5" />
              {copied ? "복사됨" : "인용 복사"}
            </Button>
          ) : null}
        </div>
        <ul className="mt-3 space-y-3">
          {result.sources.map((source) => (
            <li
              key={`${source.url}-${source.section}`}
              className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-2"
            >
              <span className="text-muted text-xs">
                {source.kind === "statute" ? "법령" : "가이드라인"}
              </span>
              <a
                href={source.url}
                className="text-fda min-w-0 text-sm break-words underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {source.title}
              </a>
              <span className="text-muted text-xs sm:text-sm">· {source.section}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="min-w-24"
              data-testid="feedback-up"
              isDisabled={Boolean(feedbackSent) || feedbackBusy}
              onPress={() => void sendFeedback("up")}
            >
              <ThumbsUp className="size-4" /> 도움됨
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-w-36"
              data-testid="feedback-down"
              isDisabled={Boolean(feedbackSent) || feedbackBusy}
              onPress={() => setShowDownForm(true)}
            >
              <ThumbsDown className="size-4" /> 도움되지 않음
            </Button>
          </div>
          {showDownForm && !feedbackSent ? (
            <div className="space-y-3">
              <TextField
                fullWidth
                className="gap-2.5"
                name="feedback-comment"
                value={downComment}
                onChange={setDownComment}
              >
                <Label>어떤 점이 도움이 되지 않았나요?</Label>
                <TextArea
                  className="min-h-24"
                  data-testid="feedback-comment"
                  placeholder="빠진 조항, 엉뚱한 문서, 번역이 어색한 부분 등을 적어 주세요."
                />
              </TextField>
              <Button
                aria-busy={feedbackBusy}
                isDisabled={feedbackBusy}
                data-busy={feedbackBusy ? "true" : "false"}
                data-testid="feedback-submit"
                className="search-submit w-full justify-center gap-2 sm:w-auto"
                onPress={() => void sendFeedback("down", downComment)}
              >
                {feedbackBusy ? <Spinner color="current" size="sm" /> : null}
                {feedbackBusy ? "의견 보내는 중" : "의견 보내기"}
              </Button>
            </div>
          ) : null}
          {feedbackError ? (
            <RetryNotice
              {...feedbackFailureCopy()}
              busy={feedbackBusy}
              pulseBar={feedbackBusy}
              retryLabel="의견 다시 보내기"
              onRetry={() => void sendFeedback(showDownForm ? "down" : "up", downComment)}
            />
          ) : null}
          {feedbackSent ? (
            <p className="text-muted text-xs" data-testid="feedback-thanks">
              의견을 반영해 검색을 다듬겠습니다. 감사합니다.
            </p>
          ) : null}
        </div>
      </Card.Content>
    </Card>
  );
}

function PassageList({
  passages,
  textFor,
  empty,
}: {
  passages: SearchResponse["passages"];
  textFor: (passage: SearchResponse["passages"][number]) => string;
  empty: string;
}) {
  if (!passages?.length) {
    return <p className="text-muted text-sm">{empty}</p>;
  }
  return (
    <ol className="space-y-4">
      {passages.map((passage) => (
        <li
          key={passage.chunkId}
          className="bg-paper/70 rounded-2xl px-4 py-3 sm:px-5 sm:py-4"
        >
          <p className="text-muted text-xs break-words">
            {passage.kind === "statute" ? "법령" : "가이드라인"} · {passage.title} ·{" "}
            {passage.section}
          </p>
          <p className="clause-body mt-2 text-sm leading-7 break-words whitespace-pre-wrap sm:text-[15px]">
            {textFor(passage)}
          </p>
        </li>
      ))}
    </ol>
  );
}
