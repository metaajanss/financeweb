import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import type { PipelineStage } from "@/features/analytics"

export function PipelineDistributionCard({ pipeline }: { pipeline?: PipelineStage[] | null }) {
  const safePipeline = pipeline || []
  
  if (safePipeline.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Pipeline Distribution</CardTitle>
          <CardDescription>Current leads by stage</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No pipeline data available.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Pipeline Distribution</CardTitle>
        <CardDescription>Current leads by stage</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center gap-6">
        <div className="space-y-4">
          {safePipeline.map((item, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <span className="font-medium">{item.stage}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{item.count} leads</span>
                  <span className="font-semibold w-10 text-right">{item.percentage}%</span>
                </div>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-in-out"
                  style={{ 
                    width: `${item.percentage}%`,
                    backgroundColor: item.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
