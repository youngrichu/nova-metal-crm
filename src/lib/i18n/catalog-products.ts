type ProductCardColumnLabels = {
	name: string;
	sku: string;
	status: string;
	category: string;
	cost: string;
	minStock: string;
	active: string;
};

export function getProductStatusLabel(
	isActive: boolean,
	activeLabel: string,
	inactiveLabel: string
): string {
	return isActive ? activeLabel : inactiveLabel;
}

export function formatProductCountLabel(
	count: number,
	singularTemplate: string,
	pluralTemplate: string
): string {
	const template = count === 1 ? singularTemplate : pluralTemplate;
	return template.replace('#', String(count));
}

export function buildProductCardColumns(labels: ProductCardColumnLabels) {
	return [
		{ key: 'name', label: labels.name, primary: true },
		{ key: 'sku', label: labels.sku, secondary: true },
		{
			key: 'isActiveLabel',
			label: labels.status,
			badge: true,
			badgeClass: (value: unknown) =>
				value === labels.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
		},
		{ key: 'categoryName', label: labels.category },
		{ key: 'averageLandingCost', label: labels.cost },
		{ key: 'minStockLevel', label: labels.minStock }
	];
}
