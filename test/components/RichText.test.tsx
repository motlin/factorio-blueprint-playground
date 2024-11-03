import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/preact'
import { RichText } from '../../src/components/RichText'
import '../../test/setup'

describe('RichText', () => {
    // Test empty and null input
    it('handles empty input', () => {
        const { container } = render(<RichText text="" />)
        expect(container.firstChild).toBe(null)
    })

    it('handles null input', () => {
        // @ts-ignore - Testing null input
        const { container } = render(<RichText text={null} />)
        expect(container.firstChild).toBe(null)
    })

    // Test basic item tags
    it('renders item tags correctly', () => {
        const { container } = render(<RichText text="[item=blueprint-book]" />)
        const img = container.querySelector('img')
        expect(img?.getAttribute('src')).toBe('https://www.factorio.school/icons/item/blueprint-book.png')
        expect(img?.getAttribute('title')).toBe('item: blueprint-book')
    })

    // Test quality parameter
    it('renders items with quality correctly', () => {
        const { container } = render(<RichText text="[item=iron-plate,quality=normal]" />)

        const wrapper = container.querySelector('.factorio-icon-group')
        expect(wrapper).toBeTruthy()

        const mainIcon = wrapper?.querySelector('.factorio-icon')
        expect(mainIcon?.getAttribute('src')).toBe('https://www.factorio.school/icons/item/iron-plate.png')

        const qualityIcon = wrapper?.querySelector('.quality')
        expect(qualityIcon?.getAttribute('src')).toBe('https://www.factorio.school/icons/quality/normal.png')
    })

    // Test entity tags with quality
    it('renders entities with quality correctly', () => {
        const { container } = render(<RichText text="[entity=small-biter,quality=uncommon]" />)

        const wrapper = container.querySelector('.factorio-icon-group')
        expect(wrapper).toBeTruthy()

        const mainIcon = wrapper?.querySelector('.factorio-icon')
        expect(mainIcon?.getAttribute('src')).toBe('https://www.factorio.school/icons/entity/small-biter.png')

        const qualityIcon = wrapper?.querySelector('.quality')
        expect(qualityIcon?.getAttribute('src')).toBe('https://www.factorio.school/icons/quality/uncommon.png')
    })

    // Test quality tags both as plain tags and as modifiers
    describe('quality tags', () => {
        it('renders plain quality tags correctly', () => {
            const qualities = ['normal', 'uncommon', 'rare', 'epic', 'legendary']
            const text = qualities.map(q => `[quality=${q}]`).join('')

            const { container } = render(
                <RichText text={text} />
            )

            const icons = container.querySelectorAll('img')
            expect(icons.length).toBe(qualities.length)

            qualities.forEach((quality, index) => {
                const icon = icons[index]
                expect(icon.getAttribute('src')).toBe(
                    `https://www.factorio.school/icons/quality/${quality}.png`
                )
            })
        })

        it('renders quality parameters on items correctly', () => {
            const qualities = ['normal', 'uncommon', 'rare', 'epic', 'legendary']
            const { container } = render(
                <RichText text={qualities.map(q => `[item=iron-plate,quality=${q}]`).join('')} />
            )

            const qualityIcons = container.querySelectorAll('.quality')
            expect(qualityIcons.length).toBe(qualities.length)

            qualities.forEach((quality, index) => {
                const icon = qualityIcons[index]
                expect(icon.getAttribute('src')).toBe(
                    `https://www.factorio.school/icons/quality/${quality}.png`
                )
            })
        })
    })

    // Test planet tags
    it('renders planet tags correctly', () => {
        const { container } = render(<RichText text="[planet=gleba]" />)
        const img = container.querySelector('img')
        expect(img?.getAttribute('src')).toBe('https://www.factorio.school/icons/space-location/gleba.png')
    })

    // Test planet/space-location tags
    describe('space location tags', () => {
        it('renders space location tags correctly', () => {
            const { container } = render(
                <RichText text="[space-location=solar-system-edge] [space-location=shattered-planet]" />
            )

            const imgs = container.querySelectorAll('img')
            expect(imgs.length).toBe(2)

            // Check first icon
            const firstIcon = imgs[0]
            expect(firstIcon.getAttribute('src')).toBe(
                'https://www.factorio.school/icons/space-location/solar-system-edge.png'
            )
            expect(firstIcon.getAttribute('title')).toBe('space-location: solar-system-edge')

            // Check second icon
            const secondIcon = imgs[1]
            expect(secondIcon.getAttribute('src')).toBe(
                'https://www.factorio.school/icons/space-location/shattered-planet.png'
            )
            expect(secondIcon.getAttribute('title')).toBe('space-location: shattered-planet')
        })

        it('renders planet tags as space-location icons', () => {
            const { container } = render(
                <RichText text="[planet=solar-system-edge]" />
            )

            const img = container.querySelector('img')
            expect(img).toBeTruthy()
            expect(img?.getAttribute('src')).toBe(
                'https://www.factorio.school/icons/space-location/solar-system-edge.png'
            )
            expect(img?.getAttribute('title')).toBe('planet: solar-system-edge')
        })
    })

    // Test virtual signal tags
    it('renders virtual signal tags correctly', () => {
        const { container } = render(<RichText text="[virtual-signal=signal-any-quality]" />)
        const img = container.querySelector('img')
        expect(img?.getAttribute('src')).toBe('https://www.factorio.school/icons/virtual-signal/signal-any-quality.png')
    })

    // Test color tags with different formats
    describe('color tags', () => {
        it('handles named colors', () => {
            const { container } = render(<RichText text="[color=red]Red text[/color]" />)
            const span = container.querySelector('span')
            expect(span?.style.color).toBe('rgb(235, 92, 95)') // #eb5c5f
            expect(span?.textContent).toBe('Red text')
        })

        it('handles RGB values 0-1', () => {
            const { container } = render(<RichText text="[color=1,0,0]Red text[/color]" />)
            const span = container.querySelector('span')
            expect(span?.style.color).toBe('rgb(255, 0, 0)')
        })

        it('handles RGB values 0-255', () => {
            const { container } = render(<RichText text="[color=255,0,0]Red text[/color]" />)
            const span = container.querySelector('span')
            expect(span?.style.color).toBe('rgb(255, 0, 0)')
        })

        it('handles hex colors', () => {
            const { container } = render(<RichText text="[color=#ff0000]Red text[/color]" />)
            const span = container.querySelector('span')
            expect(span?.style.color).toBe('rgb(255, 0, 0)')
        })
    })

    // Test font tags
    it('renders bold font correctly', () => {
        const { container } = render(<RichText text="[font=default-bold]Bold text[/font]" />)
        const span = container.querySelector('span')
        expect(span?.style.fontWeight).toBe('bold')
        expect(span?.textContent).toBe('Bold text')
    })

    // Test nested formatting
    it('handles nested formatting correctly', () => {
        const { container } = render(
            <RichText text="[color=red][font=default-bold]Bold red text[/font][/color]" />
        )
        const span = container.querySelector('span')
        expect(span?.style.color).toBe('rgb(235, 92, 95)') // #eb5c5f
        expect(span?.style.fontWeight).toBe('bold')
        expect(span?.textContent).toBe('Bold red text')
    })

    // Test complex mixed content
    it('handles mixed content correctly', () => {
        const complexText = '[item=iron-plate,quality=normal] Iron plate with [color=red]red[/color] text and [font=default-bold]bold[/font] styling'
        const { container } = render(<RichText text={complexText} />)

        // Should have the item icon with quality
        const wrapper = container.querySelector('.factorio-icon-group')
        expect(wrapper).toBeTruthy()

        // Should have colored text
        const colorSpan = container.querySelector('span[style*="color"]')
        expect(colorSpan?.style.color).toBe('rgb(235, 92, 95)') // #eb5c5f
        expect(colorSpan?.textContent).toBe('red')

        // Should have bold text
        const boldSpan = container.querySelector('span[style*="bold"]')
        expect(boldSpan?.style.fontWeight).toBe('bold')
        expect(boldSpan?.textContent).toBe('bold')
    })

    // Test invalid/malformed tags
    it('handles invalid tags gracefully', () => {
        const { container } = render(<RichText text="[invalid]test[/invalid]" />)
        expect(container.textContent).toBe('[invalid]test[/invalid]')
    })

    // Test unclosed tags
    it('handles unclosed tags gracefully', () => {
        const { container } = render(<RichText text="[color=red]text without closing tag" />)
        const span = container.querySelector('span')
        expect(span?.style.color).toBe('rgb(235, 92, 95)') // #eb5c5f
        expect(span?.textContent).toBe('text without closing tag')
    })
})