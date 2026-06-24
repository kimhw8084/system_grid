import { computeRowActionLayout } from '../src/components/shared/OperationalRowActionMenu'
import { expect, test } from 'vitest'

test('computeRowActionLayout handles responsive columns', () => {
    const sections = [{ id: 'quickAccess' as const, columns: 5, items: [{id: '1', label: 'Item 1', icon: () => null, onClick: () => {}}] }]
    const buttonMinWidth = 100
    
    // Wide viewport: 5 columns
    const wide = computeRowActionLayout({ viewportWidth: 1000, rawButtonMinWidth: buttonMinWidth, sections })
    expect(wide.processedSections[0].actualColumns).toBe(5)
    
    // Medium viewport: 3 columns
    const medium = computeRowActionLayout({ viewportWidth: 500, rawButtonMinWidth: buttonMinWidth, sections })
    expect(medium.processedSections[0].actualColumns).toBeLessThan(5)
    
    // Narrow viewport: 1 column
    const narrow = computeRowActionLayout({ viewportWidth: 200, rawButtonMinWidth: buttonMinWidth, sections })
    expect(narrow.processedSections[0].actualColumns).toBe(1)
    expect(narrow.finalPanelWidth).toBeLessThanOrEqual(200 - 12 * 2)
})
