// アプリケーション状態管理
class ScheduleApp {
    constructor() {
        this.todos = [];
        this.memoText = '';
        this.wakeTime = 6;
        this.sleepTime = 23;
        this.colors = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5',
            'color-6', 'color-7', 'color-8', 'color-9', 'color-10'];
        this.colorIndex = 0;

        this.init();
    }

    // 時間文字列をパースして時間数に変換（5分単位で丸める）
    parseTimeString(timeStr) {
        if (!timeStr) return null;

        // 「1時間30分」「1時間」「30分」などのパターンに対応
        const hourMatch = timeStr.match(/(\d+(?:\.\d+)?)\s*時間/);
        const minMatch = timeStr.match(/(\d+)\s*分/);

        let totalMinutes = 0;

        if (hourMatch) {
            totalMinutes += parseFloat(hourMatch[1]) * 60;
        }

        if (minMatch) {
            totalMinutes += parseInt(minMatch[1]);
        }

        // 数値のみの場合は時間として扱う
        if (!hourMatch && !minMatch) {
            const numMatch = timeStr.match(/(\d+(?:\.\d+)?)/);
            if (numMatch) {
                totalMinutes = parseFloat(numMatch[1]) * 60;
            }
        }

        if (totalMinutes <= 0) return null;

        // 5分単位で丸める（表示用）
        const roundedMinutes = Math.round(totalMinutes / 5) * 5;

        // 時間に変換
        return roundedMinutes / 60;
    }

    // TODOメモをパースしてTODOリストを生成
    parseTodoMemo(memoText) {
        const lines = memoText.split('\n');
        const todos = [];

        lines.forEach((line, index) => {
            line = line.trim();
            if (!line) return;

            // 最後のスペース以降を時間として扱う
            const lastSpaceIndex = line.lastIndexOf(' ');
            if (lastSpaceIndex === -1) return;

            const title = line.substring(0, lastSpaceIndex).trim();
            const timeStr = line.substring(lastSpaceIndex + 1).trim();

            const duration = this.parseTimeString(timeStr);

            if (title && duration && duration > 0) {
                // []が含まれているかチェック
                const hasCheckbox = title.includes('[]');
                todos.push({
                    id: Date.now() + index,
                    title: title,
                    duration: duration,
                    startTime: null,
                    color: this.colors[this.colorIndex % this.colors.length],
                    hasCheckbox: hasCheckbox,
                    checked: false
                });
                this.colorIndex++;
            }
        });

        return todos;
    }

    init() {
        this.loadFromStorage();
        this.renderTimeGrid();
        this.renderTodos();
        this.updateTimeDisplay();
        this.attachEventListeners();

        // 時刻表示を1秒ごとに更新
        setInterval(() => this.updateTimeDisplay(), 1000);
    }

    // LocalStorageから読み込み
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('scheduleApp');
            if (saved) {
                const data = JSON.parse(saved);
                this.todos = (data.todos || []).map(todo => ({
                    ...todo,
                    hasCheckbox: todo.hasCheckbox !== undefined ? todo.hasCheckbox : false,
                    checked: todo.checked !== undefined ? todo.checked : false
                }));
                this.memoText = data.memoText || '';
                this.wakeTime = data.wakeTime || 6;
                this.sleepTime = data.sleepTime || 23;
                this.colorIndex = data.colorIndex || 0;

                // メモテキストを復元
                const memoInput = document.getElementById('todoMemo');
                if (memoInput) {
                    memoInput.value = this.memoText;
                }
            }
        } catch (e) {
            console.error('Failed to load from storage:', e);
        }
    }

    // LocalStorageに保存
    saveToStorage() {
        try {
            const data = {
                todos: this.todos,
                memoText: this.memoText,
                wakeTime: this.wakeTime,
                sleepTime: this.sleepTime,
                colorIndex: this.colorIndex
            };
            localStorage.setItem('scheduleApp', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save to storage:', e);
        }
    }

    // 時刻表示を更新
    updateTimeDisplay() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const timeDisplay = document.getElementById('timeDisplay');
        if (timeDisplay) {
            timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
        }
    }

    // タイムグリッドを描画
    renderTimeGrid() {
        const grid = document.getElementById('timeGrid');
        if (!grid) return;

        grid.innerHTML = '';

        for (let hour = this.wakeTime; hour <= this.sleepTime; hour++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.dataset.hour = hour;

            const label = document.createElement('div');
            label.className = 'time-label';
            // 12時間表記に変換（時間のみ）
            const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
            label.textContent = `${hour12}時`;

            slot.appendChild(label);
            grid.appendChild(slot);
        }
    }

    // TODOメモを更新
    updateTodosFromMemo() {
        const memoInput = document.getElementById('todoMemo');
        if (!memoInput) return;

        this.memoText = memoInput.value;
        this.colorIndex = 0; // カラーインデックスをリセット
        this.todos = this.parseTodoMemo(this.memoText);

        this.saveToStorage();
        this.renderTodos();
    }

    // 新しい入力欄からTODOを追加
    addTodosFromNewInput() {
        const newInput = document.getElementById('newTodoInput');
        if (!newInput || !newInput.value.trim()) return;

        const newText = newInput.value;
        // 既存のタスクの後に続けるため、colorIndexはリセットしない
        const newTodos = this.parseTodoMemo(newText);

        if (newTodos.length === 0) return;

        // 既存のTODOに追加
        this.todos = [...this.todos, ...newTodos];

        // メモテキストも更新（これにより全タスクがメモに反映される）
        this.updateMemoText();

        this.saveToStorage();
        this.renderTodos();

        // 入力欄をクリア
        newInput.value = '';
    }

    // TODOを削除
    deleteTodo(id) {
        // 配列から削除せず、削除フラグを立てる（メモには残すため）
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.isDeleted = true;
            this.saveToStorage();
            this.renderTodos();
        }
    }

    // TODOの時間を調整（分単位）
    adjustTodoDuration(todo, minutes) {
        const newDuration = todo.duration + (minutes / 60);

        // 最小5分
        if (newDuration < (5 / 60)) {
            return;
        }

        todo.duration = newDuration;

        // メモテキストも更新する
        this.updateMemoText();

        this.saveToStorage();
        this.renderTodos();
    }

    // メモテキストを現在のTODOリストから再生成
    updateMemoText() {
        const memoLines = [];

        this.todos.forEach(todo => {
            const hours = Math.floor(todo.duration);
            const minutes = Math.round((todo.duration - hours) * 60);

            let timeStr = '';
            if (hours > 0 && minutes > 0) {
                timeStr = `${hours}時間${minutes}分`;
            } else if (hours > 0) {
                timeStr = `${hours}時間`;
            } else {
                timeStr = `${minutes}分`;
            }

            // チェックボックス付きの場合は[]を保持
            const title = todo.hasCheckbox && !todo.title.includes('[]')
                ? `[] ${todo.title}`
                : todo.title;

            memoLines.push(`${title} ${timeStr}`);
        });

        this.memoText = memoLines.join('\n');

        // テキストエリアも更新
        const memoInput = document.getElementById('todoMemo');
        if (memoInput) {
            memoInput.value = this.memoText;
        }
    }

    // TODOのチェック状態をトグル
    toggleTodoCheck(todo) {
        todo.checked = !todo.checked;
        this.saveToStorage();
        this.renderTodos();
    }

    // TODOを描画
    renderTodos() {
        const grid = document.getElementById('timeGrid');
        if (!grid) return;

        // 既存のTODOボックスを削除
        const existingBoxes = grid.querySelectorAll('.todo-box');
        existingBoxes.forEach(box => box.remove());

        // TODOボックスを描画
        this.todos.forEach(todo => {
            if (todo.isDeleted) return; // 削除済みタスクは描画しない
            const box = this.createTodoBox(todo);
            grid.appendChild(box);
        });
    }

    // TODOボックスを作成
    createTodoBox(todo) {
        const box = document.createElement('div');
        box.className = `todo-box ${todo.color}`;
        box.dataset.id = todo.id;

        // 高さを計算（1時間 = 120px）
        const height = todo.duration * 120;
        box.style.height = `${height}px`;

        // 開始時刻が設定されている場合は位置を設定
        if (todo.startTime !== null) {
            const offsetFromWake = (todo.startTime - this.wakeTime) * 120;
            box.style.top = `${offsetFromWake}px`;
        } else {
            // 未配置の場合は自動配置
            const position = this.findAvailablePosition(todo);
            box.style.top = `${position}px`;
            todo.startTime = this.wakeTime + (position / 120);
        }

        // コンテンツを作成
        const content = document.createElement('div');
        content.className = 'todo-box-content';

        const title = document.createElement('div');
        title.className = 'todo-title';

        // チェックボックス機能
        if (todo.hasCheckbox) {
            const checkbox = document.createElement('span');
            checkbox.className = 'checkbox';
            checkbox.textContent = todo.checked ? '☑' : '☐';
            checkbox.onclick = (e) => {
                e.stopPropagation();
                this.toggleTodoCheck(todo);
            };

            const text = document.createElement('span');
            text.textContent = todo.title.replace('[]', '').trim();
            if (todo.checked) {
                text.style.textDecoration = 'line-through';
                text.style.opacity = '0.7';
            }

            title.appendChild(checkbox);
            title.appendChild(text);
        } else {
            title.textContent = todo.title;
        }

        const duration = document.createElement('div');
        duration.className = 'todo-duration';

        // 時間表示を分かりやすく
        const hours = Math.floor(todo.duration);
        const minutes = Math.round((todo.duration - hours) * 60);

        if (hours > 0 && minutes > 0) {
            duration.textContent = `${hours}h${minutes}m`;
        } else if (hours > 0) {
            duration.textContent = `${hours}h`;
        } else {
            duration.textContent = `${minutes}m`;
        }

        // ボタンコンテナ
        const btnContainer = document.createElement('div');
        btnContainer.className = 'btn-container';

        // マイナスボタン（時間を減らす）
        const minusBtn = document.createElement('button');
        minusBtn.className = 'adjust-btn minus-btn';
        minusBtn.innerHTML = '−';
        minusBtn.onclick = (e) => {
            e.stopPropagation();
            this.adjustTodoDuration(todo, -5);
        };

        // プラスボタン（時間を増やす）
        const plusBtn = document.createElement('button');
        plusBtn.className = 'adjust-btn plus-btn';
        plusBtn.innerHTML = '+';
        plusBtn.onclick = (e) => {
            e.stopPropagation();
            this.adjustTodoDuration(todo, 5);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteTodo(todo.id);
        };

        btnContainer.appendChild(minusBtn);
        btnContainer.appendChild(plusBtn);
        btnContainer.appendChild(deleteBtn);

        content.appendChild(title);
        content.appendChild(duration);
        content.appendChild(btnContainer);
        box.appendChild(content);

        // ドラッグイベントを追加
        this.attachDragEvents(box, todo);

        return box;
    }

    // 利用可能な位置を見つける
    findAvailablePosition(newTodo) {
        let position = 0;
        // 24時間分のスペースを確保（就寝時間を超えても配置可能）
        const maxPosition = 24 * 120;

        // 既存のTODOと重ならない位置を探す（5分単位 = 10px）
        for (let pos = 0; pos <= maxPosition; pos += 10) {
            const newStart = this.wakeTime + (pos / 120);
            const newEnd = newStart + newTodo.duration;

            let hasOverlap = false;
            for (const todo of this.todos) {
                if (todo.isDeleted) continue; // 削除済みタスクは無視
                if (todo.id === newTodo.id) continue;
                if (todo.startTime === null) continue;

                const existingEnd = todo.startTime + todo.duration;

                if (!(newEnd <= todo.startTime || newStart >= existingEnd)) {
                    hasOverlap = true;
                    break;
                }
            }

            if (!hasOverlap) {
                return pos;
            }
        }

        return position;
    }

    // ドラッグイベントを追加
    attachDragEvents(box, todo) {
        let isDragging = false;
        let startY = 0;
        let startTop = 0;

        // タッチイベント
        box.addEventListener('touchstart', (e) => {
            isDragging = true;
            startY = e.touches[0].clientY;
            startTop = parseInt(box.style.top) || 0;
            box.style.zIndex = '1000';
        }, { passive: true });

        box.addEventListener('touchmove', (e) => {
            if (!isDragging) return;

            const deltaY = e.touches[0].clientY - startY;
            let newTop = startTop + deltaY;

            // グリッドにスナップ（5分単位 = 10px）
            newTop = Math.round(newTop / 10) * 10;

            // 範囲制限（0以上のみ、就寝時間は超えても可）
            newTop = Math.max(0, newTop);

            box.style.top = `${newTop}px`;
        }, { passive: true });

        box.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            box.style.zIndex = '';

            // 新しい開始時刻を保存
            const newTop = parseInt(box.style.top);
            todo.startTime = this.wakeTime + (newTop / 120);
            this.saveToStorage();
        });

        // マウスイベント（デスクトップ用）
        box.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startTop = parseInt(box.style.top) || 0;
            box.style.zIndex = '1000';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaY = e.clientY - startY;
            let newTop = startTop + deltaY;

            // グリッドにスナップ（5分単位 = 10px）
            newTop = Math.round(newTop / 10) * 10;

            // 範囲制限（0以上のみ、就寝時間は超えても可）
            newTop = Math.max(0, newTop);

            box.style.top = `${newTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            box.style.zIndex = '';

            // 新しい開始時刻を保存
            const newTop = parseInt(box.style.top);
            todo.startTime = this.wakeTime + (newTop / 120);
            this.saveToStorage();
        });
    }

    // イベントリスナーを追加
    attachEventListeners() {
        // スケジュール更新ボタン
        const updateBtn = document.getElementById('updateTodosBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                this.updateTodosFromMemo();
            });
        }

        // 追加タスクボタン
        const addBtn = document.getElementById('addTodosBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addTodosFromNewInput();
            });
        }

        // 起床時刻変更
        const wakeTimeInput = document.getElementById('wakeTime');
        if (wakeTimeInput) {
            wakeTimeInput.value = this.wakeTime;
            wakeTimeInput.addEventListener('change', (e) => {
                this.wakeTime = parseInt(e.target.value);
                this.saveToStorage();
                this.renderTimeGrid();
                this.renderTodos();
            });
        }

        // 就寝時刻変更
        const sleepTimeInput = document.getElementById('sleepTime');
        if (sleepTimeInput) {
            sleepTimeInput.value = this.sleepTime;
            sleepTimeInput.addEventListener('change', (e) => {
                this.sleepTime = parseInt(e.target.value);
                this.saveToStorage();
                this.renderTimeGrid();
                this.renderTodos();
            });
        }
    }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
    new ScheduleApp();
});
