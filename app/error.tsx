"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@heroui/react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        페이지를 불러오지 못했습니다
      </h1>
      <p className="text-muted text-sm leading-6">
        검색용 저장소가 한도를 넘겼거나 잠시 멈췄을 수 있습니다. 다시 시도하거나,
        이미 열려 있는 문서·조항 페이지를 이용해 주세요.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button size="sm" onPress={reset}>
          다시 시도
        </Button>
        <Link href="/documents" className="text-fda self-center text-sm underline">
          문서 목록
        </Link>
        <Link href="/" className="text-fda self-center text-sm underline">
          검색으로
        </Link>
      </div>
    </div>
  );
}
