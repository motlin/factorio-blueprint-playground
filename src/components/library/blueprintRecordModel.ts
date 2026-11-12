import type {BlueprintGameData, DatabaseBlueprintType} from '../../storage/db';

export enum BlueprintRecordViewMode {
	List = 'list',
	Grid = 'grid',
	Slots = 'slots',
}

export const BLUEPRINT_RECORD_VIEW_STORAGE_KEY = 'factorio-blueprint-record-view';

export interface BlueprintRecordModel {
	id: string;
	gameData: BlueprintGameData;
}

export const BLUEPRINT_RECORD_TYPE_LABELS: Record<DatabaseBlueprintType, string> = {
	blueprint: 'Blueprint',
	blueprint_book: 'Blueprint book',
	upgrade_planner: 'Upgrade planner',
	deconstruction_planner: 'Deconstruction planner',
};

export function blueprintRecordLabel(record: BlueprintRecordModel): string {
	const label = record.gameData.label?.trim();
	return label === undefined || label === ''
		? `Untitled ${BLUEPRINT_RECORD_TYPE_LABELS[record.gameData.type].toLowerCase()}`
		: label;
}

export function filterAndSortBlueprintRecords<RecordModel extends BlueprintRecordModel>(
	records: readonly RecordModel[],
	searchText: string,
	compareRecords?: (left: RecordModel, right: RecordModel) => number,
): RecordModel[] {
	const normalizedSearch = searchText.trim().toLocaleLowerCase();
	return records
		.map((record, sourceIndex) => ({record, sourceIndex}))
		.filter(({record}) => {
			if (normalizedSearch === '') {
				return true;
			}
			const label = record.gameData.label?.toLocaleLowerCase() ?? '';
			const description = record.gameData.description?.toLocaleLowerCase() ?? '';
			return label.includes(normalizedSearch) || description.includes(normalizedSearch);
		})
		.sort((left, right) => {
			const comparison = compareRecords?.(left.record, right.record) ?? 0;
			return comparison === 0 ? left.sourceIndex - right.sourceIndex : comparison;
		})
		.map(({record}) => record);
}
