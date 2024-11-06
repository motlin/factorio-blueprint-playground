import {parseVersion} from '../parsing/blueprintParser';
import {getErrorMessage} from '../parsing/errors';

export const Version = ({number}: { number: number }) => {
    try {
        const version = parseVersion(number);
        return (
            <span className="p2 text-right">
                {version}
            </span>
        );
    } catch (error: unknown) {
        return (
            <span className="p2 text-right">
                Invalid version: {getErrorMessage(error)}
            </span>
        );
    }
};
