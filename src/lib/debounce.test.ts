import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleDebouncedValue } from "@/lib/debounce";

afterEach(() => vi.useRealTimers());

describe("scheduleDebouncedValue", () => {
  it("publishes the value after the delay", () => {
    vi.useFakeTimers();
    const publish = vi.fn();
    scheduleDebouncedValue("term", 300, publish);
    vi.advanceTimersByTime(299);
    expect(publish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(publish).toHaveBeenCalledWith("term");
  });

  it("can cancel a pending value", () => {
    vi.useFakeTimers();
    const publish = vi.fn();
    const cancel = scheduleDebouncedValue("term", 300, publish);
    cancel();
    vi.advanceTimersByTime(300);
    expect(publish).not.toHaveBeenCalled();
  });
});
