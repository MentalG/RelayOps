export enum Role {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  OPERATOR = "OPERATOR",
}

export enum RequestStatus {
  NEW = "NEW",
  IN_REVIEW = "IN_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CONVERTED = "CONVERTED",
}

export enum JobStatus {
  PLANNED = "PLANNED",
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  BLOCKED = "BLOCKED",
  DONE = "DONE",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
}

export const REQUEST_STATUS_TRANSITIONS: Record<
  RequestStatus,
  readonly RequestStatus[]
> = {
  [RequestStatus.NEW]: [RequestStatus.IN_REVIEW, RequestStatus.REJECTED],
  [RequestStatus.IN_REVIEW]: [RequestStatus.APPROVED, RequestStatus.REJECTED],
  [RequestStatus.APPROVED]: [RequestStatus.CONVERTED],
  [RequestStatus.REJECTED]: [],
  [RequestStatus.CONVERTED]: [],
};

export const JOB_STATUS_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  [JobStatus.PLANNED]: [JobStatus.SCHEDULED, JobStatus.BLOCKED],
  [JobStatus.SCHEDULED]: [JobStatus.IN_PROGRESS, JobStatus.BLOCKED],
  [JobStatus.IN_PROGRESS]: [JobStatus.BLOCKED, JobStatus.DONE],
  [JobStatus.BLOCKED]: [JobStatus.IN_PROGRESS],
  [JobStatus.DONE]: [],
};

type RequestStatusLike = RequestStatus | `${RequestStatus}`;
type JobStatusLike = JobStatus | `${JobStatus}`;

export function canTransitionRequestStatus(
  from: RequestStatusLike,
  to: RequestStatusLike,
) {
  const fromStatus = from as RequestStatus;
  const toStatus = to as RequestStatus;

  return (
    fromStatus === toStatus ||
    REQUEST_STATUS_TRANSITIONS[fromStatus].includes(toStatus)
  );
}

export function canTransitionJobStatus(from: JobStatusLike, to: JobStatusLike) {
  const fromStatus = from as JobStatus;
  const toStatus = to as JobStatus;

  return (
    fromStatus === toStatus || JOB_STATUS_TRANSITIONS[fromStatus].includes(toStatus)
  );
}
