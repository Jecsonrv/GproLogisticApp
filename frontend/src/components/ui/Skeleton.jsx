import React from "react";
import { cn } from "../../lib/utils";

export function Skeleton({ className, ...props }) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-gray-200", className)}
            {...props}
        />
    );
}

export function SkeletonTable({ rows = 5, columns = 5 }) {
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex gap-4">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} className="h-10 flex-1" />
                ))}
            </div>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton key={colIndex} className="h-12 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
            <Skeleton className="h-4 w-1/4 mb-4" />
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
        </div>
    );
}

export function SkeletonForm({ fields = 4 }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
        </div>
    );
}
