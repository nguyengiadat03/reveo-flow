export type HealthCheckStatus = 'pass' | 'warning' | 'fail' | 'skipped';

export interface HealthCheckItem {
  id: string;
  group: string;
  label: string;
  status: HealthCheckStatus;
  message: string;
  suggestedFix?: string;
}

export interface HealthCheckReport {
  generatedAt: string;
  durationMs: number;
  checks: HealthCheckItem[];
}
