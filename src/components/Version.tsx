import { parseVersion } from '../parsing/blueprintParser';

export const Version = ({ number }: { number: number }) => {
    try {
        const version = parseVersion(number);
        return (
            <span className="p2 text-right">
        {version}
      </span>
        );
    } catch (error) {
        return (
            <span className="p2 text-right">
        Invalid version
      </span>
        );
    }
};
