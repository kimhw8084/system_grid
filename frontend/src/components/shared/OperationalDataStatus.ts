export type DataStatus = 'healthy' | 'loading' | 'error' | 'filtered' | 'empty'

export function normalizeOperationalListResponse(data: any) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.rows)) return data.rows;
    }
    return null; // Signals shape mismatch
}

export function classifyDataStatus(
    isLoading: boolean,
    error: any,
    rawData: any,
    filteredCount: number,
    totalCount: number
): { status: DataStatus, errorDetail?: any } {
    if (isLoading) return { status: 'loading' };
    if (error) return { status: 'error', errorDetail: error };
    if (!rawData) return { status: 'error', errorDetail: 'Invalid response shape' };
    if (totalCount === 0) return { status: 'empty' };
    if (filteredCount === 0) return { status: 'filtered' };
    return { status: 'healthy' };
}
