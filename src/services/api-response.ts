export async function readApiResult<T extends object>(response: Response): Promise<T & { error?: string }> {
  try {
    return await response.json() as T & { error?: string };
  } catch {
    return {
      error: response.ok
        ? "The server returned an invalid response"
        : `The server could not complete the request (${response.status})`,
    } as T & { error?: string };
  }
}
