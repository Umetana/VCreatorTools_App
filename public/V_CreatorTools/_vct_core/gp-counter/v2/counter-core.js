(function (global) {
    'use strict';

    const STORAGE_KEY = 'vct:gp-multi-counter:v2:state';
    const FAVORITES_KEY = 'vct:gp-multi-counter:v2:favorites';
    const CHANNEL_NAME = 'vct:gp-multi-counter:v2:channel';
    const DATA_VERSION = 1;

    function clampNumber(value, fallback, min, max) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(max, Math.max(min, number));
    }

    function cleanText(value, fallback, maxLength) {
        const text = typeof value === 'string' ? value : fallback;
        return text.slice(0, maxLength);
    }

    function normalizeId(value, fallback) {
        const raw = cleanText(value, fallback, 64).trim();
        if (/^counter\d+$/i.test(raw)) return raw.toLowerCase();
        if (/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(raw)) return raw;
        return fallback;
    }

    function normalizeColor(value, fallback) {
        const color = cleanText(value, fallback, 64).trim();
        if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
        if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(color)) return color;
        return fallback;
    }

    function normalizeSize(value, fallback) {
        const number = clampNumber(parseFloat(value), parseFloat(fallback), 8, 300);
        return `${number}px`;
    }

    function createDefaultCounter(id) {
        const safeId = normalizeId(id, 'counter1');
        const suffix = safeId.replace(/^counter/i, '') || '1';
        return {
            id: safeId,
            label: `カウンター${suffix}`,
            count: 0,
            unit: '回',
            goalCount: 100,
            showGoal: false,
            bgColor: 'rgba(0,0,0,0.5)',
            borderColor: '#ffffff',
            textColor: '#ffffff',
            labelSize: '20px',
            countSize: '36px',
            isBold: true,
            isShadow: true,
            fontFamily: 'sans-serif'
        };
    }

    function normalizeCounter(source, fallbackId) {
        const base = createDefaultCounter(fallbackId);
        const input = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
        return {
            id: normalizeId(input.id, base.id),
            label: cleanText(input.label, base.label, 100),
            count: Math.trunc(clampNumber(input.count, base.count, 0, Number.MAX_SAFE_INTEGER)),
            unit: cleanText(input.unit, base.unit, 30),
            goalCount: Math.trunc(clampNumber(input.goalCount, base.goalCount, 0, Number.MAX_SAFE_INTEGER)),
            showGoal: Boolean(input.showGoal),
            bgColor: normalizeColor(input.bgColor, base.bgColor),
            borderColor: normalizeColor(input.borderColor, base.borderColor),
            textColor: normalizeColor(input.textColor, base.textColor),
            labelSize: normalizeSize(input.labelSize, base.labelSize),
            countSize: normalizeSize(input.countSize, base.countSize),
            isBold: input.isBold === undefined ? base.isBold : Boolean(input.isBold),
            isShadow: input.isShadow === undefined ? base.isShadow : Boolean(input.isShadow),
            fontFamily: cleanText(input.fontFamily, base.fontFamily, 200)
        };
    }

    function normalizeCounters(value, options) {
        const allowEmpty = Boolean(options && options.allowEmpty);
        if (!Array.isArray(value)) throw new TypeError('カウンターデータは配列である必要があります');
        const seen = new Set();
        const normalized = value.slice(0, 200).map((item, index) => {
            const counter = normalizeCounter(item, `counter${index + 1}`);
            if (seen.has(counter.id)) throw new TypeError(`IDが重複しています: ${counter.id}`);
            seen.add(counter.id);
            return counter;
        });
        if (!allowEmpty && normalized.length === 0) normalized.push(createDefaultCounter('counter1'));
        return normalized;
    }

    function parseCounters(text, options) {
        return normalizeCounters(JSON.parse(text), options);
    }

    function loadCounters(fallbackCount) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            return Array.from({ length: fallbackCount || 1 }, (_, index) => createDefaultCounter(`counter${index + 1}`));
        }
        try {
            const document = JSON.parse(saved);
            return normalizeCounters(Array.isArray(document) ? document : document.counters);
        } catch (error) {
            console.error('Counter data load error:', error);
            localStorage.setItem(`${STORAGE_KEY}_broken_${Date.now()}`, saved);
            return Array.from({ length: fallbackCount || 1 }, (_, index) => createDefaultCounter(`counter${index + 1}`));
        }
    }

    function saveCounters(counters, channel) {
        const normalized = normalizeCounters(counters);
        const previous = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        const state = {
            schema: 'vct.gp-multi-counter.state', schemaVersion: DATA_VERSION,
            revision: Number.isSafeInteger(previous?.revision) ? previous.revision + 1 : 1,
            updatedAt: Date.now(), counters: normalized
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        if (channel) console.warn('GPMultiCounter.saveCounters does not publish V2 messages; use CounterClient.commit().');
        return normalized;
    }

    function readUpdateMessage(event) {
        const message = event && event.data;
        if (!message || !['counter.snapshot', 'counter.changed'].includes(message.type)) return null;
        console.warn('GPMultiCounter.readUpdateMessage is deprecated in V2; use CounterClient.');
        return null;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        })[character]);
    }

    function getCounterId(locationObject) {
        const normalize = raw => {
            if (!raw) return null;
            const value = String(raw).trim();
            if (/^\d+$/.test(value)) return `counter${value}`;
            return normalizeId(value, null);
        };
        const query = normalize(new URLSearchParams(locationObject.search).get('id'));
        if (query) return query;
        const hash = normalize((locationObject.hash || '').replace(/^#/, ''));
        if (hash) return hash;
        const fileName = locationObject.pathname.split('/').pop() || '';
        const match = fileName.match(/counter(\d+)/i);
        return match ? `counter${match[1]}` : 'counter1';
    }

    global.GPMultiCounter = Object.freeze({
        STORAGE_KEY, FAVORITES_KEY, CHANNEL_NAME, DATA_VERSION,
        clampNumber, createDefaultCounter, normalizeCounter, normalizeCounters,
        parseCounters, loadCounters, saveCounters, readUpdateMessage,
        escapeHtml, getCounterId
    });
})(window);
