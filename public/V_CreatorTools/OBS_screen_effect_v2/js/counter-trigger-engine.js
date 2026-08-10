/**
 * Stateless evaluator for validated GP Multi Counter V2 changes.
 */
class CounterTriggerEngine {
    processChanges(changes, buttons) {
        if (!Array.isArray(changes) || !Array.isArray(buttons)) return [];

        const triggered = [];
        changes.forEach((change) => {
            if (!change || !['increment', 'set'].includes(change.operation)) return;
            if (!change.previous || !change.current) return;
            const previous = change.previous.count;
            const current = change.current.count;
            if (!Number.isSafeInteger(previous) || !Number.isSafeInteger(current) || previous === current) return;

            buttons.forEach((button) => {
                const trigger = button?.params?.trigger;
                if (!trigger || trigger.linkedId !== change.id) return;
                if (this.matches(trigger, previous, current)) {
                    triggered.push({
                        button,
                        counterId: change.id,
                        operation: change.operation,
                        previous,
                        current
                    });
                }
            });
        });
        return triggered;
    }

    matches(trigger, previous, current) {
        if (trigger.type === 'increment') return current > previous;
        if (trigger.type === 'reach') return current >= trigger.value && previous < trigger.value;
        if (trigger.type === 'interval') {
            return current > 0 && Math.floor(current / trigger.value) > Math.floor(previous / trigger.value);
        }
        return false;
    }
}

window.CounterTriggerEngine = CounterTriggerEngine;
