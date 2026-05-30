import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Card } from "@/shared/components/ui/card"
import type { DashboardMetrics } from "@/features/analytics"
import { useTranslations } from "next-intl"

export function SectionCards({ metrics }: { metrics?: DashboardMetrics | null }) {
  const t = useTranslations("Analytics")

  // Fallback defaults if metrics is null while loading
  const data: DashboardMetrics = metrics || {
    totalLeads: 0,
    leadsChange: '+0%',
    bookedMeetings: 0,
    meetingsChange: '+0%',
    responseRate: 0,
    responseChange: '+0%',
    successRate: 0,
    successRateChange: '+0%',
  }

  const parseChange = (changeStr: string | undefined | null) => {
    if (!changeStr) return { isPositive: true, text: '+0%', value: '0' };
    const isPositive = !changeStr.startsWith('-');
    const value = changeStr.replace(/[^0-9.]/g, '');
    return { isPositive, text: changeStr, value };
  }

  // Helper for rendering footer trend text
  const renderTrendFooter = (isPositive: boolean) => (
    <span className="font-medium flex items-center gap-1 text-[13px] text-foreground">
      {isPositive ? t("trendingUp") : t("trendingDown")} 
      {isPositive ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
    </span>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4 lg:px-6">
      
      {/* Total Leads */}
      <Card className="flex flex-col gap-4 p-5 md:p-6 shadow-sm bg-gradient-to-br from-card via-card to-primary/5 dark:to-primary/10 border-border/80">
        <div className="flex justify-between items-center">
          <span className="text-[14px] text-muted-foreground font-medium">{t("totalLeads")}</span>
          <Badge variant="outline" className="flex items-center gap-1 font-normal text-xs px-2 py-0.5 rounded-full bg-background border whitespace-nowrap shadow-none">
            {parseChange(data.leadsChange).isPositive ? <TrendingUpIcon className="w-3 h-3 text-emerald-500" /> : <TrendingDownIcon className="w-3 h-3 text-rose-500" />}
            {data.leadsChange}
          </Badge>
        </div>
        <div>
          <h2 className="text-[32px] font-bold tracking-tight leading-none">{data.totalLeads.toLocaleString()}</h2>
        </div>
        <div className="flex flex-col gap-1.5 mt-auto">
          {renderTrendFooter(parseChange(data.leadsChange).isPositive)}
          <span className="text-[13px] text-muted-foreground">
            {t("totalLeadsDesc")}
          </span>
        </div>
      </Card>

      {/* Booked Meetings */}
      <Card className="flex flex-col gap-4 p-5 md:p-6 shadow-sm bg-gradient-to-br from-card via-card to-primary/5 dark:to-primary/10 border-border/80">
        <div className="flex justify-between items-center">
          <span className="text-[14px] text-muted-foreground font-medium">{t("bookedMeetings")}</span>
          <Badge variant="outline" className="flex items-center gap-1 font-normal text-xs px-2 py-0.5 rounded-full bg-background border whitespace-nowrap shadow-none">
            {parseChange(data.meetingsChange).isPositive ? <TrendingUpIcon className="w-3 h-3 text-emerald-500" /> : <TrendingDownIcon className="w-3 h-3 text-rose-500" />}
            {data.meetingsChange}
          </Badge>
        </div>
        <div>
          <h2 className="text-[32px] font-bold tracking-tight leading-none">{data.bookedMeetings.toLocaleString()}</h2>
        </div>
        <div className="flex flex-col gap-1.5 mt-auto">
          {renderTrendFooter(parseChange(data.meetingsChange).isPositive)}
          <span className="text-[13px] text-muted-foreground">
            {t("bookedMeetingsDesc")}
          </span>
        </div>
      </Card>

      {/* Response Rate */}
      <Card className="flex flex-col gap-4 p-5 md:p-6 shadow-sm bg-gradient-to-br from-card via-card to-primary/5 dark:to-primary/10 border-border/80">
        <div className="flex justify-between items-center">
          <span className="text-[14px] text-muted-foreground font-medium">{t("responseRate")}</span>
          <Badge variant="outline" className="flex items-center gap-1 font-normal text-xs px-2 py-0.5 rounded-full bg-background border whitespace-nowrap shadow-none">
            {parseChange(data.responseChange).isPositive ? <TrendingUpIcon className="w-3 h-3 text-emerald-500" /> : <TrendingDownIcon className="w-3 h-3 text-rose-500" />}
            {data.responseChange}
          </Badge>
        </div>
        <div>
          <h2 className="text-[32px] font-bold tracking-tight leading-none">{data.responseRate}%</h2>
        </div>
        <div className="flex flex-col gap-1.5 mt-auto">
          {renderTrendFooter(parseChange(data.responseChange).isPositive)}
          <span className="text-[13px] text-muted-foreground">
            {t("responseRateDesc")}
          </span>
        </div>
      </Card>

      {/* AI Win Rate */}
      <Card className="flex flex-col gap-4 p-5 md:p-6 shadow-sm bg-gradient-to-br from-card via-card to-primary/5 dark:to-primary/10 border-border/80">
        <div className="flex justify-between items-center">
          <span className="text-[14px] text-muted-foreground font-medium">{t("aiWinRate")}</span>
          <Badge variant="outline" className="flex items-center gap-1 font-normal text-xs px-2 py-0.5 rounded-full bg-background border whitespace-nowrap shadow-none">
            {parseChange(data.successRateChange).isPositive ? <TrendingUpIcon className="w-3 h-3 text-emerald-500" /> : <TrendingDownIcon className="w-3 h-3 text-rose-500" />}
            {data.successRateChange}
          </Badge>
        </div>
        <div>
          <h2 className="text-[32px] font-bold tracking-tight leading-none">{data.successRate}%</h2>
        </div>
        <div className="flex flex-col gap-1.5 mt-auto">
          {renderTrendFooter(parseChange(data.successRateChange).isPositive)}
          <span className="text-[13px] text-muted-foreground">
            {t("aiWinRateDesc")}
          </span>
        </div>
      </Card>

    </div>
  )
}
