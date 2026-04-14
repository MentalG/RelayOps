"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import { ArrowLeft } from "lucide-react"

import { JobStatusBadge, RequestStatusBadge } from "@/components/status-badge"
import { RequestConvertButton } from "@/components/requests/request-convert-button"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  RequestApiError,
  REQUEST_STATUS_VALUES,
  type RequestDetail,
  fetchRequestDetail,
} from "@/lib/requests"

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function renderTimeline(detail: RequestDetail) {
  const items = [
    {
      id: "created",
      title: "Request created",
      description: "Request entered the service queue.",
      timestamp: detail.createdAt,
    },
    ...(detail.updatedAt !== detail.createdAt
      ? [
          {
            id: "updated",
            title: "Request updated",
            description: "Details or status changed on the request record.",
            timestamp: detail.updatedAt,
          },
        ]
      : []),
    ...detail.auditEvents.map((event) => ({
      id: event.id,
      title: "Converted to job",
      description: event.user
        ? `${event.user.email} created job ${event.metadata?.jobId ?? ""}`.trim()
        : "A manager converted the request into a job.",
      timestamp: event.createdAt,
    })),
    ...(detail.job
      ? [
          {
            id: "job-created",
            title: "Linked job created",
            description: `${detail.job.title} started in ${detail.job.status
              .toLowerCase()
              .replaceAll("_", " ")} status.`,
            timestamp: detail.job.createdAt,
          },
        ]
      : []),
  ]

  return items.sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  )
}

export function RequestDetailPageClient() {
  const params = useParams<{ id: string | string[] }>()
  const requestId = Array.isArray(params.id) ? params.id[0] : params.id
  const hasRequestId = Boolean(requestId)
  const [detail, setDetail] = useState<RequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    if (!hasRequestId || !requestId) {
      return
    }

    const controller = new AbortController()

    fetchRequestDetail(requestId, controller.signal)
      .then((response) => {
        setDetail(response)
        setError("")
        setLoading(false)
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }

        if (error instanceof RequestApiError) {
          setError(error.message)
        } else {
          setError("Unable to load the request details right now.")
        }
        setLoading(false)
      })

    return () => controller.abort()
  }, [hasRequestId, refreshToken, requestId])

  const timeline = useMemo(
    () => (detail ? renderTimeline(detail) : []),
    [detail]
  )

  if (!hasRequestId) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/requests"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to Requests
        </Link>
        <p className="text-destructive text-sm" role="alert">
          Request ID is missing from the URL.
        </p>
      </div>
    )
  }

  if (loading && !detail) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/requests"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to Requests
        </Link>
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      </div>
    )
  }

  if (!detail) {
    return null
  }

  const canConvert = detail.status === REQUEST_STATUS_VALUES[2] && !detail.job

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/requests"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
      >
        <ArrowLeft data-icon="inline-start" />
        Back to Requests
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{detail.title}</h1>
              <RequestStatusBadge status={detail.status} />
            </div>
            <p className="text-muted-foreground max-w-3xl">
              {detail.organization.name}
            </p>
          </div>

          {canConvert ? (
            <RequestConvertButton
              requestId={detail.id}
              onConverted={() => setRefreshToken((current) => current + 1)}
            />
          ) : detail.job ? (
            <Link
              href="/jobs"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
            >
              View Jobs
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
              <CardDescription>
                Submitted {formatDateTime(detail.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="leading-6 whitespace-pre-wrap">{detail.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>
                Key milestones for this request and any linked job.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {timeline.map((item, index) => (
                <div key={item.id} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium">{item.title}</p>
                      <span className="text-muted-foreground text-sm">
                        {formatDateTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {item.description}
                    </p>
                  </div>
                  {index < timeline.length - 1 ? <Separator /> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>Who asked for the work and how it is progressing.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Organization
                </span>
                <span className="font-medium">{detail.organization.name}</span>
                <span className="text-muted-foreground text-sm">
                  {detail.organization.industry ?? "No industry noted"}
                </span>
              </div>

              <Separator />

              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Contact
                </span>
                {detail.contact ? (
                  <>
                    <span className="font-medium">
                      {detail.contact.firstName} {detail.contact.lastName}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {detail.contact.title ?? "No title noted"}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {detail.contact.email ?? "No email"}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {detail.contact.phone ?? "No phone"}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    No contact linked to this request.
                  </span>
                )}
              </div>

              <Separator />

              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Linked Job
                </span>
                {detail.job ? (
                  <div className="flex flex-col gap-2">
                    <span className="font-medium">{detail.job.title}</span>
                    <div className="flex items-center gap-2">
                      <JobStatusBadge status={detail.job.status} />
                      <span className="text-muted-foreground text-sm">
                        Created {formatDateTime(detail.job.createdAt)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    No job linked yet.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
