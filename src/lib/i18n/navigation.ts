type BreadcrumbLabels = {
	dashboard: string;
	inventory: string;
	counts: string;
	reconcile: string;
};

export function getBreadcrumbLabel(segment: string, labels: BreadcrumbLabels): string {
	const mapped: Record<string, string> = {
		dashboard: labels.dashboard,
		inventory: labels.inventory,
		counts: labels.counts,
		reconcile: labels.reconcile
	};

	return mapped[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
