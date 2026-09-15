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
          "영어 조항을 한국어로 아직 옮기지 못했습니다. 원문 탭에서 영어를 보세요.",
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
    <div className="space-y-5 sm:space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <h1 className="font-display text-ink text-xl leading-snug sm:text-3xl">
            임상시험 규정을 검색합니다
          </h1>
          <p className="text-muted max-w-2xl text-sm leading-6">
            가이드라인과 법령에서 근거 조항을 찾습니다. 공식 해석이 아니니 출처 링크로
            원문을 확인하세요.{" "}
            <a className="text-accent underline-offset-2 hover:underline" href="/updates">
              개정 피드
            </a>
          </p>
        </div>
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
        {recentChips.length > 0 ? (
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
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
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

      {error ? (
        <Alert status="danger">
          <Alert.Content>{error}</Alert.Content>
        </Alert>
      ) : null}

      {loading ? (
        <Card className="w-full" data-testid="loading-card">
          <Card.Header>
            <Card.Title>{loadingCopy(loadingPhase(elapsedMs))}</Card.Title>
            <Card.Description>관련 조항을 고른 뒤 답을 정리합니다.</Card.Description>
          </Card.Header>
          <Card.Content className="skeleton--shimmer space-y-3 overflow-hidden">
            <Skeleton animationType="none" className="h-4 w-full rounded-lg" />
            <Skeleton animationType="none" className="h-4 w-5/6 rounded-lg" />
            <Skeleton animationType="none" className="h-4 w-4/6 rounded-lg" />
            <Skeleton animationType="none" className="h-4 w-2/3 rounded-lg" />
          </Card.Content>
        </Card>
      ) : null}

      {result && !loading ? (
        <Card className="w-full" data-testid="answer-card">
          <Card.Content>
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
              <Tabs.Panel className="pt-4" id="answer">
                <p className="text-sm leading-7 whitespace-pre-wrap">{result.answer}</p>
              </Tabs.Panel>
              <Tabs.Panel className="pt-4" id="original">
                <PassageList
                  passages={result.passages}
                  textFor={(p) => p.original}
                  empty="적재된 조항 원문이 없습니다."
                />
              </Tabs.Panel>
              {canTranslate ? (
                <Tabs.Panel className="pt-4" id="translation">
                  {translating ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full rounded-lg" />
                      <Skeleton className="h-4 w-4/5 rounded-lg" />
                    </div>
                  ) : (
                    <>
                      {translateNote ? (
                        <p className="text-muted mb-3 text-xs">{translateNote}</p>
                      ) : (
                        <p className="text-muted mb-3 text-xs">
                          영어 조항만 한국어로 옮깁니다. 한글 조문은 원문과 같습니다.
                        </p>
                      )}
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
              <p className="text-muted mt-3 text-xs">
                같은 질문의 답을 다시 보여 줍니다.
              </p>
            ) : null}
            <ul className="border-border mt-4 space-y-3 border-t pt-4">
              {result.sources.map((source) => (
                <li
                  key={`${source.url}-${source.section}`}
                  className="flex flex-col gap-1 text-sm sm:block"
                >
                  <Chip
                    className="mr-2"
                    color={source.kind === "statute" ? "accent" : "default"}
                    size="sm"
                    variant="soft"
                  >
                    {source.kind === "statute" ? "법령" : "가이드라인"}
                  </Chip>
                  <a
                    href={source.url}
                    className="text-fda break-words underline-offset-2 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.title}
                  </a>
                  <span className="text-muted"> · {source.section}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
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
    <ol className="space-y-5">
      {passages.map((passage) => (
        <li key={passage.chunkId}>
          <p className="text-muted text-xs break-words">
            {passage.kind === "statute" ? "법령" : "가이드라인"} · {passage.title} ·{" "}
            {passage.section}
          </p>
          <p className="mt-1 text-sm leading-7 break-words whitespace-pre-wrap">
            {textFor(passage)}
          </p>
        </li>
      ))}
    </ol>
  );
}
