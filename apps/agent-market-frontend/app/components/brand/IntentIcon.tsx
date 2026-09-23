import type { CategoryId } from "@/app/lib/catalog-summary";

const paths: Record<CategoryId, string> = {
  YIELD_OPTIMISATION:
    "M4 18V10l8-6v6l8-6v14h-4v-6l-4 3v3H4z",
  REBALANCING: "M6 14h12M6 10h12M10 6v12M14 6v12",
  GRID_TRADING:
    "M5 5h6v6H5V5zm8 0h6v6h-6V5zM5 13h6v6H5v-6zm8 0h6v6h-6v-6z",
  HEALTH_FACTOR_MONITORING:
    "M12 4l8 14H4L12 4zm0 6v4m0 3h.01",
};

export default function IntentIcon({
  category,
  className = "h-4 w-4",
}: {
  category: CategoryId;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[category]} />
    </svg>
  );
}
