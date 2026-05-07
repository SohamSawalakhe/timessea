"use client";

import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserX, UserMinus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

export default function BlockedAccountsPage() {
  const router = useRouter();
  
  const [blockedUsers, setBlockedUsers] = useState([
    { id: '1', name: 'SpamBot 3000', handle: '@spambot', picture: null },
    { id: '2', name: 'Toxic User', handle: '@toxic', picture: null },
  ]);

  const handleUnblock = (id: string, name: string) => {
    setBlockedUsers(prev => prev.filter(u => u.id !== id));
    toast.success(`Unblocked ${name}`);
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-foreground font-serif text-left">
            Blocked Accounts
          </h1>
        </div>

        <div className="p-6 mb-8 rounded-[2rem] bg-secondary/30 border border-border/20 flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-muted-foreground mt-1" />
          <p className="text-sm text-muted-foreground leading-relaxed text-left">
            When you block someone, they won't be able to message you, see your profile, or view your articles. They won't be notified that you blocked them.
          </p>
        </div>

        <div className="space-y-4">
          {blockedUsers.length > 0 ? (
            <div className="bg-card border border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm">
              {blockedUsers.map((user, idx) => (
                <div key={user.id}>
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {user.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.handle}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(user.id, user.name)}
                      className="px-4 py-1.5 rounded-full bg-secondary text-foreground text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                    >
                      Unblock
                    </button>
                  </div>
                  {idx < blockedUsers.length - 1 && <div className="mx-6 border-b border-border/30" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-card border border-dashed border-border/40 rounded-[2.5rem]">
              <UserMinus className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm font-bold text-muted-foreground">No blocked accounts</p>
              <p className="text-xs text-muted-foreground mt-1">Accounts you block will appear here</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
