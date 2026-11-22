"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  ShieldCheck, Users, Trophy, CalendarDays, MapPin, Clock3,
  Plus, Share2, ChevronRight, Search, Bell, MoreHorizontal,
  Pencil, UserPlus, Swords, Settings, X, Zap, Crown,
  ArrowUpRight, Filter, Loader2, Menu
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { LockedFeatureGate } from "@/components/LockedFeatureGate"
import { Sidebar } from "@/modules/shared/components/layout/Sidebar"
import { TopNavbar } from "@/modules/shared/components/layout/TopNavbar"
import { trpc } from "@/lib/trpc"

const SPORT_OPTIONS = [
  { value: "FOOTBALL", label: "Football" },
  { value: "CRICKET", label: "Cricket" },
  { value: "TENNIS", label: "Tennis" },
  { value: "BADMINTON", label: "Badminton" },
  { value: "BASKETBALL", label: "Basketball" },
  { value: "VOLLEYBALL", label: "Volleyball" },
  { value: "SWIMMING", label: "Swimming" },
  { value: "GYM", label: "Gym" },
  { value: "MULTI_SPORT", label: "Multi Sport" },
  { value: "PICKLEBALL", label: "Pickleball" },
  { value: "PS_GAMES", label: "PS Games" },
  { value: "TABLE_TENNIS", label: "Table Tennis" },
  { value: "OTHER", label: "Other" },
]

const ACCENTS = [
  "from-lime-500/20 to-emerald-500/5 text-orange-400",
  "from-blue-500/20 to-cyan-500/5 text-blue-400",
  "from-purple-500/20 to-violet-500/5 text-purple-400",
  "from-rose-500/20 to-pink-500/5 text-rose-400",
  "from-amber-500/20 to-orange-500/5 text-amber-400",
]

function teamColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return ACCENTS[Math.abs(hash) % ACCENTS.length]
}

function sportLabel(sport: string) {
  return sport.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}


function TeamLogo({ name, imageUrl, size = "h-14 w-14" }: { name: string; imageUrl?: string | null; size?: string }) {
  if (imageUrl) {
    return (
      <div className={cn(size, "shrink-0 overflow-hidden rounded-2xl border border-white/10")}>
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className={cn(
      size,
      "flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br font-black",
      teamColor(name)
    )}>
      {initials(name)}
    </div>
  )
}

function SectionTitle({
  title, subtitle, action
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function TeamCard({
  team,
  currentUserId,
  selected,
  onSelect,
}: {
  team: any
  currentUserId?: string
  selected: boolean
  onSelect: () => void
}) {
  const members = team.members || []
  const isCaptain = team.captainId === currentUserId

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full rounded-2xl border p-4 text-left transition-all duration-200",
        "bg-[#0c1718]/90 hover:-translate-y-0.5 hover:border-orange-400/40",
        selected
          ? "border-orange-400 bg-orange-400/[0.06] shadow-[0_0_25px_rgba(163,230,53,0.07)]"
          : "border-white/[0.09]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogo name={team.name} imageUrl={team.imageUrl} />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-white">{team.name}</h3>
            <p className="mt-1 text-xs text-slate-400">
              {sportLabel(team.sportType || "FOOTBALL")} · {members.length} Players
            </p>
          </div>
        </div>

        <Badge className={cn(
          "shrink-0 border text-[10px]",
          isCaptain
            ? "border-lime-500/20 bg-lime-500/10 text-orange-400"
            : "border-white/10 bg-white/5 text-slate-300"
        )}>
          {isCaptain ? "Captain" : "Member"}
        </Badge>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-3">
        <div className="flex -space-x-2">
          {members.slice(0, 4).map((m: any) => (
            <Avatar key={m.id} className="h-7 w-7 border-2 border-[#0c1718]">
              <AvatarImage src={m.user?.avatarUrl || ""} />
              <AvatarFallback className="bg-slate-700 text-[10px]">
                {m.user?.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
          ))}
          {members.length > 4 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0c1718] bg-slate-800 text-[9px] font-bold text-white">
              +{members.length - 4}
            </div>
          )}
        </div>

        <span className={cn(
          "flex items-center gap-1 text-xs font-semibold transition",
          selected ? "text-orange-400" : "text-slate-500 group-hover:text-orange-400"
        )}>
          View team <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}

export default function TeamsPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<"my" | "joined" | "invites">("my")

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [createSportType, setCreateSportType] = useState("FOOTBALL")
  const [createImageUrl, setCreateImageUrl] = useState("")
  const [createUploading, setCreateUploading] = useState(false)
  const [search, setSearch] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTeamName, setEditTeamName] = useState("")
  const [editSportType, setEditSportType] = useState("FOOTBALL")
  const [editImageUrl, setEditImageUrl] = useState<string | undefined>(undefined)
  const [editUploading, setEditUploading] = useState(false)
  const [memberUserId, setMemberUserId] = useState("")

  const { data: myTeamsData, isLoading: myLoading } =
    trpc.teams.myTeams.useQuery(undefined, { keepPreviousData: true })

  const myTeams = (myTeamsData || []).map((item: any) => item.team)

  const { data: discoverData, isLoading: discoverLoading } =
    trpc.teams.list.useQuery({ page: 1, limit: 6 }, { keepPreviousData: true })

  const discoverTeams = discoverData?.teams || []
  const myTeamIds = new Set(myTeams.map((t: any) => t.id))

  useEffect(() => {
    if (!selectedTeamId && myTeams.length > 0) {
      setSelectedTeamId(myTeams[0].id)
    }
  }, [myTeams, selectedTeamId])

  const createTeam = trpc.teams.create.useMutation({
    onSuccess: (data: any) => {
      setCreateOpen(false)
      setTeamName("")
      setCreateSportType("FOOTBALL")
      setCreateImageUrl("")
      if (data?.id) setSelectedTeamId(data.id)
      window.location.reload()
    },
  })

  const joinTeam = trpc.teams.join.useMutation()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return
    await createTeam.mutateAsync({ 
      name: teamName.trim(), 
      sportType: createSportType as any,
      imageUrl: createImageUrl.trim() || undefined,
    })
  }

  const updateTeam = trpc.teams.updateTeam.useMutation({
    onSuccess: () => {
      setEditOpen(false)
      window.location.reload()
    },
  })

  const addMember = trpc.teams.addMember.useMutation({
    onSuccess: () => {
      setInviteOpen(false)
      setMemberUserId("")
      window.location.reload()
    },
  })

  const handleFileUpload = async (file: File, setUploading: (v: boolean) => void, setImageUrl: (url: string) => void) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max 5MB.")
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload/team-logo", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setImageUrl(data.url)
    } catch (err: any) {
      alert(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const filteredDiscover = discoverTeams.filter(
    (team: any) => !myTeamIds.has(team.id) && team.name.toLowerCase().includes(search.toLowerCase())
  )

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06100e] px-4 text-white">
        <Card className="w-full max-w-md border-white/10 bg-[#182238] text-white">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-orange-400" />
            <h1 className="text-2xl font-bold">Sign In Required</h1>
            <p className="mt-2 text-sm text-slate-400">
              Please sign in to manage your teams.
            </p>
            <Button asChild className="mt-6 w-full bg-orange-400 font-bold text-black hover:bg-orange-300">
              <Link href="/auth/login?callbackUrl=/dashboard/teams">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const unlockStatus = trpc.tasks.isUnlocked.useQuery()
  if (unlockStatus.isLoading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>
  if (!unlockStatus.data?.unlocked) {
    return (
      <div className="min-h-screen bg-[#06100e] text-white">
        <LockedFeatureGate>{null}</LockedFeatureGate>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06100e] text-white">
      <Sidebar session={session} mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />

      {/* Main dashboard */}
      <div className="min-h-screen md:pl-[262px]">

        {/* Top navigation */}
        <TopNavbar
          onMenuClick={() => setSidebarOpen(true)}
          searchSlot={
            <div className="hidden max-w-md flex-1 md:block">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Search teams, players..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-10 rounded-full border-white/10 bg-white/[0.04] pl-11 text-sm text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          }
        />

        <div className="mx-auto max-w-[1700px] p-4 sm:p-6 xl:p-8">

          {/* Hero heading */}
          <section className="relative mb-7 overflow-hidden rounded-2xl border border-white/10">
            <div className="absolute inset-0">
              <img src="https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=1200&q=80" alt="" className="h-full w-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-[linear-gradient(110deg,#0a1b16cc,#102d1ccc_60%,#07120fcc)]" />
            </div>
            <div className="relative flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
                  <Zap className="h-4 w-4" /> Strikora Community
                </div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  My <span className="text-orange-400">Teams</span>
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Create, manage and play together. Your team, your game.
                </p>
              </div>

              <Button
                onClick={() => setCreateOpen(true)}
                className="h-11 rounded-xl bg-orange-400 px-5 font-bold text-black hover:bg-orange-300"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Team
              </Button>
            </div>
          </section>

          {/* Tabs */}
          <Tabs
            value={tab}
            onValueChange={value => setTab(value as typeof tab)}
          >
            <TabsList className="mb-6 grid h-auto w-full max-w-[560px] grid-cols-3 rounded-xl border border-white/10 bg-[#101b18] p-1">
              <TabsTrigger value="my" className="rounded-lg py-2.5 text-xs data-[state=active]:bg-orange-400 data-[state=active]:font-bold data-[state=active]:text-black sm:text-sm">
                My Teams ({myTeams.length})
              </TabsTrigger>
              <TabsTrigger value="joined" className="rounded-lg py-2.5 text-xs data-[state=active]:bg-orange-400 data-[state=active]:font-bold data-[state=active]:text-black sm:text-sm">
                Joined Teams
              </TabsTrigger>
              <TabsTrigger value="invites" className="rounded-lg py-2.5 text-xs data-[state=active]:bg-orange-400 data-[state=active]:font-bold data-[state=active]:text-black sm:text-sm">
                Invites
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my" className="mt-0">
              <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">

                {/* Left content */}
                <div className="min-w-0 space-y-9">

                  <section>
                    <SectionTitle
                      title="Your Teams"
                      subtitle="Select a team to view its details and activity."
                    />

                    {myLoading ? (
                      <div className="grid gap-3">
                        {[1, 2].map(i => (
                          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
                        ))}
                      </div>
                    ) : myTeams.length > 0 ? (
                      <div className="grid gap-3">
                        {myTeams.map((team: any) => (
                          <TeamCard
                            key={team.id}
                            team={team}
                            currentUserId={session.user?.id}
                            selected={selectedTeamId === team.id}
                            onSelect={() => setSelectedTeamId(team.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
                        <Users className="mx-auto mb-4 h-10 w-10 text-slate-500" />
                        <h3 className="font-bold">No teams yet</h3>
                        <p className="mt-2 text-sm text-slate-400">
                          Create your first team and invite your friends.
                        </p>
                        <Button
                          onClick={() => setCreateOpen(true)}
                          className="mt-5 bg-orange-400 font-bold text-black hover:bg-orange-300"
                        >
                          <Plus className="mr-2 h-4 w-4" /> Create Your Team
                        </Button>
                      </div>
                    )}
                  </section>

                  {/* Discover teams */}
                  <section>
                    <SectionTitle
                      title="Discover Teams"
                      subtitle="Find teams and players in your area."
                      action={
                        <Link href="/dashboard/teams" className="text-xs font-semibold text-orange-400 hover:text-orange-300">
                          View all <ArrowUpRight className="inline h-3.5 w-3.5" />
                        </Link>
                      }
                    />

                    <div className="mb-4 flex gap-2 md:hidden">
                      <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search teams..."
                        className="border-white/10 bg-white/[0.04] text-white"
                      />
                      <Button variant="outline" size="icon" className="shrink-0 border-white/10 bg-white/5">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>

                    {discoverLoading ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-52 animate-pulse rounded-2xl bg-white/5" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredDiscover.map((team: any) => (
                          <Card key={team.id} className="overflow-hidden rounded-2xl border-white/[0.09] bg-[#131C2E] transition hover:border-orange-400/30">
                            <CardContent className="p-4">
                              <TeamLogo name={team.name} imageUrl={team.imageUrl} size="h-12 w-12" />
                              <h3 className="mt-4 truncate font-bold">{team.name}</h3>
                              <p className="mt-1 text-xs text-slate-400">
                                {sportLabel(team.sportType || "FOOTBALL")} · {team._count?.members || 0} Players
                              </p>
                              <div className="mt-4 flex items-center justify-between">
                                <span className="text-[11px] text-slate-500">
                                  <MapPin className="mr-1 inline h-3 w-3" /> Nearby team
                                </span>
                                <Button
                                  size="sm"
                                  disabled={joinTeam.isPending}
                                  onClick={() => joinTeam.mutate({ teamId: team.id })}
                                  className="h-8 rounded-lg border border-orange-400/30 bg-orange-400/10 text-xs font-semibold text-orange-400 hover:bg-orange-400 hover:text-black"
                                >
                                  Request to Join
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                {/* Right team details panel */}
                <aside className="min-w-0 xl:sticky xl:top-[90px]">
                  <TeamOverviewPanel
                    session={session}
                    teamId={selectedTeamId || undefined}
                    setEditOpen={setEditOpen}
                    setEditTeamName={setEditTeamName}
                    setEditSportType={setEditSportType}
                    setEditImageUrl={setEditImageUrl}
                    setInviteOpen={setInviteOpen}
                  />
                </aside>
              </div>
            </TabsContent>

            <TabsContent value="joined">
              <div className="rounded-2xl border border-white/10 bg-[#131C2E] p-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-slate-500" />
                <h3 className="font-bold">Joined Teams</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Teams you are a member of will appear here.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="invites">
              <div className="rounded-2xl border border-white/10 bg-[#131C2E] p-12 text-center">
                <Trophy className="mx-auto mb-4 h-12 w-12 text-slate-500" />
                <h3 className="font-bold">Team Invitations</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Your pending team invitations will appear here.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create team dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/10 bg-[#101b18] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create Your Team</DialogTitle>
            <DialogDescription className="text-slate-400">
              Give your team a name and start playing together.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-2">
              <Label>Team Name</Label>
              <Input
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g. Pachora Strikers"
                className="border-white/10 bg-white/5 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Sport / Game</Label>
              <select
                value={createSportType}
                onChange={e => setCreateSportType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-[#131C2E] px-4 py-2.5 text-sm text-white shadow-sm transition focus:border-orange-400/50 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
              >
                {SPORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#131C2E] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Team Logo</Label>
              <div className="flex items-center gap-3">
                {createImageUrl && (
                  <img src={createImageUrl} alt="Logo preview" className="h-12 w-12 rounded-xl border border-white/10 object-cover" />
                )}
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, setCreateUploading, setCreateImageUrl)
                    }}
                  />
                  {createUploading ? "Uploading..." : "Choose file"}
                </label>
                {createImageUrl && (
                  <button type="button" className="text-xs text-slate-400 hover:text-white" onClick={() => setCreateImageUrl("")}>
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">JPEG, PNG, WebP, GIF or SVG. Max 5MB.</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="border-white/10 bg-white/5 text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!teamName.trim() || createTeam.isPending}
                className="bg-orange-400 font-bold text-black hover:bg-orange-300"
              >
                {createTeam.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" /> Create Team</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit team dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-white/10 bg-[#101b18] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Team</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update your team name.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault()
            if (!editTeamName.trim()) return
            updateTeam.mutateAsync({ teamId: selectedTeamId!, name: editTeamName.trim(), sportType: editSportType as any, imageUrl: editImageUrl?.trim() || undefined })
          }} className="space-y-5">
            <div className="space-y-2">
              <Label>Team Name</Label>
              <Input
                value={editTeamName}
                onChange={e => setEditTeamName(e.target.value)}
                placeholder="e.g. Pachora Strikers"
                className="border-white/10 bg-white/5 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Sport / Game</Label>
              <select
                value={editSportType}
                onChange={e => setEditSportType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-[#131C2E] px-4 py-2.5 text-sm text-white shadow-sm transition focus:border-orange-400/50 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
              >
                {SPORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#131C2E] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Team Logo</Label>
              <div className="flex items-center gap-3">
                {editImageUrl && (
                  <img src={editImageUrl} alt="Logo preview" className="h-12 w-12 rounded-xl border border-white/10 object-cover" />
                )}
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, setEditUploading, (url) => setEditImageUrl(url))
                    }}
                  />
                  {editUploading ? "Uploading..." : "Choose file"}
                </label>
                {editImageUrl && (
                  <button type="button" className="text-xs text-slate-400 hover:text-white" onClick={() => setEditImageUrl(undefined)}>
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">JPEG, PNG, WebP, GIF or SVG. Max 5MB.</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="border-white/10 bg-white/5 text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!editTeamName.trim() || updateTeam.isPending}
                className="bg-orange-400 font-bold text-black hover:bg-orange-300"
              >
                {updateTeam.isPending ? "Updating..." : "Update Team"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add member dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="border-white/10 bg-[#101b18] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Member</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a player to your team by their user ID.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault()
            if (!memberUserId.trim()) return
            addMember.mutateAsync({ teamId: selectedTeamId!, userId: memberUserId.trim() })
          }} className="space-y-5">
            <div className="space-y-2">
              <Label>Member User ID</Label>
              <Input
                value={memberUserId}
                onChange={e => setMemberUserId(e.target.value)}
                placeholder="e.g. user_abc123"
                className="border-white/10 bg-white/5 text-white"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                className="border-white/10 bg-white/5 text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!memberUserId.trim() || addMember.isPending}
                className="bg-orange-400 font-bold text-black hover:bg-orange-300"
              >
                {addMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TeamOverviewPanel({
  session,
  teamId,
  setEditOpen,
  setEditTeamName,
  setEditSportType,
  setEditImageUrl,
  setInviteOpen,
}: {
  session: any
  teamId?: string
  setEditOpen: (open: boolean) => void
  setEditTeamName: (name: string) => void
  setEditSportType: (sport: string) => void
  setEditImageUrl: (url: string | undefined) => void
  setInviteOpen: (open: boolean) => void
}) {
  const { data: team, isLoading } = trpc.teams.get.useQuery(
    { teamId: teamId || "" },
    { enabled: Boolean(teamId) }
  )

  useEffect(() => {
    if (team) {
      setEditTeamName(team.name)
      setEditSportType(team.sportType || "FOOTBALL")
      setEditImageUrl(team.imageUrl ?? undefined)
    }
  }, [team])

  if (!teamId) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#131C2E] p-8 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-400/10 text-orange-400">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h3 className="font-bold">Select Your Team</h3>
        <p className="mt-2 max-w-[230px] text-sm text-slate-400">
          Choose one of your teams to see members, upcoming matches and team activity.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-2xl border border-white/10 bg-[#131C2E] p-6">
        <div className="h-16 animate-pulse rounded-xl bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#131C2E] p-8 text-center">
        <p className="text-sm text-slate-400">Team not found.</p>
      </div>
    )
  }

  const members = team.members || []
  const isCaptain = team.captainId === session?.user?.id

  const totalMatches = team.bookings?.length || 0
  const wonMatches = team.bookings?.filter((b: any) => b.status === "COMPLETED").length || 0
  const winRate = totalMatches > 0 ? Math.round((wonMatches / totalMatches) * 100) : 0

  const stats = [
    { label: "Members", value: members.length, icon: Users },
    { label: "Matches", value: totalMatches, icon: CalendarDays },
    { label: "Wins", value: wonMatches, icon: Trophy },
    { label: "Win Rate", value: `${winRate}%`, icon: Zap },
  ]

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#131C2E]">

      {/* Team heading */}
      <div className="relative overflow-hidden border-b border-white/[0.07] p-5">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-orange-400/[0.06] blur-3xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <TeamLogo name={team.name} imageUrl={team.imageUrl} size="h-16 w-16" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black">{team.name}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {sportLabel(team.sportType || "FOOTBALL")} Team
              </p>
              <p className="mt-1 text-[11px] text-orange-400">
                {isCaptain ? "♛ Team Captain" : "Team Member"}
              </p>
            </div>
          </div>

          <Button size="icon" variant="outline" className="shrink-0 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" onClick={() => { setEditTeamName(team.name); setEditOpen(true) }}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        <p className="relative mt-4 text-xs leading-5 text-slate-400">
          {team.name} — Play together, practice together and compete together.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 p-4">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-orange-400" />
            </div>
            <p className="mt-2 text-xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Upcoming match */}
      <div className="px-4 pb-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">Upcoming Match</h3>
          <span className="text-xs font-semibold text-orange-400">View all →</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#13231d]">
          <div className="h-24 bg-[radial-gradient(ellipse_at_50%_100%,rgba(34,197,94,0.28),transparent_70%),linear-gradient(135deg,#142c20,#091510)]">
            <div className="flex h-full items-center justify-center">
              <Trophy className="h-9 w-9 text-orange-400/60" />
            </div>
          </div>
          <div className="p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold">Your Next Match</h4>
              <Badge className="border-lime-500/20 bg-lime-500/10 text-orange-400">5v5</Badge>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              <MapPin className="mr-1 inline h-3 w-3 text-orange-400" />
              Book a turf to schedule your next match
            </p>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="border-t border-white/[0.07] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Team Members</h3>
            <p className="mt-1 text-[11px] text-slate-500">{members.length} players in your team</p>
          </div>
          {isCaptain && (
            <Button size="sm" className="h-8 bg-orange-400 text-xs font-bold text-black hover:bg-orange-300" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3">
          {members.slice(0, 8).map((member: any) => (
            <div key={member.id} className="flex min-w-0 flex-col items-center">
              <Avatar className="h-10 w-10 border border-white/10">
                <AvatarImage src={member.user?.avatarUrl || ""} />
                <AvatarFallback className="bg-slate-700 text-xs">
                  {member.user?.name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="mt-2 w-full truncate text-center text-[10px] text-slate-300">
                {member.user?.name || "Player"}
              </span>
              {member.role === "CAPTAIN" && (
                <span className="text-[9px] font-semibold text-orange-400">Captain</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="grid grid-cols-2 gap-2 border-t border-white/[0.07] p-4">
        <Button className="h-11 bg-orange-400 text-xs font-bold text-black hover:bg-orange-300">
          <CalendarDays className="mr-2 h-4 w-4" /> Book Turf
        </Button>
        <Button variant="outline" className="h-11 border-white/10 bg-white/5 text-xs text-white hover:bg-white/10" onClick={() => {
          const link = `${window.location.origin}/teams/join/${team.inviteCode}`
          navigator.clipboard.writeText(link)
          alert("Invite link copied to clipboard")
        }}>
          <Share2 className="mr-2 h-4 w-4" /> Invite Friends
        </Button>
      </div>
    </div>
  )
}
