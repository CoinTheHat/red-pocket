
import * as React from "react"
import { cn } from "@/lib/utils"
import { Gift, ChevronRight } from "lucide-react"

interface PocketCardProps {
    amount: string
    token: string
    count: number
    claimedCount: number
    expiresAt: string // Formatted date string
    status: 'active' | 'claimed' | 'expired'
    onClick?: () => void
}

export function PocketCard({ amount, token, count, claimedCount, expiresAt, status, onClick }: PocketCardProps) {
    const isExpired = status === 'expired';
    const isFull = claimedCount >= count;

    return (
        <div
            onClick={onClick}
            className="group relative overflow-hidden rounded-3xl bg-card border border-border/50 hover:border-primary/50 transition-all cursor-pointer p-0"
        >
            <div className="p-5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                        status === 'active' ? "bg-gradient-to-tr from-red-500 to-orange-500 text-white" : "bg-secondary text-muted-foreground"
                    )}>
                        <Gift className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">{amount} {token}</h3>
                        <p className="text-sm text-muted-foreground">
                            {claimedCount}/{count} Claimed • {isExpired ? 'Expired' : 'Active'}
                        </p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            {/* Progress Bar Background */}
            <div className="absolute bottom-0 left-0 h-1 bg-secondary w-full">
                <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(claimedCount / count) * 100}%` }}
                />
            </div>
        </div>
    )
}
