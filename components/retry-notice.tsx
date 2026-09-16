"use client";

import { Button } from "@heroui/react";

export function RetryNotice({
  title,
  detail,
  onRetry,
  retryLabel = "다시 시도",
  busy = false,
  className,
}: {
  title: string;
  detail: string;
  onRetry?: () => void;
  retryLabel?: string;
  busy?: boolean;
  className?: string;
}) {
  return (
    <div
      className={["retry-notice", className].filter(Boolean).join(" ")}
      data-testid="retry-notice"
      role="alert"
    >
      <div className="retry-notice-bar" aria-hidden />
      <p className="text-ink text-sm font-medium">{title}</p>
      <p className="text-muted mt-1 text-sm leading-6">{detail}</p>
      {onRetry ? (
        <Button
          className="mt-3"
          size="sm"
          isPending={busy}
          data-testid="retry-action"
          onPress={onRetry}
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
