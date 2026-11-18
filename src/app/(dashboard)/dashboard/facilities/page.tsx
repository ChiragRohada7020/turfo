"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Building2, MapPin, Users, CalendarDays, Edit, Trash2, Eye } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Sidebar } from "@/components/layout/Sidebar"
import { trpc } from "@/lib/trpc"

export default function FacilitiesPage() {
  const { data: session, status } = useSession()
  const { data: facilities, isLoading } = trpc.facilities.myFacilities.useQuery()

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <Building2 className="w-12 h-12 text-lime-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to manage facilities.</p>
          <Link href="/auth/login?callbackUrl=/dashboard/facilities" className="mt-6 w-full">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="pt-14 md:pt-0 md:pl-[262px]">
        <div className="max-w-[1800px] mx-auto p-4 sm:p-6 xl:p-7">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Facilities</h1>
            <p className="mt-1 text-sm text-slate-400">Manage your sports facilities</p>
          </div>
          <Link href="/dashboard/facilities/new">
            <Button className="bg-lime-400 font-bold text-black hover:bg-lime-300">
              <Plus className="h-4 w-4 mr-2" /> Add Facility
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-[#111a22] border-white/10 animate-pulse">
                <div className="h-40 bg-white/5" />
                <CardContent className="p-4">
                  <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : facilities && facilities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map((facility: any) => (
              <Card key={facility.id} className="bg-[#111a22] border-white/10 overflow-hidden hover:border-lime-400/30 transition-colors">
                <div className="relative h-40 overflow-hidden bg-[#1a3027]">
                  <Image src={facility.images?.[0] || "/placeholder.svg"} alt={facility.name} fill sizes="300px" className="object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge className={facility.isActive ? "bg-green-500/15 text-green-300 border-green-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"}>
                      {facility.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg">{facility.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    <MapPin className="h-3 w-3 mr-1 inline" />
                    {facility.city}, {facility.state}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {facility._count?.courts || 0} courts
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {facility._count?.bookings || 0} bookings
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link href={`/facility/${facility.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    </Link>
                    <Link href={`/dashboard/facilities/${facility.id}/edit`} className="flex-1">
                      <Button size="sm" className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No facilities yet</h3>
            <p className="text-slate-400 mb-6">Add your first sports facility to start earning</p>
            <Link href="/dashboard/facilities/new">
              <Button className="bg-lime-400 font-bold text-black hover:bg-lime-300">
                <Plus className="h-4 w-4 mr-2" /> Add Facility
              </Button>
            </Link>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
