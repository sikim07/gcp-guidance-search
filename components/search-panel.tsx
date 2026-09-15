"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import type { SearchResponse } from "@/lib/types";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = (await response.json()) as SearchResponse & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "검색에 실패했습니다.");
        setResult(null);
        return;
      }
      setResult(body);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3">
        <h1 className="font-display text-2xl text-ink">규정 조항을 자연어로 묻습니다</h1>
        <label htmlFor="query" className="sr-only">
          규정 조항을 자연어로 묻습니다
        </label>
        <Textarea
          id="query"
          name="query"
          placeholder="예: 전자기록 감사추적은 어떤 항목을 남겨야 하나?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "조항을 찾는 중…" : "검색"}
          </Button>
          <p className="text-xs text-ink/50">IP당 하루 20건 · 공식본이 아닙니다</p>
        </div>
      </form>

      {error ? (
        <Card className="border-seal/40 text-seal" role="alert">
          {error}
        </Card>
      ) : null}

      {loading ? (
        <Card className="animate-pulse text-ink/50">관련 조항을 대조하는 중입니다.</Card>
      ) : null}

      {result ? (
        <Card data-testid="answer-card">
          <p className="whitespace-pre-wrap text-sm leading-7 text-ink">{result.answer}</p>
          {result.cacheHit ? (
            <p className="mt-3 text-xs text-ink/40">캐시된 답변을 재사용했습니다.</p>
          ) : null}
          <ul className="mt-4 space-y-2 border-t border-rule pt-3">
            {result.sources.map((source) => (
              <li key={`${source.url}-${source.section}`} className="text-sm">
                <a
                  href={source.url}
                  className="text-fda underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.title}
                </a>
                <span className="text-ink/60"> · {source.section}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="feedback-up"
              onClick={() => sendFeedback("up")}
            >
              <ThumbsUp className="size-4" /> 도움됨
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="feedback-down"
              onClick={() => sendFeedback("down")}
            >
              <ThumbsDown className="size-4" /> 아님
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
