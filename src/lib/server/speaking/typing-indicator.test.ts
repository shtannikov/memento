// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { runWithTelegramTyping } from "./typing-indicator";

afterEach(() => {
  vi.useRealTimers();
});

describe("runWithTelegramTyping", () => {
  it("keeps Telegram typing active until the operation settles", async () => {
    vi.useFakeTimers();
    const sendTyping = vi.fn().mockResolvedValue(undefined);
    let finish: (value: string) => void = () => undefined;
    const operation = new Promise<string>((resolve) => {
      finish = resolve;
    });

    const result = runWithTelegramTyping(
      42,
      "en",
      () => operation,
      sendTyping,
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(sendTyping).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(8000);
    expect(sendTyping).toHaveBeenCalledTimes(3);

    finish("done");
    await expect(result).resolves.toBe("done");
    await vi.advanceTimersByTimeAsync(4000);
    expect(sendTyping).toHaveBeenCalledTimes(3);
  });

  it("stops refreshing when the operation fails", async () => {
    vi.useFakeTimers();
    const sendTyping = vi.fn().mockResolvedValue(undefined);

    await expect(
      runWithTelegramTyping(
        42,
        "en",
        async () => {
          throw new Error("generation failed");
        },
        sendTyping,
      ),
    ).rejects.toThrow("generation failed");

    await vi.advanceTimersByTimeAsync(4000);
    expect(sendTyping).toHaveBeenCalledTimes(1);
  });
});
