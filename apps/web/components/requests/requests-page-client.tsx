"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { RequestStatusBadge } from "@/components/status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  RequestApiError,
  REQUEST_STATUS_VALUES,
  type RequestStatus,
  type RequestSummary,
  fetchRequests,
  type RequestsListResponse,
} from "@/lib/requests"

const statusOptions: Array<{ label: string; value: RequestStatus | "ALL" }> = [
  { label: "All statuses", value: "ALL" },
  { label: "New", value: REQUEST_STATUS_VALUES[0] },
  { label: "In Review", value: REQUEST_STATUS_VALUES[1] },
  { label: "Approved", value: REQUEST_STATUS_VALUES[2] },
  { label: "Rejected", value: REQUEST_STATUS_VALUES[3] },
  { label: "Converted", value: REQUEST_STATUS_VALUES[4] },
]

const selectClassName =
  "h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function renderContact(request: RequestSummary) {
  if (!request.contact) {
    return <span className="text-muted-foreground">No contact</span>
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span>
        {request.contact.firstName} {request.contact.lastName}
      </span>
      <span className="text-muted-foreground text-xs">
        {request.contact.email ?? "No email"}
      </span>
    </div>
  )
}

export function RequestsPageClient() {
  const [draftSearch, setDraftSearch] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<RequestStatus | "ALL">("ALL")
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "title" | "status">("updatedAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<RequestsListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    fetchRequests(
      {
        search,
        status,
        sortBy,
        sortDirection,
        page,
        pageSize: 10,
      },
      controller.signal
    )
      .then((response) => {
        setData(response)
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
          setError("Unable to load requests right now.")
        }
        setLoading(false)
      })

    return () => controller.abort()
  }, [page, search, sortBy, sortDirection, status])

  const rangeLabel = useMemo(() => {
    if (!data || data.meta.total === 0) {
      return "No requests yet"
    }

    const start = (data.meta.page - 1) * data.meta.pageSize + 1
    const end = Math.min(data.meta.total, data.meta.page * data.meta.pageSize)
    return `Showing ${start}-${end} of ${data.meta.total} requests`
  }, [data])

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(draftSearch.trim())
  }

  function handleReset() {
    setDraftSearch("")
    setSearch("")
    setStatus("ALL")
    setSortBy("updatedAt")
    setSortDirection("desc")
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Requests</h1>
        <p className="text-muted-foreground max-w-3xl">
          Review inbound service requests, narrow the queue, and open the requests
          that are ready to convert into delivery work.
        </p>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-3 lg:flex-row lg:items-end"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="request-search" className="text-sm font-medium">
            Search
          </label>
          <Input
            id="request-search"
            value={draftSearch}
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="Search titles, descriptions, organizations, or contacts"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="request-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="request-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as RequestStatus | "ALL")
              setPage(1)
            }}
            className={selectClassName}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="request-sort-by" className="text-sm font-medium">
            Sort By
          </label>
          <select
            id="request-sort-by"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as typeof sortBy)
              setPage(1)
            }}
            className={selectClassName}
          >
            <option value="updatedAt">Last updated</option>
            <option value="createdAt">Created date</option>
            <option value="title">Title</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="request-sort-direction" className="text-sm font-medium">
            Direction
          </label>
          <select
            id="request-sort-direction"
            value={sortDirection}
            onChange={(event) => {
              setSortDirection(event.target.value as typeof sortDirection)
              setPage(1)
            }}
            className={selectClassName}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button type="submit">Apply</Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Request Queue</CardTitle>
          <CardDescription>{rangeLabel}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          {loading && !data ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}

          {data && data.items.length === 0 ? (
            <div className="border-border rounded-lg border border-dashed px-4 py-8 text-center">
              <p className="font-medium">No requests match those filters.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Reset the filters or seed a fresh demo dataset.
              </p>
            </div>
          ) : null}

          {data && data.items.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[120px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{request.title}</span>
                          <span className="text-muted-foreground line-clamp-2 text-xs">
                            {request.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{request.organization.name}</TableCell>
                      <TableCell>{renderContact(request)}</TableCell>
                      <TableCell>
                        <RequestStatusBadge status={request.status} />
                      </TableCell>
                      <TableCell>{formatDate(request.updatedAt)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/requests/${request.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" })
                          )}
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-sm">
                  Page {data.meta.page} of {data.meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={data.meta.page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(data.meta.totalPages, current + 1)
                      )
                    }
                    disabled={data.meta.page >= data.meta.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
