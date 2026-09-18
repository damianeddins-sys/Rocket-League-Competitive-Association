type FetchLike = typeof fetch;

type DiscordFetchOptions = {
  fetchImpl?: FetchLike;
  sleep?: (milliseconds: number) => Promise<void>;
  maxRetries?: number;
};

export async function fetchDiscord(
  input: Parameters<FetchLike>[0],
  init: Parameters<FetchLike>[1],
  options: DiscordFetchOptions = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep =
    options.sleep ?? ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const maxRetries = options.maxRetries ?? 2;

  for (let attempt = 0; ; attempt += 1) {
    const response = await fetchImpl(input, init);
    if (response.status !== 429 || attempt >= maxRetries) return response;

    const retryAfterSeconds = Number(
      response.headers.get("retry-after") ??
        response.headers.get("x-ratelimit-reset-after") ??
        "1",
    );
    const delay = Number.isFinite(retryAfterSeconds)
      ? Math.min(Math.max(retryAfterSeconds * 1000, 0), 2_000)
      : 1_000;
    await sleep(delay);
  }
}
