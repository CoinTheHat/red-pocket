
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    rightElement?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, rightElement, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-2">
                {label && <label className="text-sm font-medium text-muted-foreground ml-1">{label}</label>}
                <div className="relative">
                    <input
                        type={type}
                        className={cn(
                            "flex h-14 w-full rounded-2xl border border-input bg-card px-4 py-3 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                    {rightElement && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {rightElement}
                        </div>
                    )}
                </div>
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input }
