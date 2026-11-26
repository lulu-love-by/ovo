// Extra time metadata for custom CSS. The chat renderer owns the displayed text.
const UwUChatTime115 = (() => {
    const nodes = new WeakMap();
    const themeOptions = new WeakMap();
    const off = {enabled: false, limits: []};
    const marker = '[data-uwu-time115]';
    const absoluteKeys = ['timestamp', 'year', 'month', 'day', 'weekday', 'hour24', 'hour12', 'minute', 'second', 'period'];
    const relativeKeys = ['relativeValue', 'relativeUnit', 'elapsedSeconds'];
    const pad = value => String(value).padStart(2, '0');

    function set(node, field, value) {
        if (value == null) {
            if (node.dataset[field] !== undefined) delete node.dataset[field];
        } else if (node.dataset[field] !== String(value)) {
            node.dataset[field] = String(value);
        }
    }

    function options(chat) {
        if (!chat?.useCustomBubbleCss) return off;
        const css = chat.customBubbleCss || '';
        const cached = themeOptions.get(chat);
        if (cached?.css === css) return cached;
        const values = new Set();
        for (const declaration of css.matchAll(/\/\*\s*uwu-time-thresholds\s*:\s*([\d,\s]+)\*\//gi)) {
            for (const field of declaration[1].split(',')) {
                const seconds = Number(field.trim());
                if (Number.isSafeInteger(seconds) && seconds > 0) values.add(seconds);
                if (values.size >= 32) break;
            }
            if (values.size >= 32) break;
        }
        const config = {
            css,
            enabled: values.size > 0 || /\/\*\s*uwu-time-data\s*\*\//i.test(css) ||
                /\[\s*data-uwu-time115\s*\]/i.test(css),
            limits: [...values]
        };
        themeOptions.set(chat, config);
        return config;
    }

    function enabled(chat) {
        return options(chat).enabled;
    }

    function clearFields(node, legacyTimestamp) {
        for (const key of absoluteKeys) {
            if (key !== 'timestamp' || !legacyTimestamp) set(node, key, null);
        }
        for (const key of relativeKeys) set(node, key, null);
    }

    function clear(node) {
        const previous = nodes.get(node);
        if (!previous) return;
        clearFields(node, previous.legacyTimestamp);
        for (const limit of previous.limits) node.removeAttribute('data-time-under-' + limit);
        node.removeAttribute('data-uwu-time115');
        set(node, 'timeValid', null);
        nodes.delete(node);
    }

    function clearWithin(root) {
        if (!root) return;
        clear(root);
        for (const node of root.querySelectorAll(marker)) clear(node);
    }

    function elapsed(timestamp, now) {
        const milliseconds = Math.max(0, now - timestamp);
        return {
            seconds: Math.floor(milliseconds / 1000),
            minutes: Math.floor(milliseconds / 60000)
        };
    }

    function refresh(node, now = Date.now()) {
        const bound = nodes.get(node);
        if (!bound?.timestamp) return;
        const {seconds, minutes} = elapsed(bound.timestamp, now);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const [value, unit] = days >= 365 ? [Math.floor(days / 365), 'year']
            : days >= 30 ? [Math.floor(days / 30), 'month']
            : days >= 1 ? [days, 'day']
            : hours >= 1 ? [hours, 'hour']
            : minutes >= 1 ? [minutes, 'minute']
            : [seconds, 'second'];
        set(node, 'relativeValue', value);
        set(node, 'relativeUnit', unit);
        set(node, 'elapsedSeconds', seconds);
        for (const limit of bound.limits) {
            const attribute = 'data-time-under-' + limit;
            const matches = seconds < limit;
            if (node.hasAttribute(attribute) !== matches) node.toggleAttribute(attribute, matches);
        }
    }

    function bind(node, stamp, chat, legacyTimestamp = false) {
        if (!node) return;
        const config = options(chat);
        if (!config.enabled) {
            clear(node);
            return;
        }
        const previous = nodes.get(node);
        const limits = stamp ? config.limits : off.limits;
        if (previous && previous.limits !== limits) {
            for (const limit of previous.limits) {
                if (!limits.includes(limit)) node.removeAttribute('data-time-under-' + limit);
            }
        }
        set(node, 'uwuTime115', '');
        set(node, 'timeValid', !!stamp);
        nodes.set(node, {timestamp: stamp?.timestamp, limits, legacyTimestamp});
        if (!stamp) {
            clearFields(node, legacyTimestamp);
            return;
        }
        if (previous?.timestamp !== stamp.timestamp) {
            const date = new Date(stamp.timestamp);
            const hour = date.getHours();
            const fields = {
                timestamp: stamp.timestamp,
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
                weekday: date.getDay(),
                hour24: hour,
                hour12: hour % 12 || 12,
                minute: pad(date.getMinutes()),
                second: pad(date.getSeconds()),
                period: hour < 12 ? 'AM' : 'PM'
            };
            for (const [field, value] of Object.entries(fields)) set(node, field, value);
        }
        refresh(node);
    }

    function refreshWithin(root, now) {
        if (!root) return;
        refresh(root, now);
        for (const node of root.querySelectorAll(marker)) refresh(node, now);
    }

    return {bind, enabled, elapsed, refresh, refreshWithin, clearWithin};
})();
