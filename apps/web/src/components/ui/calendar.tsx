import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { DayPicker, type CaptionProps, useNavigation } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function CalendarCaption({ displayMonth }: CaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation()

  return (
    <div className="flex items-center justify-center gap-2 pt-1">
      <button
        type="button"
        aria-label="Go to previous month"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 disabled:opacity-25"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="min-w-[10rem] text-center text-sm font-medium">
        {format(displayMonth, "LLLL yyyy")}
      </div>

      <button
        type="button"
        aria-label="Go to next month"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 disabled:opacity-25"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        // NOTE: react-day-picker v9 uses `UI.*` string keys at runtime (e.g. "weekday",
        // "weekdays", "month_grid"). The older v8 keys (e.g. "head_cell") are *not*
        // mapped at runtime, so weekday labels collapse without these v9 keys.
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        month_caption: "flex justify-center",
        caption_label: "text-sm font-medium",
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full",
        weekday:
          "text-muted-foreground rounded-md w-9 h-9 flex items-center justify-center font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: CalendarCaption,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
