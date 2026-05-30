import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import type { FunnelStep } from "@/features/analytics"

export function ConversionFunnelCard({ funnel }: { funnel?: FunnelStep[] | null }) {
  const safeFunnel = funnel || []
  
  if (safeFunnel.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Lead conversion journey</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No funnel data available.
        </CardContent>
      </Card>
    )
  }

  // To build a funnel look, we center the bars and scale their width
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>Lead conversion journey</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center py-2 h-full">
        <div className="flex flex-col gap-1 w-full relative">
          {safeFunnel.map((item, i) => {
            // Minimum width 15% so a 0% step is still visible as a label bar
            const barWidth = Math.max(item.percentage, 15)
            
            return (
              <div key={i} className="flex flex-col group relative cursor-default w-full">
                <div className="relative w-full h-10 flex items-center justify-between px-4 md:px-6 rounded-sm border overflow-hidden z-0">
                  {/* Visual funnel bar (centered in background) */}
                  <div 
                    className="absolute inset-y-0 left-1/2 -translate-x-1/2 transition-all duration-500 rounded-sm -z-10"
                    style={{ 
                      width: `${barWidth}%`, 
                      backgroundColor: `${item.color}15`, // 15% opacity background
                      borderRight: `2px solid ${item.color}40`,
                      borderLeft: `2px solid ${item.color}40`
                    }}
                  >
                     <div 
                      className="absolute inset-0 opacity-10"
                      style={{ backgroundColor: item.color }} 
                    />
                  </div>
                  
                  {/* Label (Left) */}
                  <div className="z-10 flex items-center gap-2">
                    <span 
                      className="font-semibold text-sm tracking-tight"
                      style={{ color: item.color }}
                    >
                      {item.label}
                    </span>
                  </div>
                  
                  {/* Value & Percentage (Right) */}
                  <div className="z-10 flex items-center gap-2 bg-card/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    <span className="font-bold text-sm" style={{ color: item.color }}>
                      {item.value}
                    </span>
                    <span className="text-xs opacity-70 font-medium" style={{ color: item.color }}>
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
                
                {/* Arrow down between steps */}
                {i < safeFunnel.length - 1 && (
                  <div className="h-3 w-px bg-border my-0.5 mx-auto" />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
