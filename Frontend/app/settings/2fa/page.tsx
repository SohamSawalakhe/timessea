"use client";

import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Smartphone, Mail, Key, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

export default function TwoFactorPage() {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(false);

  const methods = [
    {
      id: 'app',
      title: "Authenticator App",
      description: "Use an app like Google Authenticator or Authy",
      icon: <ShieldCheck className="w-5 h-5" />,
      color: "bg-blue-500/10 text-blue-500",
      recommended: true
    },
    {
      id: 'sms',
      title: "Text Message (SMS)",
      description: "Get a code sent to your phone number",
      icon: <Smartphone className="w-5 h-5" />,
      color: "bg-emerald-500/10 text-emerald-500"
    },
    {
      id: 'email',
      title: "Email",
      description: "Receive security codes in your inbox",
      icon: <Mail className="w-5 h-5" />,
      color: "bg-orange-500/10 text-orange-500"
    }
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
              Two-Factor Authentication
            </h1>
            <p className="text-sm text-muted-foreground">Protect your account with an extra layer of security</p>
          </div>
        </div>

        <div className="p-6 mb-8 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-start gap-4">
          <Key className="w-6 h-6 text-primary mt-1" />
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">Secure your account</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Two-factor authentication (2FA) helps prevent unauthorized access even if someone knows your password.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm">
            {methods.map((method, idx) => (
              <div key={method.id}>
                <button
                  onClick={() => toast.info(`${method.title} setup coming soon!`)}
                  className="w-full flex items-center justify-between p-6 hover:bg-secondary/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${method.color}`}>
                      {method.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{method.title}</p>
                        {method.recommended && (
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">Recommended</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                </button>
                {idx < methods.length - 1 && <div className="mx-6 border-b border-border/30" />}
              </div>
            ))}
          </div>

          <div className="p-6 rounded-[2rem] bg-secondary/30 border border-border/20 text-left">
            <h3 className="text-sm font-bold text-foreground mb-2">Backup Codes</h3>
            <p className="text-xs text-muted-foreground mb-4">
              If you lose access to your 2FA device, you can use backup codes to sign in.
            </p>
            <button 
              onClick={() => toast.info("Generating codes...")}
              className="text-xs font-bold text-primary hover:underline"
            >
              Generate Backup Codes
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
