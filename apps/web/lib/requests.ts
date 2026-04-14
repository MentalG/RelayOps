const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api"

export const REQUEST_STATUS_VALUES = [
  "NEW",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "CONVERTED",
] as const

export const JOB_STATUS_VALUES = [
  "PLANNED",
  "SCHEDULED",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
] as const

export const ROLE_VALUES = ["ADMIN", "MANAGER", "OPERATOR"] as const

export type RequestStatus = (typeof REQUEST_STATUS_VALUES)[number]
export type JobStatus = (typeof JOB_STATUS_VALUES)[number]
export type Role = (typeof ROLE_VALUES)[number]

export interface RequestSummary {
  id: string
  title: string
  description: string
  status: RequestStatus
  createdAt: string
  updatedAt: string
  organization: {
    id: string
    name: string
  }
  contact: {
    id: string
    firstName: string
    lastName: string
    email: string | null
  } | null
  job: {
    id: string
    title: string
    status: JobStatus
  } | null
}

export interface RequestsListResponse {
  items: RequestSummary[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface RequestDetail extends RequestSummary {
  organization: RequestSummary["organization"] & {
    industry: string | null
    website: string | null
    phone: string | null
    notes: string | null
  }
  contact: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    title: string | null
    notes: string | null
  } | null
  job: {
    id: string
    title: string
    status: JobStatus
    createdAt: string
  } | null
  auditEvents: Array<{
    id: string
    action: string
    createdAt: string
    userId: string | null
    user: {
      id: string
      email: string
      role: Role
    } | null
    metadata:
      | {
          requestId?: string
          jobId?: string
          previousStatus?: RequestStatus
          nextStatus?: RequestStatus
          requestTitle?: string
          createdJobStatus?: JobStatus
          actorRole?: Role
        }
      | null
  }>
}

export interface RequestsQuery {
  search?: string
  status?: RequestStatus | "ALL"
  sortBy?: "createdAt" | "updatedAt" | "title" | "status"
  sortDirection?: "asc" | "desc"
  page?: number
  pageSize?: number
}

export class RequestApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "RequestApiError"
    this.status = status
  }
}

function buildQueryString(query: RequestsQuery) {
  const params = new URLSearchParams()

  if (query.search) {
    params.set("search", query.search)
  }
  if (query.status && query.status !== "ALL") {
    params.set("status", query.status)
  }
  if (query.sortBy) {
    params.set("sortBy", query.sortBy)
  }
  if (query.sortDirection) {
    params.set("sortDirection", query.sortDirection)
  }
  if (query.page) {
    params.set("page", String(query.page))
  }
  if (query.pageSize) {
    params.set("pageSize", String(query.pageSize))
  }

  const search = params.toString()
  return search ? `?${search}` : ""
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const message =
      (body as { message?: string }).message ?? "Request failed"
    throw new RequestApiError(message, response.status)
  }

  return (await response.json()) as T
}

export function fetchRequests(query: RequestsQuery, signal?: AbortSignal) {
  return apiFetch<RequestsListResponse>(`/requests${buildQueryString(query)}`, {
    signal,
  })
}

export function fetchRequestDetail(requestId: string, signal?: AbortSignal) {
  return apiFetch<RequestDetail>(`/requests/${requestId}`, { signal })
}

export function convertRequestToJob(requestId: string) {
  return apiFetch<{ request: { id: string }; job: { id: string } }>(
    `/requests/${requestId}/convert`,
    {
      method: "POST",
    }
  )
}
