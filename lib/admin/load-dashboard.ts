import type { AppStore } from "@/lib/db/types";
import { asStoreError } from "@/lib/db/supabase-errors";
import type {
  FeedbackRecord,
  RevalidationLogRecord,
  SearchLogRecord,
} from "@/lib/types";

export type AdminDashboard = {
  logs: SearchLogRecord[];
  feedback: FeedbackRecord[];
  revalidations: RevalidationLogRecord[];
  notice: string | null;
};

async function settle<T>(
  label: string,
  run: () => Promise<T>,
  fallback: T,
  errors: string[],
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    errors.push(`${label}을 읽지 못했습니다: ${asStoreError(error).message}`);
    return fallback;
  }
}

export async function loadAdminDashboard(
  store: AppStore,
): Promise<AdminDashboard> {
  const errors: string[] = [];
  const [logs, feedback, revalidations] = await Promise.all([
    settle("검색 로그", () => store.listSearchLogs(), [], errors),
    settle("피드백", () => store.listFeedback(), [], errors),
    settle("재검증 기록", () => store.listRevalidationLogs(), [], errors),
  ]);
  return {
    logs,
    feedback,
    revalidations,
    notice: errors.length ? errors.join(" ") : null,
  };
}
