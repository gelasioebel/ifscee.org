(function () {
    const root = document.documentElement;
    const themeBtn = document.getElementById('btn-theme');

    function syncThemeIcon() {
        if (!themeBtn) return;
        const dark = root.dataset.theme === 'dark';
        themeBtn.textContent = dark ? '☀️' : '🌙';
        themeBtn.title = dark ? 'Tema claro' : 'Tema escuro';
    }
    syncThemeIcon();

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
            root.dataset.theme = next;
            try { localStorage.setItem('ifscee-theme', next); } catch (e) { /* ignore */ }
            syncThemeIcon();
        });
    }
})();

(function () {
    const dialog = document.getElementById('modal-exemplos');
    const opener = document.getElementById('btn-open-examples');
    const dropdown = document.getElementById('examples-dropdown');
    if (!dialog || !opener || !dropdown) return;

    opener.addEventListener('click', () => {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    });

    dialog.addEventListener('click', (event) => {
        const card = event.target.closest('[data-exemplo]');
        if (card) {
            dropdown.value = card.dataset.exemplo;
            dropdown.dispatchEvent(new Event('change'));
            dialog.close();
            return;
        }
        if (event.target.matches('[data-close-modal]') || event.target === dialog) {
            dialog.close();
        }
    });
})();

(function () {
    const editor = document.getElementById('code-editor');
    const storage = window.IFSCeeStorage;
    if (!editor || !storage) return;

    storage.getDraft().then((draft) => {
        if (draft && typeof draft.code === 'string' && draft.code.length > 0) {
            editor.value = draft.code;
        }
    }).catch((err) => console.warn('Storage: could not restore draft', err));

    let timer = null;
    editor.addEventListener('input', () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            storage.setDraft(editor.value).catch((err) => console.warn('Storage: autosave failed', err));
        }, 500);
    });
})();

(function () {
    const editor = document.getElementById('code-editor');
    const storage = window.IFSCeeStorage;
    const list = document.getElementById('file-list');
    const btnNew = document.getElementById('btn-new-file');
    const btnSaveAs = document.getElementById('btn-save-as');
    if (!editor || !storage || !list) return;

    let activeName = null;

    async function refresh() {
        try {
            const files = await storage.listFiles();
            renderList(files);
        } catch (err) {
            console.warn('Storage: listFiles failed', err);
        }
    }

    function renderList(files) {
        list.innerHTML = '';
        if (!files.length) {
            const empty = document.createElement('li');
            empty.className = 'file-list__empty';
            empty.textContent = 'Nenhum arquivo salvo';
            list.appendChild(empty);
            return;
        }
        for (const f of files) {
            const li = document.createElement('li');
            li.className = 'file-item' + (f.name === activeName ? ' file-item--active' : '');
            li.dataset.name = f.name;

            const icon = document.createElement('span');
            icon.className = 'file-item__icon';
            icon.textContent = '📄';

            const name = document.createElement('span');
            name.className = 'file-item__name';
            name.textContent = f.name;

            const remove = document.createElement('span');
            remove.className = 'file-item__remove';
            remove.title = 'Apagar';
            remove.textContent = '🗑️';

            li.appendChild(icon);
            li.appendChild(name);
            li.appendChild(remove);
            list.appendChild(li);
        }
    }

    list.addEventListener('click', async (event) => {
        const item = event.target.closest('.file-item');
        if (!item) return;
        const name = item.dataset.name;

        if (event.target.classList.contains('file-item__remove')) {
            if (!confirm('Apagar "' + name + '"?')) return;
            try {
                await storage.deleteFile(name);
                if (activeName === name) activeName = null;
                refresh();
            } catch (err) { console.warn('deleteFile failed', err); }
            return;
        }

        try {
            const f = await storage.loadFile(name);
            if (f && typeof f.code === 'string') {
                storage.setDraft(editor.value).catch(() => {});
                editor.value = f.code;
                storage.setDraft(f.code).catch(() => {});
                activeName = name;
                list.querySelectorAll('.file-item--active').forEach((el) => el.classList.remove('file-item--active'));
                item.classList.add('file-item--active');
            }
        } catch (err) { console.warn('loadFile failed', err); }
    });

    if (btnNew) {
        btnNew.disabled = false;
        btnNew.title = 'Novo arquivo';
        btnNew.addEventListener('click', () => {
            editor.value = '';
            storage.setDraft('').catch(() => {});
            activeName = null;
            list.querySelectorAll('.file-item--active').forEach((el) => el.classList.remove('file-item--active'));
            editor.focus();
        });
    }

    if (btnSaveAs) {
        btnSaveAs.addEventListener('click', async () => {
            const suggested = activeName || '';
            const raw = prompt('Salvar como (nome do arquivo):', suggested);
            if (raw === null) return;
            const name = raw.trim();
            if (!name) return;
            try {
                const existing = await storage.loadFile(name);
                if (existing && name !== activeName) {
                    if (!confirm('Já existe um arquivo "' + name + '". Sobrescrever?')) return;
                }
                await storage.saveFile(name, editor.value);
                activeName = name;
                refresh();
            } catch (err) {
                console.warn('saveFile failed', err);
                alert('Falha ao salvar: ' + (err && err.message ? err.message : err));
            }
        });
    }

    refresh();
})();
