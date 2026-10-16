export function money(value: string | number, currency = "BHD"): string {
  return new Intl.NumberFormat("en-BH", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "BHD" ? 3 : 2,
  }).format(Number(value));
}
export function vehicleLabel(v: {
  make: string;
  model: string;
  year_from: number;
  year_to: number;
}) {
  return v.make + " " + v.model + " · " + v.year_from + "–" + v.year_to;
}
export function errorMessage(e: unknown) {
  return e instanceof Error
    ? e.message
    : "Something went wrong. Please try again.";
}
