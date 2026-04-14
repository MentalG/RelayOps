import { Badge } from "@/components/ui/badge"
import type { JobStatus, RequestStatus } from "@/lib/requests"

const requestStatusClasses: Record<RequestStatus, string> = {
  NEW: "border-transparent bg-muted text-foreground",
  IN_REVIEW:
    "border-transparent bg-secondary text-secondary-foreground",
  APPROVED:
    "border-transparent bg-primary text-primary-foreground",
  REJECTED:
    "border-destructive/20 bg-destructive/10 text-destructive",
  CONVERTED:
    "border-transparent bg-foreground text-background",
}

const jobStatusClasses: Record<JobStatus, string> = {
  PLANNED: "border-transparent bg-muted text-foreground",
  SCHEDULED:
    "border-transparent bg-secondary text-secondary-foreground",
  IN_PROGRESS:
    "border-transparent bg-primary text-primary-foreground",
  BLOCKED:
    "border-destructive/20 bg-destructive/10 text-destructive",
  DONE: "border-transparent bg-foreground text-background",
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge className={requestStatusClasses[status]}>{formatStatus(status)}</Badge>
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge className={jobStatusClasses[status]}>{formatStatus(status)}</Badge>
}
