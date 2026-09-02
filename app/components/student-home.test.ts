import { describe, expect, it } from "vitest";
import { createCalendarMonth } from "./student-home";

describe("createCalendarMonth", () => {
  it("builds a complete Monday-to-Sunday month including adjacent dates", () => {
    const days = createCalendarMonth(
      new Date(2026, 7, 1),
      new Date(2026, 7, 24),
    );

    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({
      key: "2026-07-27",
      day: 27,
      isCurrentMonth: false,
    });
    expect(days[28]).toMatchObject({
      key: "2026-08-24",
      isCurrentMonth: true,
      isToday: true,
    });
    expect(days.at(-1)).toMatchObject({
      key: "2026-09-06",
      day: 6,
      isCurrentMonth: false,
    });
  });

  it("uses five rows when the month fits into five complete weeks", () => {
    const days = createCalendarMonth(new Date(2026, 1, 1));

    expect(days).toHaveLength(35);
    expect(days[0]?.key).toBe("2026-01-26");
    expect(days.at(-1)?.key).toBe("2026-03-01");
  });
});
