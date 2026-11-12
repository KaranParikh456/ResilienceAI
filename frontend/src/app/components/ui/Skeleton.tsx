// src/app/components/ui/Skeleton.tsx
export function Block({ className = '' }: { className?: string }) {
    return <div className={`skeleton ${className}`} />;
}

export function DashboardSkeleton() {
    return (
        <>
            <Block className="h-64 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[0, 1, 2, 3].map((i) => (
                    <Block key={i} className="h-36" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[0, 1, 2].map((i) => (
                    <Block key={i} className="h-56" />
                ))}
            </div>
            <Block className="h-[26rem] w-full" />
        </>
    );
}

export function PageSkeleton() {
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="pb-8 border-b border-navy/15 space-y-4">
                <Block className="h-3 w-40" />
                <Block className="h-14 w-96 max-w-full" />
                <Block className="h-4 w-80 max-w-full" />
            </div>
            <DashboardSkeleton />
        </div>
    );
}