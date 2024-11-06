// src/components/BlueprintIcon.tsx
import type {SignalID} from '../parsing/types';

import {FactorioIcon} from './FactorioIcon';

export const SignalIcon = (signalID: SignalID) => {
    if (!signalID) {
        return <div className="placeholder"/>;
    }

    return <FactorioIcon {...signalID} />;
};
