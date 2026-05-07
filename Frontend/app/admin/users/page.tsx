"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  MoreVertical,
  Ban,
  Unlock,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { toast } from "react-toastify";
import { formatDistanceToNow } from "date-fns";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UserListItem {
  id: string;
  name: string;
  email: string;
  picture?: string;
  role: string;
  banned: boolean;
  warnings: number;
  createdAt: string;
  _count: {
    articles: number;
    followers: number;
  }
}

export default function UserManagementPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "banned" | "admins">("all");

  useEffect(() => {
    if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN')) {
      router.push("/");
      return;
    }
    fetchUsers();
  }, [user, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async (userId: string, isCurrentlyBanned: boolean) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}/ban`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, banned: data.banned, warnings: data.warnings } : u
        ));
        toast.success(data.banned ? "User banned successfully" : "User unbanned successfully (warnings reset)");
      }
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleWarnUser = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}/warn`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, warnings: updated.warnings, banned: updated.banned } : u));
        toast.warning(`Warning issued. Total warnings: ${updated.warnings}/3`);
      }
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === "banned") return matchesSearch && u.banned;
    if (filter === "admins") return matchesSearch && (u.role === "ADMIN" || u.role === "SUPERADMIN");
    return matchesSearch;
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-left">
              <h1 className="text-3xl font-black tracking-tight text-foreground font-serif">
                User Management
              </h1>
              <p className="text-sm text-muted-foreground">Monitor and manage platform members</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-card border border-border/40 rounded-xl text-sm outline-none focus:border-primary/30 w-full md:w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-6 rounded-[2rem] bg-card border border-border/40 shadow-sm text-left">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Users</p>
            <p className="text-2xl font-black text-foreground">{users.length}</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-red-500/5 border border-red-500/10 shadow-sm text-left">
            <p className="text-xs font-bold text-red-500/70 uppercase tracking-wider mb-1">Banned</p>
            <p className="text-2xl font-black text-red-500">{users.filter(u => u.banned).length}</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 shadow-sm text-left">
            <p className="text-xs font-bold text-amber-600/70 uppercase tracking-wider mb-1">With Warnings</p>
            <p className="text-2xl font-black text-amber-600">{users.filter(u => u.warnings > 0).length}</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 shadow-sm text-left">
            <p className="text-xs font-bold text-primary/70 uppercase tracking-wider mb-1">Admins</p>
            <p className="text-2xl font-black text-primary">{users.filter(u => u.role === 'ADMIN').length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'banned', 'admins'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                filter === f 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Users List */}
        <div className="bg-card border border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Fetching users...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/20 bg-secondary/20">
                    <th className="p-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">User</th>
                    <th className="p-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Role</th>
                    <th className="p-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Stats</th>
                    <th className="p-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="p-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl overflow-hidden bg-secondary">
                            {u.picture ? (
                              <img src={u.picture} alt={u.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center font-bold text-muted-foreground">
                                {u.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{u.name}</p>
                            <p className="text-[11px] text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          u.role === 'SUPERADMIN' ? "bg-purple-500/10 text-purple-600" :
                          u.role === 'ADMIN' ? "bg-blue-500/10 text-blue-600" :
                          "bg-secondary text-muted-foreground"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="text-[11px] font-bold text-muted-foreground">
                          <span className="text-foreground">{u._count.articles}</span> Articles
                          <br />
                          <span className="text-foreground">{u._count.followers}</span> Followers
                        </div>
                      </td>
                      <td className="p-5">
                        {u.banned ? (
                          <div className="flex items-center gap-1.5 text-red-500 text-[11px] font-bold">
                            <XCircle className="w-3.5 h-3.5" />
                            BANNED
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-500 text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ACTIVE
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex gap-1">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full ring-1 ring-inset",
                                  u.warnings >= i
                                    ? i === 3 ? "bg-red-500 ring-red-600/20" : i === 2 ? "bg-orange-500 ring-orange-600/20" : "bg-amber-400 ring-amber-500/20"
                                    : "bg-secondary ring-border/50"
                                )}
                              />
                            ))}
                          </div>
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-wider",
                            u.warnings >= 3 ? "text-red-500" : u.warnings > 0 ? "text-amber-500" : "text-muted-foreground/30"
                          )}>
                            {u.warnings >= 3 ? "Limit Reached" : u.warnings > 0 ? `${u.warnings}/3 Warnings` : "Clean Record"}
                          </span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          {u.role !== 'SUPERADMIN' && (
                            <>
                              <button
                                onClick={() => handleToggleBan(u.id, u.banned)}
                                className={`p-2 rounded-xl transition-all ${
                                  u.banned 
                                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" 
                                    : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                                }`}
                                title={u.banned ? "Unban User" : "Ban User"}
                              >
                                {u.banned ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </button>
                              {!u.banned && (
                                <button
                                  onClick={() => handleWarnUser(u.id)}
                                  className="p-2 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-all"
                                  title="Issue Warning"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                          <button className="p-2 rounded-xl bg-secondary text-muted-foreground hover:bg-secondary/80">
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 text-center">
              <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm font-bold text-muted-foreground">No users found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search query or filter</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
