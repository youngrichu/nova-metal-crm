/**
 * Utility to generate consistent SCUs (Stock Keeping Units) based on metal properties
 */

type SKUParams = {
    categoryPrefix: string;  // e.g., 'RHS'
    size1: number | null;    // e.g., 40
    size2: number | null;    // e.g., 20 or null if it's square/round
    thickness: number | null;// e.g., 1.5
    length: number | null;   // e.g., 6000
};

export function generateSKU(params: SKUParams): string {
    const parts: string[] = [params.categoryPrefix];

    if (params.size1 && params.size2) {
        parts.push(`${params.size1}x${params.size2}`);
    } else if (params.size1) {
        parts.push(`${params.size1}`);
    }

    if (params.thickness) {
        // Strip trailing zeros after decial for cleaner SKUs, e.g. 1.50 -> 1.5
        parts.push(parseFloat(params.thickness.toString()).toString());
    }

    if (params.length) {
        // Lengths are usually in mm, we can format 6000 as 6M for the SKU
        if (params.length % 1000 === 0) {
            parts.push(`${params.length / 1000}M`);
        } else {
            parts.push(`${params.length}`);
        }
    }

    return parts.join('-').toUpperCase();
}
