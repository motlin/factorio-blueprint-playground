import type {BlueprintString} from '../../../parsing/types';

export interface TreeNode {
	path: string;
	blueprint: BlueprintString;
	children: TreeNode[];
}
