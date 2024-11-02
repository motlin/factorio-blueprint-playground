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

interface StyledTextProps {
    text: string;
    color?: string;
    bold?: boolean;
}

const StyledText = ({ text, color, bold }: StyledTextProps) => (
    <span
        style={{
            color: COLOR_MAP[color?.toLowerCase()] || color,
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
