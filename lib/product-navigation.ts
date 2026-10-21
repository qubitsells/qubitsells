export function productOptions(params: Pick<URLSearchParams, "get">) {
  const duration = Number(params.get("duration"));
  return {
    duration: [72, 168, 720].includes(duration) ? duration : 72,
    review: params.get("review") === "1",
    cancelled: params.get("checkout") === "cancelled",
  };
}
