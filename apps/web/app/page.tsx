
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { Button } from '@/components/ui/button';

import Link from 'next/link';
import { Gift, Wallet, Send, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen pb-20 relative overflow-hidden flex flex-col">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[60%] bg-primary/10 blur-[120px] rounded-full mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[60%] bg-purple-500/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="z-10 container mx-auto px-4 pt-12 flex-1 flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-primary to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Gift className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Red Pocket</span>
          </div>

          {mounted && !isConnected && (
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full px-4 font-semibold hover:bg-white/10"
              onClick={() => {
                const injected = connectors.find(c => c.id === 'injected');
                connect({ connector: injected || connectors[0] });
              }}
            >
              Connect
            </Button>
          )}

          {mounted && isConnected && (
            <div className="flex items-center gap-2 bg-secondary/50 rounded-full px-4 py-2 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-mono text-muted-foreground">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
          )}
        </header>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center space-y-6 flex-1 justify-center max-w-lg mx-auto"
        >
          <h1 className="text-5xl font-extrabold tracking-tight leading-110">
            Send gifts on <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Base</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xs mx-auto">
            Share crypto gifts instantly. Secure, fun, and onchain.
          </p>

          <div className="grid grid-cols-2 gap-4 w-full pt-8">
            <Link href="/create" className="w-full">
              <Button className="w-full h-16 text-lg rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all font-bold group" variant="default">
                <Gift className="mr-2 w-5 h-5 group-hover:rotate-12 transition-transform" /> Create
              </Button>
            </Link>
            <Link href="/my-gifts" className="w-full">
              <Button className="w-full h-16 text-lg rounded-2xl bg-secondary/50 hover:bg-secondary transition-all font-bold border-0" variant="secondary">
                <Wallet className="mr-2 w-5 h-5" /> Manage
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-20 mb-10"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6 text-center">How it works</h2>
          <div className="grid gap-4">
            {[
              { icon: Gift, title: "Create", desc: "Lock funds & generate link" },
              { icon: Send, title: "Share", desc: "Send link to friends" },
              { icon: Wallet, title: "Claim", desc: "Instant withdrawal" }
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4 bg-card/50 p-4 rounded-2xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary">
                  <step.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
                {i < 2 && <div className="ml-auto w-px h-8 bg-border/50 hidden md:block" />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
