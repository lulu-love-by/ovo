const UwUFunctionPanelOrder115 = (() => {
    const columns = 4;
    const slots = 8;
    const field = 'functionPanelOrder115';
    const kinds = ['private', 'group'];
    const copy = pages => pages.map(page => [...page]);
    let currentCancel;

    function layout(items, defaultPages, kind) {
        const saved = db[field]?.[kind];
        const byId = new Map(items.map(item => [item.id, item]));
        const defaults = defaultPages.map(page => page.map(item => item.id));
        if (!Array.isArray(saved) || !saved.length) return {byId, defaults, pages: defaults, custom: false};

        const seen = new Set();
        const pages = Array.from({length: Math.max(defaults.length, Math.min(30, saved.length))}, (_, page) =>
            Array.from({length: slots}, (_, index) => {
                const id = saved[page]?.[index];
                if (!byId.has(id) || seen.has(id)) return null;
                seen.add(id);
                return id;
            }));
        defaults.forEach((page, pageIndex) => page.forEach(id => {
            if (seen.has(id)) return;
            let target = pages[pageIndex];
            if (!target?.includes(null)) target = pages.find(row => row.includes(null));
            if (!target) {
                target = Array(slots).fill(null);
                pages.push(target);
            }
            target[target.indexOf(null)] = id;
        }));
        return {byId, defaults, pages, custom: true};
    }

    function mount(container, wrapper, pagination, config, kind) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'function-order-button';
        button.textContent = '确认';
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'function-order-button function-order-cancel';
        cancel.textContent = '取消';
        const actions = document.createElement('div');
        actions.className = 'function-order-actions';
        actions.hidden = true;
        actions.append(cancel, button);
        container.append(actions);

        let pages = config.pages;
        let draft = null;
        let drag = null;
        let press = null;
        let pressTimer;
        let saving = false;
        const slides = () => Array.from(wrapper.children);
        const pageIndex = () => Math.max(0, Math.min(wrapper.children.length - 1,
            Math.round(wrapper.scrollLeft / (wrapper.offsetWidth || 1))));
        const jump = index => {
            const behavior = wrapper.style.scrollBehavior;
            wrapper.style.scrollBehavior = 'auto';
            wrapper.scrollLeft = index * wrapper.offsetWidth;
            wrapper.style.scrollBehavior = behavior;
            Array.from(pagination.children).forEach((dot, i) => dot.classList.toggle('active', i === index));
        };
        function paint(order, slotsEnabled) {
            const page = pageIndex();
            for (const slide of slides()) slide.replaceChildren();
            order.forEach((ids, index) => {
                const slide = wrapper.children[index];
                ids.forEach((id, slot) => {
                    const item = config.byId.get(id);
                    if (!item) return;
                    item.style.gridColumn = slotsEnabled ? String(slot % columns + 1) : '';
                    item.style.gridRow = slotsEnabled ? String(Math.floor(slot / columns) + 1) : '';
                    slide.append(item);
                });
            });
            jump(page);
        }
        function finishDrag(commit) {
            if (!drag) return;
            const active = drag;
            drag = null;
            clearTimeout(active.edgeTimer);
            active.preview.remove();
            active.marker.remove();
            active.item.classList.remove('function-order-source');
            if (active.kind === 'pointer' && wrapper.hasPointerCapture(active.pointer)) wrapper.releasePointerCapture(active.pointer);
            if (commit && active.moved && active.to) {
                const {index, slot} = active.to;
                const previous = draft[index][slot];
                draft[index][slot] = active.item.id;
                draft[active.from.index][active.from.slot] = previous;
                paint(draft, true);
            }
            wrapper.classList.remove('function-order-dragging');
            if (commit) jump(pageIndex());
        }
        function exit() {
            if (!draft || saving) return;
            clearPress();
            finishDrag(false);
            draft = null;
            if (currentCancel === exit) currentCancel = null;
            delete container.dataset.functionSorting;
            actions.hidden = true;
            paint(pages, config.custom);
        }
        cancel.addEventListener('click', exit);
        function enter() {
            currentCancel?.();
            currentCancel = exit;
            draft = pages.map(page => Array.from({length: slots}, (_, index) => page[index] ?? null));
            container.dataset.functionSorting = 'true';
            actions.hidden = false;
            // Keep the pressed icon in its original DOM position until the gesture ends.
            draft.forEach(row => row.forEach((id, slot) => {
                const item = config.byId.get(id);
                if (!item) return;
                item.style.gridColumn = String(slot % columns + 1);
                item.style.gridRow = String(Math.floor(slot / columns) + 1);
            }));
            if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('light');
        }
        button.addEventListener('click', async () => {
            if (!draft || saving) return;

            finishDrag(false);
            if (draft.every((row, page) => row.every((id, index) => id === (pages[page][index] ?? null)))) {
                exit();
                return;
            }
            const owner = db;
            const before = owner[field];
            owner[field] = {...before, [kind]: copy(draft)};
            saving = true;
            button.disabled = cancel.disabled = true;
            try {
                await saveData();
                pages = draft;
                config.custom = true;
            } catch (error) {
                if (db === owner) {
                    if (before) owner[field] = before;
                    else delete owner[field];
                }
                showToast(error?.message || '排序保存失败');
                return;
            } finally {
                saving = false;
                button.disabled = cancel.disabled = false;
            }
            exit();
        });
        wrapper.addEventListener('click', event => {
            if (!draft || !event.target.closest('.expansion-item')) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        }, true);
        wrapper.addEventListener('keydown', event => {
            if (!draft) return;
            if (event.key === 'Escape') exit();
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);

        function updateTarget() {
            if (!drag) return;
            const box = wrapper.getBoundingClientRect();
            const {x, y} = drag;
            const index = pageIndex();
            const edgeWidth = Math.min(30, box.width * .1);
            const inside = y >= box.top && y <= box.bottom && x >= box.left && x <= box.right;
            const edge = !inside ? 0 : x < box.left + edgeWidth ? -1 : x > box.right - edgeWidth ? 1 : 0;
            if (drag.edge !== edge) {
                clearTimeout(drag.edgeTimer);
                drag.edge = edge;
                if (edge && draft[index + edge]) {
                    drag.edgeTimer = setTimeout(() => {
                        jump(index + edge);
                        updateTarget();
                    }, 600);
                }
            }
            drag.to = null;
            drag.marker.style.display = 'none';
            if (!inside || edge) return;
            const grid = wrapper.children[index];
            const rect = grid.getBoundingClientRect();
            const css = getComputedStyle(grid);
            const colWidths = css.gridTemplateColumns.split(' ').map(parseFloat);
            const rowHeights = css.gridTemplateRows.split(' ').map(parseFloat);
            const column = track(rect.left + parseFloat(css.paddingLeft), colWidths, parseFloat(css.columnGap) || 0, x);
            const row = track(rect.top + parseFloat(css.paddingTop), rowHeights, parseFloat(css.rowGap) || 0, y);
            if (!column || !row || column.index >= columns || row.index >= slots / columns) return;
            const slot = row.index * columns + column.index;
            drag.to = {index, slot};
            const target = config.byId.get(draft[index][slot]);
            const bounds = (target || drag.item).getBoundingClientRect();
            const width = Math.min(column.size, bounds.width + 8);
            const height = bounds.height + 8;
            Object.assign(drag.marker.style, {
                display: 'block',
                left: column.start + (column.size - width) / 2 + 'px',
                top: row.start - 4 + 'px',
                width: width + 'px', height: height + 'px'
            });
        }
        function track(start, sizes, gap, point) {
            for (const [index, size] of sizes.entries()) {
                if (point >= start - gap / 2 && point <= start + size + gap / 2) return {index, start, size};
                start += size + gap;
            }
            return null;
        }
        function clearPress() {
            clearTimeout(pressTimer);
            press = null;
        }
        function begin(event, point, kind, pointer) {
            if (!point || press || drag || saving) return;
            const item = event.target.closest('.function-slide > .expansion-item');
            if (!item || !config.byId.has(item.id)) return;
            press = {item, kind, pointer, x:point.clientX, y:point.clientY};
            if (draft) {
                if (event.cancelable) event.preventDefault();
                activate();
            } else {
                pressTimer = setTimeout(activate, 450);
            }
        }
        function activate() {
            const seed = press;
            clearPress();
            if (!seed || !seed.item.isConnected || !wrapper.offsetWidth ||
                !container.closest('#chat-expansion-panel.visible')) return;
            const {item, kind, pointer, x, y} = seed;
            const index = pageIndex();
            const pressedRect = item.getBoundingClientRect();
            const pressedIcon = item.querySelector('.expansion-item-icon')?.getBoundingClientRect();
            if (!draft) enter();
            const slot = draft[index].indexOf(item.id);
            if (slot < 0) return;
            if (kind === 'pointer') wrapper.setPointerCapture(pointer);
            const rect = item.getBoundingClientRect();
            const top = pressedIcon?.top ?? pressedRect.top;
            const preview = item.cloneNode(true);
            for (const node of [preview, ...preview.querySelectorAll('[id]')]) node.removeAttribute('id');
            preview.classList.add('function-order-preview');
            preview.setAttribute('aria-hidden', 'true');
            const marker = document.createElement('div');
            marker.className = 'function-order-target';
            marker.setAttribute('aria-hidden', 'true');
            Object.assign(preview.style, {
                left: pressedRect.left + (pressedRect.width - rect.width) / 2 + 'px',
                top: top + 'px', width: rect.width + 'px'
            });
            const icon = item.querySelector('.expansion-item-icon');
            const previewIcon = preview.querySelector('.expansion-item-icon');
            if (icon && previewIcon) {
                const {width, height, marginBottom} = getComputedStyle(icon);
                Object.assign(previewIcon.style, {width, height, marginBottom});
            }
            document.body.append(marker, preview);
            item.classList.add('function-order-source');
            wrapper.classList.add('function-order-dragging');
            drag = {item, preview, marker, kind, pointer, from: {index, slot}, x, y, initialX:x, initialY:y, edge:0};
            updateTarget();
        }
        function move(event, point, kind, pointer) {
            if (!point) return;
            if (press?.kind === kind && press.pointer === pointer &&
                Math.hypot(point.clientX - press.x, point.clientY - press.y) > 9) clearPress();
            if (drag?.kind !== kind || drag.pointer !== pointer) return;
            if (event.cancelable) event.preventDefault();
            drag.x = point.clientX;
            drag.y = point.clientY;
            if (Math.hypot(drag.x - drag.initialX, drag.y - drag.initialY) > 4) drag.moved = true;
            drag.preview.style.transform = `translate(${drag.x - drag.initialX}px,${drag.y - drag.initialY}px)`;
            updateTarget();
        }
        function end(event, point, kind, pointer, commit) {
            if (press?.kind === kind && press.pointer === pointer) clearPress();
            if (drag?.kind !== kind || drag.pointer !== pointer) return;
            if (event.cancelable) event.preventDefault();
            if (commit && point) {
                drag.x = point.clientX;
                drag.y = point.clientY;
                updateTarget();
            }
            finishDrag(commit);
        }
        wrapper.addEventListener('contextmenu', event => {
            if (event.target.closest('.expansion-item')) event.preventDefault();
        });
        wrapper.addEventListener('pointerdown', event => {
            if (event.pointerType !== 'touch' && event.isPrimary && event.button === 0) {
                begin(event, event, 'pointer', event.pointerId);
            }
        });
        wrapper.addEventListener('pointermove', event => move(event, event, 'pointer', event.pointerId));
        wrapper.addEventListener('pointerup', event => end(event, event, 'pointer', event.pointerId, true));
        wrapper.addEventListener('pointerleave', event => {
            if (press?.kind === 'pointer' && press.pointer === event.pointerId) clearPress();
        });
        for (const name of ['pointercancel', 'lostpointercapture']) {
            wrapper.addEventListener(name, event => end(event, null, 'pointer', event.pointerId, false));
        }
        wrapper.addEventListener('touchstart', event => {
            if (event.touches.length !== 1) { clearPress(); finishDrag(false); return; }
            const point = event.changedTouches[0];
            if (point) begin(event, point, 'touch', point.identifier);
        }, {passive:false});
        wrapper.addEventListener('touchmove', event => {
            const active = drag || press;
            if (active?.kind !== 'touch') return;
            const point = Array.from(event.changedTouches).find(touch => touch.identifier === active.pointer);
            if (point) move(event, point, 'touch', point.identifier);
        }, {passive:false});
        for (const name of ['touchend', 'touchcancel']) {
            wrapper.addEventListener(name, event => {
                const active = drag || press;
                if (active?.kind !== 'touch') return;
                const point = Array.from(event.changedTouches).find(touch => touch.identifier === active.pointer);
                if (point) end(event, point, 'touch', point.identifier, name === 'touchend');
            }, {passive:false});
        }
    }
    return {layout, mount, cancel: () => currentCancel?.(), kind: value => kinds.includes(value) ? value : 'private'};
})();
