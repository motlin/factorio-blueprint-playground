import React from 'react';
import {FactorioIcon} from "./FactorioIcon.tsx";

// Map of named colors to hex values
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

interface GameIcon {
    type: string;
    name: string;
    quality?: string;
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

const GameIconImage = ({ icon }: { icon: GameIcon }) => {
    let urlType = icon.type;
    // Remap 'virtual' type to 'virtual-signal' for URL
    if (urlType === 'virtual') {
        urlType = 'virtual-signal';
    }

    return (
        <span className="richtext-icon">
            <img
                src={`https://www.factorio.school/icons/${urlType}/${icon.name}.png`}
                alt={`${icon.type}: ${icon.name}`}
                title={`${icon.type}: ${icon.name}`}
                className="icon"
                style={{ width: '1em', height: '1em' }}
            />
            {icon.quality && (
                <img
                    src={`https://www.factorio.school/icons/virtual-signal/signal-${icon.quality}.png`}
                    alt={icon.quality}
                    title={icon.quality}
                    className="quality"
                />
            )}
        </span>
    );
};

interface RichTextProps {
    text: string;
}

export const RichText = ({ text }: RichTextProps) => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let currentColor: string | undefined;
    let isBold = false;

    // Combined regex for all supported tags
    const tagRegex = /\[(color=([^\]]+)|font=([^\]]+)|(\/?)(color|font)|(?:item|fluid|virtual-signal|entity|technology|recipe|achievement|quality)=([^\]]+))\]/g;
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

        // Process tag
        if (match[2]) {
            // Color start tag
            currentColor = match[2];
        } else if (match[3]) {
            // Font start tag
            isBold = match[3].includes('bold');
        } else if (match[4] === '/') {
            // End tag
            if (match[5] === 'color') currentColor = undefined;
            if (match[5] === 'font') isBold = false;
        } else if (match[6]) {
            // Game icon tag
            const type = match[0].substring(1, match[0].indexOf('='));
            const name = match[6];
            parts.push(
                <FactorioIcon
                    key={parts.length}
                    icon={{
                        type,
                        name,
                    }}
                />
            );
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
