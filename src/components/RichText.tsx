import React from 'react';
import { FactorioIcon } from "./FactorioIcon";

const COLOR_MAP: Record<string, string> = {
    'red': '#eb5c5f',
    'green': '#5eb663',
    'blue': '#7dcaed',
    'yellow': '#ffe6c0',
    'pink': '#ff8097',
    'purple': '#9c84d4',
    'white': '#ffffff',
    'black': '#000000',
    'brown': '#ab8264',
    'cyan': '#68ffff',
    'acid': '#80ff00',
};

function parseColor(color: string): string | undefined {
    // Handle empty/undefined
    if (!color) return undefined;

    // Handle named colors
    const namedColor = COLOR_MAP[color.toLowerCase()];
    if (namedColor) return namedColor;

    // Handle hex colors (#rrggbb or #rgb)
    if (color.startsWith('#')) return color;

    // Handle rgb values
    const parts = color.split(',').map(part => part.trim());
    if (parts.length === 3) {
        // Try parsing as 0-1 range first
        const rgb01 = parts.map(n => parseFloat(n));
        if (rgb01.every(n => !isNaN(n) && n >= 0 && n <= 1)) {
            return `rgb(${rgb01.map(n => Math.round(n * 255)).join(',')})`;
        }

        // Try parsing as 0-255 range
        const rgb255 = parts.map(n => parseInt(n));
        if (rgb255.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
            return `rgb(${rgb255.join(',')})`;
        }
    }

    // Return as-is if no other format matches
    return color;
}

interface StyledTextProps {
    text: string;
    color?: string;
    bold?: boolean;
}

const StyledText = ({ text, color, bold }: StyledTextProps) => (
    <span
        style={{
            color: parseColor(color),
            fontWeight: bold ? 'bold' : 'normal',
        }}
    >
    {text}
  </span>
);

export const RichText = ({ text }: { text: string }) => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let currentColor: string | undefined;
    let isBold = false;

    // Enhanced regex that captures quality parameter
    const tagRegex = /\[((?:color|font)=([^\]]+)|(?:\/?(?:color|font))|(?:img|item|fluid|virtual-signal|entity|technology|recipe|item-group|tile|achievement|quality|gps|special-item|armor|train|train-stop|tooltip|planet)=([^,\]]+)(?:,quality=([^,\]]+))?)\]/g;

    let match;

    while ((match = tagRegex.exec(text)) !== null) {
        // Add text before the tag
        if (match.index > currentIndex) {
            parts.push(
                <StyledText
                    key={parts.length}
                    text={text.slice(currentIndex, match.index)}
                    color={currentColor}
                    bold={isBold}
                />
            );
        }

        if (match[2]) {
            // Color/font start tag
            if (match[1].startsWith('color=')) {
            currentColor = match[2];
            } else if (match[1].startsWith('font=')) {
                isBold = match[2].includes('bold');
            }
        } else if (match[1] === '/color' || match[1] === '/font') {
            // End tags
            if (match[1] === '/color') currentColor = undefined;
            if (match[1] === '/font') isBold = false;
        } else if (match[3]) {
            // Game icon or special tag
            const type = match[1].split('=')[0];
            const value = match[3];
            const quality = match[4]; // Capture quality parameter if present

            switch (type) {
                case 'img': {
                    // Parse path format "type/name"
                    const [imgType, imgName] = value.split('/');
                    parts.push(
                        <FactorioIcon
                            key={parts.length}
                            icon={{
                                type: imgType,
                                name: imgName,
                                quality: quality
                            }}
                        />
                    );
                    break;
                }
                case 'item':
                case 'fluid':
                case 'virtual-signal':
                case 'entity':
                case 'technology':
                case 'recipe':
                case 'item-group':
                case 'tile':
                case 'achievement':
                case 'quality':
                case 'planet':
            parts.push(
                <FactorioIcon
                    key={parts.length}
                    icon={{
                        type,
                                name: value,
                                quality: quality
                    }}
                />
            );
                    break;
                // We could add special handling for gps, special-item, armor, train, etc. here
                default:
                    // For unhandled tags, just render them as text
                    parts.push(
                        <StyledText
                            key={parts.length}
                            text={match[0]}
                            color={currentColor}
                            bold={isBold}
                        />
                    );
            }
        }

        currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
        parts.push(
            <StyledText
                key={parts.length}
                text={text.slice(currentIndex)}
                color={currentColor}
                bold={isBold}
            />
        );
    }

    return <>{parts}</>;
};
