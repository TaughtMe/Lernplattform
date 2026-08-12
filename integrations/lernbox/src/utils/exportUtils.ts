import type { Card } from '../types';

export const SAFE_QR_LIMIT = 2200;

export const calculateExportSize = (cards: Card[]): number => {
    const exportData = cards.map(c => [c.question, c.answer, c.tag || '']);
    return JSON.stringify(exportData).length;
};

export const getCapacityColor = (currentSize: number, limit: number = SAFE_QR_LIMIT): string => {
    const usagePercent = (currentSize / limit) * 100;
    if (usagePercent > 100) return 'bg-red-500';
    if (usagePercent > 80) return 'bg-amber-500';
    return 'bg-emerald-500';
};
