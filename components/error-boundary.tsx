"use client"

import React from "react"

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Catches React render errors so the app shows a message instead of a black screen.
 */
export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("AppErrorBoundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-8 text-foreground"
          role="alert"
        >
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            The app hit an error so the screen didn’t go black. You can reload to try again.
          </p>
          <pre className="max-h-32 max-w-full overflow-auto rounded border border-border bg-muted p-3 text-xs">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
