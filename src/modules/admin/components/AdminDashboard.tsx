"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Users, Building, Calendar, DollarSign, Settings, Shield, TrendingUp, AlertTriangle } from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { Role, BookingStatus, PaymentStatus, PayoutStatus } from "@prisma/client"

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState("overview")
  const isAdmin = session?.user?.role === "ADMIN"

  if (status === "loading") {
    return <AdminSkeleton />
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="max-w-md w-full mx-auto">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">Admin access required</p>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { data: usersData, isLoading: usersLoading } = trpc.admin.users.useQuery({ limit: 10 })
  const { data: facilitiesData, isLoading: facilitiesLoading } = trpc.admin.facilities.useQuery({ limit: 10 })
  const { data: analytics } = trpc.admin.analytics.useQuery()
  const { data: payoutsData, isLoading: payoutsLoading } = trpc.admin.payouts.useQuery({ limit: 10 })
  const { data: pendingOwnersData, isLoading: pendingOwnersLoading } = trpc.admin.pendingOwners.useQuery({ limit: 20 })
  const utils = trpc.useUtils()
  const verifyOwner = trpc.admin.verifyOwner.useMutation({
    onSuccess: () => {
      void utils.admin.pendingOwners.invalidate()
    },
  })

  const users = usersData?.users || []
  const pendingOwners = pendingOwnersData?.users || []
  const facilities = facilitiesData?.facilities || []
  const payouts = payoutsData?.payouts || []

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-destructive" />
                </div>
                <span className="font-bold text-xl">Admin Panel</span>
              </Link>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:flex">
                <TabsList className="bg-transparent p-0">
                  <TabsTrigger value="overview" className="px-4">Overview</TabsTrigger>
                  <TabsTrigger value="users" className="px-4">Users</TabsTrigger>
                  <TabsTrigger value="facilities" className="px-4">Facilities</TabsTrigger>
                  <TabsTrigger value="bookings" className="px-4">Bookings</TabsTrigger>
                  <TabsTrigger value="payouts" className="px-4">Payouts</TabsTrigger>
                  <TabsTrigger value="analytics" className="px-4">Analytics</TabsTrigger>
                  <TabsTrigger value="owner-approvals" className="px-4">Owner Approvals</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Users" value={analytics?.totalUsers || 0} icon={<Users className="w-5 h-5" />} color="text-blue-500" />
          <StatCard title="Facilities" value={analytics?.totalFacilities || 0} icon={<Building className="w-5 h-5" />} color="text-green-500" />
          <StatCard title="Total Bookings" value={analytics?.totalBookings || 0} icon={<Calendar className="w-5 h-5" />} color="text-purple-500" />
          <StatCard title="Revenue" value={formatCurrency(analytics?.totalRevenue || 0)} icon={<DollarSign className="w-5 h-5" />} color="text-orange-500" />
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatRow label="Platform Fees" value={formatCurrency(analytics?.totalPlatformFees || 0)} />
                  <StatRow label="Active Facilities" value={facilities?.filter(f => f.isActive).length || 0} />
                  <StatRow label="Verified Owners" value={users?.filter(u => u.role === "OWNER" && u.isPhoneVerified).length || 0} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.recentBookings?.slice(0, 5).map((booking: any) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{booking.facility?.name}</p>
                          <p className="text-sm text-muted-foreground">{booking.user?.name} • {booking.user?.email}</p>
                        </div>
                        <Badge variant={getBookingStatusColor(booking.status)}>{booking.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-muted rounded" />
                ))}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-muted-foreground border-b">
                        <th className="pb-3">User</th>
                        <th className="pb-3">Role</th>
                        <th className="pb-3">Phone Verified</th>
                        <th className="pb-3">Created</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users?.map((user: any) => (
                        <tr key={user.id} className="border-t">
                          <td className="py-3">
                            <div className="font-medium">{user.name || "N/A"}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </td>
                          <td className="py-3">
                            <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                          </td>
                          <td className="py-3">
                            {user.isPhoneVerified ? (
                              <Badge variant="success">Verified</Badge>
                            ) : (
                              <Badge variant="warning">Pending</Badge>
                            )}
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <Button variant="ghost" size="sm">View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "facilities" && (
          <Card>
            <CardHeader>
              <CardTitle>Facility Management</CardTitle>
            </CardHeader>
            <CardContent>
              {facilitiesLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-muted rounded" />
                ))}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-muted-foreground border-b">
                        <th className="pb-3">Facility</th>
                        <th className="pb-3">Owner</th>
                        <th className="pb-3">City</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Courts</th>
                        <th className="pb-3">Bookings</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facilities?.map((facility: any) => (
                        <tr key={facility.id} className="border-t">
                          <td className="py-3 font-medium">{facility.name}</td>
                          <td className="py-3">{facility.owner?.name}</td>
                          <td className="py-3">{facility.city}</td>
                          <td className="py-3">
                            <Badge variant={facility.isActive ? "success" : "warning"}>
                              {facility.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3">{facility._count?.courts || 0}</td>
                          <td className="py-3">{facility._count?.bookings || 0}</td>
                          <td className="py-3">
                            <Button variant="ghost" size="sm">View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "payouts" && (
          <Card>
            <CardHeader>
              <CardTitle>Payout Management</CardTitle>
            </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-muted rounded" />
                ))}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-muted-foreground border-b">
                        <th className="pb-3">Booking</th>
                        <th className="pb-3">Facility</th>
                        <th className="pb-3">Owner</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Platform Fee</th>
                        <th className="pb-3">Owner Payout</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts?.map((payout: any) => (
                        <tr key={payout.id} className="border-t">
                          <td className="py-3">#{payout.booking?.id?.slice(-8)}</td>
                          <td className="py-3">{payout.booking?.facility?.name}</td>
                          <td className="py-3">{payout.booking?.facility?.owner?.name}</td>
                          <td className="py-3 font-medium">{formatCurrency(payout.amount)}</td>
                          <td className="py-3">{formatCurrency(payout.platformFee)}</td>
                          <td className="py-3 font-medium text-green-600">{formatCurrency(payout.ownerPayout)}</td>
                          <td className="py-3">
                            <Badge variant={getPayoutStatusColor(payout.payoutStatus)}>
                              {payout.payoutStatus}
                            </Badge>
                          </td>
                          <td className="py-3">
                            {payout.payoutStatus === "PENDING" && (
                              <Button variant="outline" size="sm">Process</Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <StatCardDetail title="Total Revenue" value={formatCurrency(analytics?.totalRevenue || 0)} />
                  <StatCardDetail title="Platform Fees" value={formatCurrency(analytics?.totalPlatformFees || 0)} />
                  <StatCardDetail title="Owner Payouts" value={formatCurrency((analytics?.totalRevenue || 0) - (analytics?.totalPlatformFees || 0))} />
                </div>
              </CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatRow label="Players" value={users?.filter(u => u.role === "PLAYER").length || 0} />
                  <StatRow label="Owners" value={users?.filter(u => u.role === "OWNER").length || 0} />
                  <StatRow label="Admins" value={users?.filter(u => u.role === "ADMIN").length || 0} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Facility Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatRow label="Active" value={facilities?.filter(f => f.isActive).length || 0} />
                  <StatRow label="Inactive" value={facilities?.filter(f => !f.isActive).length || 0} />
                  <StatRow label="Total Courts" value={facilities?.reduce((sum, f) => sum + (f._count?.courts || 0), 0) || 0} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "owner-approvals" && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Owner Approvals</CardTitle>
              <p className="text-sm text-muted-foreground">
                Review and approve new owner accounts before they can log in and manage facilities.
              </p>
            </CardHeader>
            <CardContent>
              {pendingOwnersLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-muted rounded" />
                ))}</div>
              ) : pendingOwners.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No pending owner approvals.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-muted-foreground border-b">
                        <th className="pb-3">Owner</th>
                        <th className="pb-3">Email</th>
                        <th className="pb-3">Phone</th>
                        <th className="pb-3">Signed Up</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOwners.map((owner: any) => (
                        <tr key={owner.id} className="border-t">
                          <td className="py-3">
                            <div className="font-medium">{owner.name || "N/A"}</div>
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">{owner.email}</td>
                          <td className="py-3 text-sm text-muted-foreground">{owner.phone || "—"}</td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {new Date(owner.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => verifyOwner.mutate({ userId: owner.id, action: "VERIFY" })}
                                disabled={verifyOwner.isPending}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => verifyOwner.mutate({ userId: owner.id, action: "REJECT" })}
                                disabled={verifyOwner.isPending}
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  )
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn("p-3 rounded-full bg-muted/50", color)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardDetail({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case "ADMIN": return "bg-purple-100 text-purple-800"
    case "OWNER": return "bg-blue-100 text-blue-800"
    case "PLAYER": return "bg-green-100 text-green-800"
    default: return "bg-gray-100 text-gray-800"
  }
}

function getBookingStatusColor(status: string) {
  switch (status) {
    case "CONFIRMED": return "success"
    case "PENDING": return "warning"
    case "CANCELLED": return "destructive"
    case "COMPLETED": return "default"
    default: return "outline"
  }
}

function getPayoutStatusColor(status: string) {
  switch (status) {
    case "SUCCESS": return "success"
    case "PENDING": return "warning"
    case "FAILED": return "destructive"
    default: return "outline"
  }
}

function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30 animate-pulse">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto px-4 py-4 h-16" />
      </header>
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-6 h-24" /></Card>
          ))}
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-6 h-48" /></Card>
          ))}
        </div>
      </main>
    </div>
  )
}