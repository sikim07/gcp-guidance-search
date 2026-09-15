"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Chip,
  Label,
  Skeleton,
  Spinner,
  Tabs,
  TextArea,
  TextField,
} from "@heroui/react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { loadingCopy, loadingPhase } from "@/lib/search/loading";
import { PRESET_QUERIES } from "@/lib/search/presets";
import {
  parseStoredRecents,
  pushRecentQuery,
  RECENT_STORAGE_KEY,
  visibleRecent,
} from "@/lib/search/recent";
import { needsEnglishTranslation } from "@/lib/llm/translate";
import type { SearchResponse } from "@/lib/types";

type Tab = "answer" | "original" | "translation";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [tab, setTab] = useState<Tab>("answer");
  const [translations, setTranslations] = useState<Record<string, string> | null>(null);
  const [translateNote, setTranslateNote] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);

  const canTranslate = useMemo(
    () => (result ? needsEnglishTranslation(result.passages) : false),
    [result],
  );

  useEffect(() => {
    setRecents(parseStoredRecents(window.localStorage.getItem(RECENT_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    if (!loading) {
      setElapsedMs(0);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - started), 200);
    return () => window.clearInterval(timer);
  }, [loading]);

  function remember(nextQuery: string) {
    const next = pushRecentQuery(nextQuery, recents);
    setRecents(next);
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  }

  async function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;
    setQuery(nextQuery);
    setLoading(true);
    setError(null);
    setTab("answer");
    setTranslations(null);
    setTranslateNote(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const body = (await response.json()) as SearchResponse & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "검색에 실패했습니다.");
        setResult(null);
        return;
      }
      setResult(body);
      remember(trimmed);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await runSearch(query);
  }

  async function openTab(next: Tab) {
    setTab(next);
    if (next !== "translation" || !result || translations) return;
    setTranslating(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passages: result.passages }),
      });
      const body = (await response.json()) as {
        translations?: Record<string, string>;
        missingKey?: boolean;
        error?: string;
      };
      if (!response.ok) {
        setTranslateNote(body.error ?? "영어 조항을 한국어로 옮기지 못했습니다.");
        return;
      }
      setTranslations(body.translations ?? {});
      if (body.missingKey) {
        setTranslateNote(
          "영어 조항을 한국어로 옮기지 못했습니다. 원문 탭에서 영어를 확인하세요.",
        );
      }
    } catch {
      setTranslateNote("번역 요청 중 네트워크 오류가 났습니다.");
    } finally {
      setTranslating(false);
    }
  }

  async function sendFeedback(rating: "up" | "down") {
    if (!result) return;
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchLogId: result.searchLogId,
        query,
        answer: result.answer,
        rating,
      }),
    });
  }

  const recentChips = visibleRecent(recents, PRESET_QUERIES);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="max-w-2xl space-y-3">
        <Chip color="accent" size="sm" variant="soft">
          조항 검색
        </Chip>
        <h1 className="font-display text-ink text-[1.65rem] leading-tight tracking-tight sm:text-4xl">
          임상시험 규정을 검색합니다
        </h1>
        <p className="text-muted max-w-xl text-sm leading-7 sm:text-[15px]">
          가이드라인과 법령에서 근거 조항을 찾습니다. 공식 해석이 아니니 출처 링크로
          원문을 확인하세요.{" "}
          <a className="text-fda underline-offset-4 hover:underline" href="/updates">
            개정 피드
          </a>
        </p>
      </section>

      <Card className="search-sheet w-full">
        <Card.Content className="space-y-4 p-4 sm:p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <TextField
              fullWidth
              name="query"
              value={query}
              onChange={setQuery}
              aria-label="임상시험 규정을 검색합니다"
            >
              <Label className="sr-only">임상시험 규정을 검색합니다</Label>
              <TextArea
                id="query"
                className="min-h-24 sm:min-h-28"
                placeholder="예: 전자기록 감사추적은 어떤 항목을 남겨야 하나?"
              />
            </TextField>
            <div>
              <p className="text-muted mb-2 text-xs tracking-wide">자주 찾는 질문</p>
              <div className="flex flex-wrap gap-2" data-testid="preset-list">
                {PRESET_QUERIES.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    size="sm"
                    variant="secondary"
                    data-testid={`preset-${preset.id}`}
                    onPress={() => void runSearch(preset.query)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            {recentChips.length > 0 ? (
              <div>
                <p className="text-muted mb-2 text-xs tracking-wide">최근 검색</p>
                <div className="flex flex-wrap gap-2" data-testid="recent-list">
                  {recentChips.map((item) => (
                    <Button
                      key={item}
                      type="button"
                      size="sm"
                      variant="ghost"
                      onPress={() => void runSearch(item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" isPending={loading} className="w-full sm:w-auto">
                {({ isPending }) => (
                  <>
                    {isPending ? <Spinner color="current" size="sm" /> : null}
                    {isPending ? loadingCopy(loadingPhase(elapsedMs)) : "검색"}
                  </>
                )}
              </Button>
              <p className="text-muted text-xs">하루 20건까지 검색할 수 있습니다</p>
            </div>
          </form>
        </Card.Content>
      </Card>

      {error ? (
        <Alert status="danger">
          <Alert.Content>{error}</Alert.Content>
        </Alert>
      ) : null}

      {loading ? <ResultSkeleton elapsedMs={elapsedMs} /> : null}

      {result && !loading ? (
        <Card className="search-sheet w-full" data-testid="answer-card">
          <Card.Content className="p-4 sm:p-6">
            <Tabs
              className="w-full"
              selectedKey={tab}
              variant="secondary"
              onSelectionChange={(key) => void openTab(String(key) as Tab)}
            >
              <Tabs.ListContainer>
                <Tabs.List aria-label="검색 결과">
                  <Tabs.Tab data-testid="tab-answer" id="answer">
                    답변
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab data-testid="tab-original" id="original">
                    원문
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  {canTranslate ? (
                    <Tabs.Tab data-testid="tab-translation" id="translation">
                      영문 → 한국어
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  ) : null}
                </Tabs.List>
              </Tabs.ListContainer>
              <Tabs.Panel className="pt-5" id="answer">
                <p className="clause-body text-sm leading-7 whitespace-pre-wrap sm:text-[15px]">
                  {result.answer}
                </p>
              </Tabs.Panel>
              <Tabs.Panel className="pt-5" id="original">
                <PassageList
                  passages={result.passages}
                  textFor={(p) => p.original}
                  empty="적재된 조항 원문이 없습니다."
                />
              </Tabs.Panel>
              {canTranslate ? (
                <Tabs.Panel className="pt-5" id="translation">
                  {translating ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full rounded-lg" />
                      <Skeleton className="h-4 w-5/6 rounded-lg" />
                      <Skeleton className="h-4 w-2/3 rounded-lg" />
                    </div>
                  ) : (
                    <>
                      {translateNote ? (
                        <Alert className="mb-4" status="warning">
                          <Alert.Content>{translateNote}</Alert.Content>
                        </Alert>
                      ) : null}
                      <PassageList
                        passages={result.passages.filter(
                          (row) => row.language === "en" || row.language === "mixed",
                        )}
                        textFor={(p) => translations?.[p.chunkId] ?? p.original}
                        empty="번역할 영어 조항이 없습니다."
                      />
                    </>
                  )}
                </Tabs.Panel>
              ) : null}
            </Tabs>
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
                  <Chip
                    color={source.kind === "statute" ? "accent" : "default"}
                    size="sm"
                    variant="soft"
                  >
                    {source.kind === "statute" ? "법령" : "가이드라인"}
                  </Chip>
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
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                data-testid="feedback-up"
                onPress={() => void sendFeedback("up")}
              >
                <ThumbsUp className="size-4" /> 도움됨
              </Button>
              <Button
                size="sm"
                variant="outline"
                data-testid="feedback-down"
                onPress={() => void sendFeedback("down")}
              >
                <ThumbsDown className="size-4" /> 아님
              </Button>
            </div>
          </Card.Content>
        </Card>
      ) : null}
    </div>
  );
}

function ResultSkeleton({ elapsedMs }: { elapsedMs: number }) {
  return (
    <Card className="search-sheet w-full" data-testid="loading-card">
      <Card.Header className="px-4 pt-4 sm:px-6 sm:pt-6">
        <Card.Title className="flex items-center gap-2 text-base">
          <Spinner size="sm" />
          {loadingCopy(loadingPhase(elapsedMs))}
        </Card.Title>
        <Card.Description>관련 조항을 고른 뒤 답을 정리합니다.</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-11/12 rounded-lg" />
          <Skeleton className="h-4 w-4/5 rounded-lg" />
          <Skeleton className="h-4 w-5/6 rounded-lg" />
          <Skeleton className="h-4 w-2/3 rounded-lg" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="h-4 w-48 rounded-lg" />
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
