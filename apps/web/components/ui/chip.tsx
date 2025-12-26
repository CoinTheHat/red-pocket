
import * as React from "react"
import { cn } from "@/lib/utils"

interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
    active?: boolean
    onClick?: () => void
}

export function Chip({ className, active, onClick, children, ...props }: ChipProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium transition-all cursor-pointer border",
                active
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-secondary/50 border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}
