import React, {createContext, useState} from 'react';

import {blueprintStorage, DatabaseBlueprint} from '../storage/blueprints';

interface BlueprintContextType {
	currentBlueprint: DatabaseBlueprint | null;
	setCurrentBlueprint: (blueprint: DatabaseBlueprint | null) => void;
}

export const BlueprintContext = createContext<BlueprintContextType>({
	currentBlueprint: null,
	setCurrentBlueprint: () => {},
});

export async function updateBlueprint(
	createdOn: number,
	changes: Partial<Omit<DatabaseBlueprint, 'createdOn'>>,
	setCurrentBlueprint: (blueprint: DatabaseBlueprint | null) => void,
	currentBlueprint: DatabaseBlueprint | null,
): Promise<DatabaseBlueprint | null> {
	const updated = await blueprintStorage.update(createdOn, changes);
	if (!updated) return null;

	if (currentBlueprint?.createdOn === createdOn) {
		setCurrentBlueprint(updated);
	}

	return updated;
}

export async function deleteBlueprint(
	createdOn: number,
	setCurrentBlueprint: (blueprint: DatabaseBlueprint | null) => void,
	currentBlueprint: DatabaseBlueprint | null,
): Promise<void> {
	await blueprintStorage.remove(createdOn);

	if (currentBlueprint?.createdOn === createdOn) {
		setCurrentBlueprint(null);
	}
}

export function BlueprintProvider(props: {children: React.ReactNode}): React.ReactElement {
	const [currentBlueprint, setCurrentBlueprint] = useState<DatabaseBlueprint | null>(null);

	const contextValue: BlueprintContextType = {
		currentBlueprint,
		setCurrentBlueprint,
	};

	return React.createElement(BlueprintContext.Provider, {value: contextValue}, props.children);
}
