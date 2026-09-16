"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
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
import { ThumbsDown, ThumbsUp, X } from "lucide-react";
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
import { detectPassageLanguage, needsEnglishTranslation } from "@/lib/llm/translate";
import { normalizeQuery } from "@/lib/utils";
import type { SearchResponse } from "@/lib/types";

type Tab = "answer" | "original";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<SearchFailureKind | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [tab, setTab] = useState<Tab>("answer");
  const [translations, setTranslations] = useState<Record<string, string> | null>(null);
  const [translatedAnswer, setTranslatedAnswer] = useState<string | null>(null);
  const [translateNote, setTranslateNote] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showKorean, setShowKorean] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<"up" | "down" | null>(null);
  const [showDownForm, setShowDownForm] = useState(false);
  const [downComment, setDownComment] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);
  const recents = useSyncExternalStore(
    subscribeRecents,
    getRecentsSnapshot,
    getRecentsServerSnapshot,
  );
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
    if (!loading) return;
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
    setQuery(nextQuery);
    remember(trimmed);
    setElapsedMs(0);
    setLoading(true);
    setError(null);
    setErrorKind(null);
    setTab("answer");
    setTranslations(null);
    setTranslatedAnswer(null);
    setTranslateNote(null);
    setShowKorean(false);
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
        setResult(null);
        return;
      }
      setResult(body);
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
      setShowKorean(false);
      return;
    }
    setTranslateNote(null);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passages: body.passages,
          answer:
            detectPassageLanguage(body.answer) === "ko" ? undefined : body.answer,
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
        setShowKorean(false);
        return;
      }
      setTranslations(translated.translations ?? {});
      setTranslatedAnswer(translated.translatedAnswer ?? null);
      setShowKorean(true);
    } catch {
      setTranslateNote("번역 요청 중 네트워크 오류가 났습니다.");
      setShowKorean(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await runSearch(query);
  }

  async function toggleTranslation() {
    if (!result || !canTranslate) return;
    if (showKorean) {
      setShowKorean(false);
      return;
    }
    if (translations) {
      setShowKorean(true);
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
      setTranslations(body.translations ?? {});
      setTranslatedAnswer(body.translatedAnswer ?? null);
      setShowKorean(true);
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
                className="min-h-24 sm:min-h-28"
                placeholder="예: 전자기록 감사추적은 어떤 항목을 남겨야 하나?"
              />
            </TextField>
            <div>
              <p className="text-muted mb-2 text-xs tracking-wide">자주 찾는 질문</p>
              <div className="flex flex-wrap gap-2" data-testid="preset-list">
                {PRESET_QUERIES.map((preset) => {
                  const active = preset.id === activePresetId;
                  return (
                    <Button
                      key={preset.id}
                      type="button"
                      size="sm"
                      variant={active ? "primary" : "secondary"}
                      isDisabled={active}
                      className="preset-chip"
                      data-testid={`preset-${preset.id}`}
                      onPress={() => void runSearch(preset.query)}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            {recentChips.length > 0 ? (
              <div>
                <p className="text-muted mb-2 text-xs tracking-wide">최근 검색</p>
                <div className="flex flex-wrap gap-2" data-testid="recent-list">
                  {recentChips.map((item) => (
                    <span key={item} className="recent-chip max-w-full">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="preset-chip min-w-0"
                        onPress={() => void runSearch(item)}
                      >
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
                {submitLabel}
              </Button>
              <p className="text-muted text-xs">하루 20건까지 검색할 수 있습니다</p>
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
            searchFailureCopy(errorKind).retry
              ? () => void runSearch(query)
              : undefined
          }
        />
      ) : null}

      {loading ? <ResultSkeleton elapsedMs={elapsedMs} /> : null}

      {result && !loading ? (
        <Card className="search-sheet result-panel w-full shadow-none" data-testid="answer-card">
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
                        showKorean
                          ? (translations?.[p.chunkId] ?? p.original)
                          : p.original
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
              <p className="text-muted mt-4 text-xs">
                같은 질문의 답을 다시 보여 줍니다.
              </p>
            ) : null}
            <ul className="border-border mt-5 space-y-3 border-t pt-5">
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
                  <span className="text-muted text-xs sm:text-sm">
                    · {source.section}
                  </span>
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
                <div className="space-y-2">
                  <TextField
                    fullWidth
                    name="feedback-comment"
                    value={downComment}
                    onChange={setDownComment}
                  >
                    <Label>어떤 점이 도움이 되지 않았나요?</Label>
                    <TextArea
                      className="min-h-20"
                      data-testid="feedback-comment"
                      placeholder="빠진 조항, 엉뚱한 문서, 번역이 어색한 부분 등을 적어 주세요."
                    />
                  </TextField>
                  <Button
                    size="sm"
                    data-testid="feedback-submit"
                    isPending={feedbackBusy}
                    onPress={() => void sendFeedback("down", downComment)}
                  >
                    의견 보내기
                  </Button>
                </div>
              ) : null}
              {feedbackError ? (
                <RetryNotice
                  {...feedbackFailureCopy()}
                  busy={feedbackBusy}
                  pulseBar={feedbackBusy}
                  retryLabel="의견 다시 보내기"
                  onRetry={() =>
                    void sendFeedback(showDownForm ? "down" : "up", downComment)
                  }
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
      ) : null}
    </div>
  );
}

function StableLabel({
  sizer,
  children,
}: {
  sizer: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="stable-label">
      <span className="stable-label-sizer" aria-hidden>
        {sizer}
      </span>
      <span className="stable-label-live">{children}</span>
    </span>
  );
}

function ResultSkeleton({ elapsedMs }: { elapsedMs: number }) {
  return (
    <Card className="search-sheet result-panel w-full shadow-none" data-testid="loading-card">
      <Card.Content className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-14 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-full" />
          </div>
          <Skeleton className="h-8 w-28 shrink-0 rounded-full" />
        </div>
        <div className="space-y-3 pt-5">
          <p className="text-muted flex h-7 items-center gap-2 text-sm">
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
