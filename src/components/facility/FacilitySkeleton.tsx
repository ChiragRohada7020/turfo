"use client"

export function FacilitySkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 animate-pulse">
      <div className="h-[400px] bg-muted rounded-lg mb-8" />
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-8 bg-muted rounded w-1/3 mb-4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-40 bg-muted rounded" />
          <div className="h-40 bg-muted rounded" />
        </div>
        <div className="lg:col-span-1">
          <div className="h-80 bg-muted rounded sticky top-24" />
        </div>
      </div>
    </div>
  )
}