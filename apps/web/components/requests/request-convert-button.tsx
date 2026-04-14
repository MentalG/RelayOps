"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  RequestApiError,
  convertRequestToJob,
} from "@/lib/requests"

export function RequestConvertButton({
  requestId,
  disabled,
  onConverted,
}: {
  requestId: string
  disabled?: boolean
  onConverted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleConvert() {
    setLoading(true)
    setError("")

    try {
      await convertRequestToJob(requestId)
      onConverted()
    } catch (error) {
      if (error instanceof RequestApiError) {
        setError(error.message)
      } else {
        setError("Unable to convert the request right now.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={handleConvert} disabled={disabled || loading}>
        {loading ? "Converting…" : "Convert to Job"}
      </Button>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
