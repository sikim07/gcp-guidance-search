"use client";

import Link from "next/link";
import { Button } from "@heroui/react";

export function RetryNotice({
  title,
  detail,
  onRetry,
  retryLabel = "다시 시도",
  busy = false,
  pulseBar = false,
  documentsHref,
  className,
}: {
  title: string;
  detail: string;
  onRetry?: () => void;
  retryLabel?: string;
  busy?: boolean;
  pulseBar?: boolean;
  documentsHref?: string;
  className?: string;
}) {
  return (
    <div
      className={["retry-notice", className].filter(Boolean).join(" ")}
      data-testid="retry-notice"
      data-pulse={pulseBar ? "true" : "false"}
      role="alert"
    >
      <div
        className={pulseBar ? "retry-notice-bar" : "retry-notice-rule"}
        aria-hidden
      />
      <p className="text-ink text-sm font-medium">{title}</p>
      <p className="text-muted mt-1 text-sm leading-6">{detail}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {onRetry ? (
          <Button
            size="sm"
            isPending={busy}
            data-testid="retry-action"
            onPress={onRetry}
          >
            {retryLabel}
          </Button>
        ) : null}
        {documentsHref ? (
          <Link
            href={documentsHref}
            className="text-fda text-sm underline underline-offset-4"
            data-testid="retry-documents"
          >
            문서 목록 열기
          </Link>
        ) : null}
      </div>
    </div>
  );
}
