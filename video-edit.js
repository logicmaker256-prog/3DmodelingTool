// ============================================================
// 🎬 動画編集（連続ポーズのテスト再生）
// ------------------------------------------------------------
// 「ポーズ格納庫」の番号(1〜SLOT_COUNT)を好きな順に並べて、
// 一定角速度（イージング無しの線形補間）でつないでテスト再生できる機能。
// 旧COMMANDS（疾走ループ／大剣攻撃／ジャンプ／魔法アイテム使用の固定プリセット）
// を置き換えるもの。並び順は名前を付けて複数保存でき、作業セーブJSONにも含まれる。
//
// 各シーケンスには「名前」と「使用シーン」を付けられる。
// 「📦 書き出し」から、名前・使用シーン・ポーズ番号の並びをJSONに保存でき、
// 現行のGLBと一緒にzipでダウンロードもできる。
//
// ※GLBエクスポート（glb-export.js）は mySlots（ポーズ格納庫）だけを見て
//   クリップを作るので、ここで組んだシーケンスはツール内プレビュー専用。
//   GLBの中身には一切影響しない。
// ============================================================

const VIDEO_LS_KEY_PREFIX = '3dmaker_video_sequences_v2'; // v1から：キャラ別保存に対応するため更新
const VIDEO_SPEED_DEG = { slow: 90, normal: 180, fast: 320 }; // 度/秒

function degToRad(d) { return d * Math.PI / 180; }

// 保存データの形をそろえる（古いデータには使用シーン(scene)が無いので空文字を補う）
function normalizeVideoSequences(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
        .filter(q => q && Array.isArray(q.poseIndices))
        .map(q => ({
            name: String(q.name || ''),
            scene: typeof q.scene === 'string' ? q.scene : '',
            poseIndices: q.poseIndices.slice(),
        }));
}

function videoSeqStorageKey(charKey) {
    return `${VIDEO_LS_KEY_PREFIX}::${charKey}`;
}

// 指定したキャラ（キー）専用の保存領域から動画シーケンスを読み込む
function loadVideoSequencesForCharacter(charKey) {
    try {
        const raw = localStorage.getItem(videoSeqStorageKey(charKey));
        if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) return normalizeVideoSequences(arr);
        }
    } catch (e) {}
    return [];
}
// 指定した（省略時は現在の）キャラ専用の保存領域へ動画シーケンスを書き込む
function saveVideoSequences(charKey) {
    try { localStorage.setItem(videoSeqStorageKey(charKey || currentCharacterKey), JSON.stringify(videoSequences)); } catch (e) {}
}
let videoSequences = loadVideoSequencesForCharacter(currentCharacterKey); // [{ name, poseIndices:[0-based mySlots index,...] }, ...]

// ── キャラ切り替え連携（pose-slots.jsのswitchCharacterByName/adoptCharacterFromLoadedFileから呼ばれる） ──
// 今のキャラの分を確定保存する
function saveVideoSequencesForCurrentCharacter(charKey) {
    saveVideoSequences(charKey);
}
window.saveVideoSequencesForCurrentCharacter = saveVideoSequencesForCurrentCharacter;

// 新しいキャラの保存領域から読み込んで画面を更新する（ファイル名の打ち替えで切替）
function loadVideoSequencesForCurrentCharacter(charKey) {
    videoSequences = loadVideoSequencesForCharacter(charKey);
    editChain = [];
    renderChain();
    buildSavedSequenceButtons();
}
window.loadVideoSequencesForCurrentCharacter = loadVideoSequencesForCurrentCharacter;

// セーブファイルに入っていた動画シーケンスを、新しいキャラ専用の保存領域として確定保存する（読込時）
function adoptVideoSequencesForCurrentCharacter(charKey, seqArr) {
    videoSequences = normalizeVideoSequences(seqArr);
    saveVideoSequences(charKey);
    editChain = [];
    renderChain();
    buildSavedSequenceButtons();
}
window.adoptVideoSequencesForCurrentCharacter = adoptVideoSequencesForCurrentCharacter;

// ── ポーズ格納庫の＋／－でmySlotsの並びが変わったときに、動画シーケンスが
//    指しているポーズ番号(poseIndices)がずれないよう補正する ──
function remapIndices(indices, insertedAt, deletedAt) {
    return indices
        .map(idx => {
            if (deletedAt !== undefined) {
                if (idx === deletedAt) return null; // 削除されたポーズを指していた分は取り除く
                if (idx > deletedAt) return idx - 1;
            }
            if (insertedAt !== undefined && idx >= insertedAt) return idx + 1;
            return idx;
        })
        .filter(idx => idx !== null);
}
function remapPoseIndicesOnInsert(insertedAt) {
    let changed = false;
    videoSequences.forEach(seq => {
        const remapped = remapIndices(seq.poseIndices, insertedAt, undefined);
        if (JSON.stringify(remapped) !== JSON.stringify(seq.poseIndices)) changed = true;
        seq.poseIndices = remapped;
    });
    editChain = remapIndices(editChain, insertedAt, undefined);
    if (changed) saveVideoSequences();
    renderChain();
    buildSavedSequenceButtons();
}
window.remapPoseIndicesOnInsert = remapPoseIndicesOnInsert;

// 戻り値：削除したポーズを含むシーケンスが1つでもあったか（呼び出し元のメッセージ出し分けに使う）
function remapPoseIndicesOnDelete(deletedAt) {
    let affected = false;
    videoSequences.forEach(seq => {
        const remapped = remapIndices(seq.poseIndices, undefined, deletedAt);
        if (remapped.length !== seq.poseIndices.length) affected = true;
        seq.poseIndices = remapped;
    });
    editChain = remapIndices(editChain, undefined, deletedAt);
    saveVideoSequences();
    renderChain();
    buildSavedSequenceButtons();
    return affected;
}
window.remapPoseIndicesOnDelete = remapPoseIndicesOnDelete;

// ポーズ格納庫で隣り合う2つのポーズ(a,b)の位置を入れ替えたとき、動画シーケンスが
// 指しているポーズ番号も入れ替える（シーケンスは同じポーズを指し続ける）
function remapPoseIndicesOnSwap(a, b) {
    const sw = idx => (idx === a ? b : (idx === b ? a : idx));
    let changed = false;
    videoSequences.forEach(seq => {
        const remapped = seq.poseIndices.map(sw);
        if (JSON.stringify(remapped) !== JSON.stringify(seq.poseIndices)) changed = true;
        seq.poseIndices = remapped;
    });
    editChain = editChain.map(sw);
    if (changed) saveVideoSequences();
    renderChain();
    buildSavedSequenceButtons();
}
window.remapPoseIndicesOnSwap = remapPoseIndicesOnSwap;

// 今つくっている最中の並び（0-based index into mySlots）
let editChain = [];

// ── 2つの関節角度({rx,ry,rz})の差（ラジアン）をQuaternionの内積から求める ──
const _vqA = new THREE.Quaternion(), _vqB = new THREE.Quaternion();
function jointAngleDelta(a, b) {
    if (!a || !b) return 0;
    anglesToQuaternion(a.rx || 0, a.ry || 0, a.rz || 0, _vqA);
    anglesToQuaternion(b.rx || 0, b.ry || 0, b.rz || 0, _vqB);
    const d = Math.min(1, Math.max(-1, Math.abs(_vqA.dot(_vqB))));
    return 2 * Math.acos(d);
}
// 2つのポーズ間で最も大きく動く関節の角度差（ラジアン）。
// これで割ることで「どの区間も角度の進む速さ(=角速度)が揃う」所要時間を出せる。
function maxPoseAngleDelta(poseA, poseB) {
    if (!poseA || !poseB) return 0;
    let m = 0;
    const upd = (a, b) => { const d = jointAngleDelta(a, b); if (d > m) m = d; };
    upd(poseA.head, poseB.head);
    (poseA.arms || []).forEach((a, i) => {
        const b = (poseB.arms || [])[i]; if (!b) return;
        upd(a.root, b.root); upd(a.joint, b.joint); upd(a.wrist, b.wrist);
    });
    (poseA.legs || []).forEach((a, i) => {
        const b = (poseB.legs || [])[i]; if (!b) return;
        upd(a.root, b.root); upd(a.joint, b.joint);
    });
    return m;
}

// ポーズ番号の並び(poseIndices) + 再生速度キー から、再生エンジン用のframes配列を組み立てる
function buildFramesFromChain(chain, speedKey) {
    const speedRad = degToRad(VIDEO_SPEED_DEG[speedKey] || VIDEO_SPEED_DEG.normal);
    const MIN_BLEND = 0.12; // 角度差がほぼ無い区間でも一瞬止まって見えないための最低所要時間(秒)
    const frames = [];
    let prevPose = null;
    chain.forEach((slotIdx) => {
        const pose = mySlots[slotIdx].poseSnapshot;
        const delta = prevPose ? maxPoseAngleDelta(prevPose, pose) : degToRad(45); // 最初の1体分は控えめな所要時間で構える
        const blend = Math.max(delta / speedRad, MIN_BLEND);
        frames.push({ pose, duration: blend, blendSeconds: blend });
        prevPose = pose;
    });
    // 最後に指定したポーズのままで再生を終える（待機ポーズへは戻さない）。
    // 戻してしまうと「再生が終わったのにまだ動いている＝アニメが続いている」と
    // 勘違いしやすいため、指定ポーズの再生のみで止める。
    return frames;
}

// ── ポーズ選択（タップ式）ボタンを生成 ──
function buildPosePickerButtons() {
    const container = document.getElementById('video-edit-pose-picker');
    if (!container) return;
    container.innerHTML = '';
    mySlots.forEach((slot, i) => {
        const btn = document.createElement('button');
        btn.className = 'video-pick-btn';
        btn.textContent = `${i + 1}. ${slot.name}`;
        btn.addEventListener('click', () => addToChain(i));
        container.appendChild(btn);
    });
}

// ── 並び（editChain）の追加・削除・表示 ──
function addToChain(slotIdx) {
    if (slotIdx < 0 || slotIdx >= mySlots.length) return;
    editChain.push(slotIdx);
    renderChain();
}
function removeFromChain(pos) {
    editChain.splice(pos, 1);
    renderChain();
}
function clearChain() {
    editChain = [];
    renderChain();
}
function renderChain() {
    const container = document.getElementById('video-edit-chain');
    const testBtn = document.getElementById('video-edit-test-btn');
    const saveBtn = document.getElementById('video-edit-save-btn');
    if (!container) return;
    container.innerHTML = '';
    if (editChain.length === 0) {
        const empty = document.createElement('span');
        empty.id = 'video-edit-chain-empty';
        empty.textContent = '👉 下の一覧をタップ、または番号入力で追加してね';
        container.appendChild(empty);
    } else {
        editChain.forEach((slotIdx, pos) => {
            if (pos > 0) {
                const arrow = document.createElement('span');
                arrow.className = 'video-chip-arrow';
                arrow.textContent = '→';
                container.appendChild(arrow);
            }
            const chip = document.createElement('button');
            chip.className = 'video-chip';
            chip.textContent = `${slotIdx + 1}`;
            chip.title = `${mySlots[slotIdx].name}（タップで削除）`;
            chip.addEventListener('click', () => removeFromChain(pos));
            container.appendChild(chip);
        });
    }
    if (testBtn) testBtn.disabled = editChain.length === 0;
    if (saveBtn) saveBtn.disabled = editChain.length === 0;
}

// ── 番号入力での追加 ──
document.getElementById('video-edit-num-add-btn').addEventListener('click', () => {
    const input = document.getElementById('video-edit-num-input');
    const n = parseInt(input.value, 10);
    if (!n || n < 1 || n > mySlots.length) {
        showSlotStatus(`⚠️ 1〜${mySlots.length}の番号を入力してください`);
        return;
    }
    addToChain(n - 1);
    input.value = '';
});

// ── クリア ──
document.getElementById('video-edit-clear-btn').addEventListener('click', clearChain);

// ── テスト再生（保存はしない） ──
document.getElementById('video-edit-test-btn').addEventListener('click', () => {
    if (editChain.length === 0) return;
    const speedKey = document.getElementById('video-edit-speed-select').value;
    const frames = buildFramesFromChain(editChain, speedKey);
    playSequence({ label: '🎬 テスト再生', frames });
});

// ── 名前＋使用シーンを付けて保存（ポップアップ。新規保存と、保存済みの名前・使用シーン編集の兼用） ──
let videoPopupEditIndex = -1; // -1 = 今の並びを新規保存 / 0以上 = 保存済みシーケンスの名前・使用シーンを編集
function openVideoNamePopup(editIndex) {
    videoPopupEditIndex = (typeof editIndex === 'number') ? editIndex : -1;
    const nameInput  = document.getElementById('video-name-input');
    const sceneInput = document.getElementById('video-scene-input');
    const title      = document.getElementById('video-popup-title');
    if (videoPopupEditIndex >= 0) {
        const q = videoSequences[videoPopupEditIndex];
        nameInput.value  = q.name;
        sceneInput.value = q.scene || '';
        title.textContent = '✏️ 名前・使用シーンを編集';
    } else {
        nameInput.value  = '';
        sceneInput.value = '';
        title.textContent = '💾 シーケンスを保存';
    }
    document.getElementById('video-name-popup').classList.add('open');
    document.getElementById('video-name-popup-overlay').classList.add('open');
    setTimeout(() => nameInput.focus(), 50);
}
function closeVideoNamePopup() {
    document.getElementById('video-name-popup').classList.remove('open');
    document.getElementById('video-name-popup-overlay').classList.remove('open');
}
document.getElementById('video-edit-save-btn').addEventListener('click', () => {
    if (editChain.length === 0) return;
    openVideoNamePopup();
});
document.getElementById('video-popup-cancel').addEventListener('click', closeVideoNamePopup);
document.getElementById('video-name-popup-overlay').addEventListener('click', closeVideoNamePopup);
document.getElementById('video-popup-ok').addEventListener('click', () => {
    const name  = document.getElementById('video-name-input').value.trim();
    const scene = document.getElementById('video-scene-input').value.trim();
    if (!name) { closeVideoNamePopup(); return; }
    if (videoPopupEditIndex >= 0 && videoSequences[videoPopupEditIndex]) {
        videoSequences[videoPopupEditIndex].name  = name;
        videoSequences[videoPopupEditIndex].scene = scene;
        showSlotStatus(`✏️「${name}」を更新しました`);
    } else {
        videoSequences.push({ name, scene, poseIndices: editChain.slice() });
        showSlotStatus(`💾「${name}」を保存しました`);
    }
    saveVideoSequences();
    buildSavedSequenceButtons();
    closeVideoNamePopup();
});

// ── 保存済みシーケンス一覧（▶再生・🗑削除） ──
function buildSavedSequenceButtons() {
    updateVideoExportNote();
    const container = document.getElementById('video-edit-saved-list');
    if (!container) return;
    container.innerHTML = '';
    seqButtonEls.clear(); // 古いボタン参照が残らないようにする

    if (videoSequences.length === 0) {
        const empty = document.createElement('div');
        empty.id = 'video-saved-empty';
        empty.textContent = 'まだ保存されたシーケンスはありません';
        container.appendChild(empty);
        return;
    }

    videoSequences.forEach((seqData, i) => {
        const row = document.createElement('div');
        row.className = 'saved-seq-row';

        const playBtn = document.createElement('button');
        playBtn.className = 'seq-btn';
        // 1行目：名前 / 2行目：ポーズ番号の並び / 3行目：使用シーン（あれば）
        const nameLine = document.createElement('span');
        nameLine.textContent = `🎬 ${seqData.name}`;
        const chainLine = document.createElement('span');
        chainLine.className = 'seq-sub';
        chainLine.textContent = seqData.poseIndices.map(n => n + 1).join(' → ');
        playBtn.append(nameLine, chainLine);
        if (seqData.scene) {
            const sceneLine = document.createElement('span');
            sceneLine.className = 'seq-sub seq-scene';
            sceneLine.textContent = `📍 ${seqData.scene}`;
            playBtn.appendChild(sceneLine);
        }
        const seqObj = { label: seqData.name, frames: [] }; // framesは再生速度が決まる再生時に都度組み立てる
        playBtn.addEventListener('click', () => {
            const speedKey = document.getElementById('video-edit-speed-select').value;
            seqObj.frames = buildFramesFromChain(seqData.poseIndices, speedKey);
            playSequence(seqObj);
        });
        seqButtonEls.set(seqObj, playBtn);

        const editBtn = document.createElement('button');
        editBtn.className = 'video-del-btn video-edit-name-btn';
        editBtn.textContent = '✏️';
        editBtn.title = '名前・使用シーンを編集';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openVideoNamePopup(i);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'video-del-btn';
        delBtn.textContent = '🗑';
        delBtn.title = '削除';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!confirm(`「${seqData.name}」を削除しますか？`)) return;
            videoSequences.splice(i, 1);
            saveVideoSequences();
            buildSavedSequenceButtons();
        });

        row.append(playBtn, editBtn, delBtn);
        container.appendChild(row);
    });
}

// ============================================================
// 📦 書き出し（JSON／GLB＋JSONのzip）
// ============================================================
function videoExportBaseName() {
    return (typeof currentCharacterKey === 'string' && currentCharacterKey) ? currentCharacterKey : DEFAULT_CHARACTER_KEY;
}
function updateVideoExportNote() {
    const base = videoExportBaseName();
    const g = document.getElementById('video-export-note-glb');
    const j = document.getElementById('video-export-note-json');
    if (g) g.textContent = `${base}.glb`;
    if (j) j.textContent = `${base}_video.json`;
}

// GLB内のアニメクリップ名（glb-export.jsの buildPoseClips と同じ規則：絵文字部分を除いた名前）
function clipNameOfSlot(slot) {
    return slot.name.split(' ').slice(1).join(' ') || slot.name;
}

// 動画編集JSONの中身を組み立てる
//   poses     … ポーズ番号(1始まり・画面表示と同じ)とGLBのクリップ名の対応表
//   sequences … 名前・使用シーン・ポーズ番号の並び(順序どおり)・クリップ名の並び
function buildVideoExportData() {
    const base = videoExportBaseName();
    return {
        version: 1,
        characterName: base,
        glbFile: `${base}.glb`,
        poses: mySlots.map((slot, i) => ({ number: i + 1, clipName: clipNameOfSlot(slot) })),
        sequences: videoSequences.map(q => {
            const valid = q.poseIndices.filter(idx => mySlots[idx]);
            return {
                name: q.name,
                scene: q.scene || '',
                poseNumbers: valid.map(idx => idx + 1),
                clipNames: valid.map(idx => clipNameOfSlot(mySlots[idx])),
            };
        }),
    };
}
function buildVideoExportJsonText() {
    return JSON.stringify(buildVideoExportData(), null, 2);
}

function triggerBlobDownload(blob, fileName) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1500); // スマホブラウザでDL開始前に無効化されないよう少し待つ
}

// ── 最小のzip作成（無圧縮=STORE方式。外部ライブラリ不要。日本語ファイル名はUTF-8指定） ──
const _crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
    }
    return t;
})();
function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = _crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}
// files: [{ name:string, data:Uint8Array }] → zipのBlob
function buildZipBlob(files) {
    const enc = new TextEncoder();
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const parts = [];
    const central = [];
    let offset = 0;
    files.forEach(f => {
        const nameBytes = enc.encode(f.name);
        const crc = crc32(f.data);
        const size = f.data.length;

        const lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true);
        lh.setUint16(4, 20, true);
        lh.setUint16(6, 0x0800, true); // UTF-8ファイル名
        lh.setUint16(8, 0, true);      // 無圧縮
        lh.setUint16(10, dosTime, true);
        lh.setUint16(12, dosDate, true);
        lh.setUint32(14, crc, true);
        lh.setUint32(18, size, true);
        lh.setUint32(22, size, true);
        lh.setUint16(26, nameBytes.length, true);
        lh.setUint16(28, 0, true);
        parts.push(lh.buffer, nameBytes, f.data);

        const ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true);
        ch.setUint16(4, 20, true);
        ch.setUint16(6, 20, true);
        ch.setUint16(8, 0x0800, true);
        ch.setUint16(10, 0, true);
        ch.setUint16(12, dosTime, true);
        ch.setUint16(14, dosDate, true);
        ch.setUint32(16, crc, true);
        ch.setUint32(20, size, true);
        ch.setUint32(24, size, true);
        ch.setUint16(28, nameBytes.length, true);
        ch.setUint32(42, offset, true);
        central.push(ch.buffer, nameBytes);

        offset += 30 + nameBytes.length + size;
    });
    const centralSize = central.reduce((a, b) => a + (b.byteLength !== undefined ? b.byteLength : b.length), 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

// ── JSONのみ保存 ──
document.getElementById('video-export-json-btn').addEventListener('click', () => {
    const base = videoExportBaseName();
    const blob = new Blob([buildVideoExportJsonText()], { type: 'application/json' });
    triggerBlobDownload(blob, `${base}_video.json`);
    showSlotStatus(`💾「${base}_video.json」として保存しました`);
});

// ── GLB＋JSONをzipでダウンロード ──
let videoZipBusy = false;
document.getElementById('video-export-zip-btn').addEventListener('click', () => {
    if (videoZipBusy) return;
    if (typeof window.exportGlbBuffer !== 'function') {
        showSlotStatus('⚠️ GLB出力の準備ができていません');
        return;
    }
    videoZipBusy = true;
    const btn = document.getElementById('video-export-zip-btn');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ zipを作成中…';
    const base = videoExportBaseName(); // 作成中に名前が変わっても中身の名前がそろうよう先に確定
    try {
        const jsonText = buildVideoExportJsonText();
        window.exportGlbBuffer((glbBuffer) => {
            try {
                const enc = new TextEncoder();
                const zip = buildZipBlob([
                    { name: `${base}.glb`, data: new Uint8Array(glbBuffer) },
                    { name: `${base}_video.json`, data: enc.encode(jsonText) },
                ]);
                triggerBlobDownload(zip, `${base}.zip`);
                showSlotStatus(`📦「${base}.zip」をダウンロードしました`);
            } catch (err) {
                showSlotStatus('⚠️ zip作成に失敗: ' + err.message);
            } finally {
                videoZipBusy = false;
                btn.disabled = false;
                btn.textContent = label;
            }
        });
    } catch (err) {
        videoZipBusy = false;
        btn.disabled = false;
        btn.textContent = label;
        showSlotStatus('⚠️ GLB出力に失敗: ' + err.message);
    }
});

buildPosePickerButtons();
renderChain();
buildSavedSequenceButtons();
