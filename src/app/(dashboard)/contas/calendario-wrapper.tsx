"use client";

import { useState } from "react";
import { CalendarHeatmap } from "@/components/charts/calendar-heatmap";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarioWrapperProps {
  data: Record<string, { pagar: number; receber: number }>;
  initialMonth: number; // 0-11
  initialYear: number;
}

export function CalendarioWrapper({
  data,
  initialMonth,
  initialYear,
}: CalendarioWrapperProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={handlePrev}>
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={handleNext}>
          Proximo
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <CalendarHeatmap data={data} month={month} year={year} />
    </div>
  );
}
