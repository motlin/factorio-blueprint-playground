import {parseVersion} from '../parsing/blueprintParser';
import {getErrorMessage} from '../parsing/errors';

const getVersionText = (number: number): string => {
	try {
		const version = parseVersion(number);
		return version.split('.').slice(0, 3).join('.');
	} catch (error: unknown) {
		return `Invalid version: ${getErrorMessage(error)}`;
	}
};

export const Version = ({number}: {number: number}) => {
	const text = getVersionText(number);
	return <span className="p2 text-right">{text}</span>;
};
