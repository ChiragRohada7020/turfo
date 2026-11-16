import { Suspense } from "react"
import SearchPageContent from "./SearchPageContent"

export const dynamic = "force-dynamic"

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  )
}