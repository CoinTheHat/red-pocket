
"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SegmentedControlProps {
    options: { label: string; value: string }[]
    value: string
    onChange: (value: string) => void
    className?: string
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
    return (
        <div className={cn("flex p-1 bg-secondary/50 rounded-2xl relative", className)}>
            {options.map((option) => {
                const isActive = value === option.value
                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "flex-1 relative z-10 py-2.5 text-sm font-semibold transition-colors duration-200",
                            isActive ? "text-white" : "text-muted-foreground hover:text-white"
                        )}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="segmented-bg"
                                className="absolute inset-0 bg-secondary rounded-xl shadow-sm"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span className="relative z-20">{option.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
