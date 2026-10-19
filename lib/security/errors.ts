export function errorMessage(error: unknown, fallback="The operation could not be completed. Please try again.") {
  return error instanceof Error ? error.message : fallback;
}
