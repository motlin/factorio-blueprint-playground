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

interface RichTextProps {
    text: string;
}

export const RichText = ({ text }: RichTextProps) => {
    // Early return for empty text
    if (!text) return null;

    const parts = [];
    let currentIndex = 0;
    let currentColor: string | undefined;
    let isBold = false;

    // Regex for Factorio rich text tags
    const tagRegex = /\[(color=([^\]]+)|font=([^\]]+)|(\/?)(color|font))\]/g;
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

        // Process the tag
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
