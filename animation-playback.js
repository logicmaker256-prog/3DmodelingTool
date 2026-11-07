// ============================================================
// ============================================================
// 【構造】
// ============================================================

// 4.// 4. イベントリスナーとアニメーション
// ★ 修正：監視対象の配列の最後に 'earType' を追加しました
// ★重要：スライダー/カラーピッカーのinput連打で毎回createCharacter()を
//   同期実行すると、キャラのメッシュ数が増えた今（兜・胸当て・肩当て・篭手…）
//   1回の再構築コストが大きくなっており、ドラッグ中に何十回も連続実行されると
//   スマホでメモリ/GPU負荷が積み重なりクラッシュ（強制終了）する原因になる。
//   requestAnimationFrameで1フレームにつき最大1回の再構築にまとめる。
let rebuildScheduled = false;
function scheduleCharacterRebuild() {
    if (rebuildScheduled) return;
    rebuildScheduled = true;
    requestAnimationFrame(() => {
        rebuildScheduled = false;
        createCharacter(characterData);
    });
}

['headScaleY', 'headScaleX', 'jawWidth', 'eyeColor', 'hairType', 'hairColor', 'bodyColor', 'bustSize', 'bustProtrude', 'earType', 'shirtColor', 'maidColor', 'pantsColor', 'skirtColor', 'bootsColor', 'plateColor', 'plateTrimColor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', (e) => {
            let val = e.target.value;
            if(el.type === 'range') val = parseFloat(val);
            characterData[id] = val; 
            if (id === 'bodyColor') {
                // カスタムカラーを選んだらプリセットのドロップダウンを「カスタム」表示にする
                const sel = document.getElementById('skinColorSelect');
                if (sel) sel.value = 'custom';
            }
            if (id === 'hairColor') {
                const sel = document.getElementById('hairColorSelect');
                if (sel) sel.value = 'custom';
            }
            if (id === 'eyeColor') {
                const sel = document.getElementById('eyeColorSelect');
                if (sel) sel.value = 'custom';
            }
            scheduleCharacterRebuild();
        });
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix(); 
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// ポーズシステム
// ============================================================

// アイドルアニメON/OFFフラグ
let idleEnabled = true;
// 新しいドロップダウン（idleSelect）の表示をコードから同期させるための小関数
function syncIdleSelect(val) {
    const el = document.getElementById('idleSelect');
    if (el) el.value = val ? 'true' : 'false';
}
window.setIdle = function(val) {
    idleEnabled = val;
    syncIdleSelect(val);
    if (val) {
        // ON：補間を完了済みにしてアイドルアニメへ即切替
        poseT      = 1.0;
        poseTarget = null;
        poseFrom   = null;
        // ポーズボタンのactiveを外す
        document.querySelectorAll('.slot-apply-btn').forEach(b => b.classList.remove('active'));
        activeSlotIndex = -1; // アイドル中はどのプリセットにも自動保存しない
        if (window.syncAllExpressionEditors) window.syncAllExpressionEditors();
        if (window.syncAllPropsEditors) window.syncAllPropsEditors();
    } else {
        // OFF：現ポーズを即適用
        applyPose(currentPose);
    }
};

// ============================================================
// シーケンス再生システム
// ============================================================
let seqFrames = null;
let seqIndex  = 0;
let seqTimer  = 0;
let seqOnComplete = null; // シーケンスが最後まで再生し終わった時に呼ぶコールバック（再生/停止バーの表示を戻すため）

function startSequence(frames) {
    seqFrames = frames;
    seqIndex  = 0;
    seqTimer  = 0;
    idleEnabled = false;
    syncIdleSelect(false);
    applyPose(seqFrames[0].pose, seqFrames[0].blendSeconds);
}

function tickSequence(dt) {
    if (!seqFrames) return;
    seqTimer += dt;
    const cur = seqFrames[seqIndex];
    if (seqTimer >= cur.duration) {
        seqTimer -= cur.duration;
        seqIndex++;
        if (seqIndex >= seqFrames.length) {
            seqFrames = null;
            if (seqOnComplete) {
                const cb = seqOnComplete;
                seqOnComplete = null;
                cb();
            }
            return;
        }
        applyPose(seqFrames[seqIndex].pose, seqFrames[seqIndex].blendSeconds);
    }
}

// ============================================================
// 再生/停止バー（キャラの手前に独立配置。メニューを閉じても操作できる）
// ------------------------------------------------------------
// 🎬 動画編集で組んだ／保存したシーケンスのボタンをタップすると、それを
// 「最後に選んだシーケンス」として覚えておき、このバーの▶/■だけで
// 再生・停止をやり直せるようにする。
// ============================================================
const seqButtonEls = new Map(); // シーケンス（{label,frames}）→ 対応するボタンDOM（active表示の同期用）
let lastSequence     = null;  // 再生バーの▶で再生する対象
let isSequencePlaying = false;

const playStopLabel = document.getElementById('play-stop-label');
const playStopBtn    = document.getElementById('play-stop-btn');

function setSequencePlayingUI(playing) {
    isSequencePlaying = playing;
    playStopBtn.textContent = playing ? '■' : '▶';
    playStopBtn.classList.toggle('playing', playing);
}

// シーケンスを再生する（動画編集のテスト再生ボタン／保存済みボタン／再生バーのどれから呼んでも同じ動作にする）
function playSequence(seq) {
    lastSequence = seq;
    playStopLabel.textContent = seq.label;
    playStopBtn.disabled = false;

    document.querySelectorAll('.slot-apply-btn, .seq-btn').forEach(b => b.classList.remove('active'));
    const btn = seqButtonEls.get(seq);
    if (btn) btn.classList.add('active');

    activeSlotIndex = -1; // シーケンス再生中はどのプリセットにも自動保存しない
    setSequencePlayingUI(true);
    seqOnComplete = () => setSequencePlayingUI(false);
    startSequence(seq.frames);
    if (window.syncAllExpressionEditors) window.syncAllExpressionEditors();
    if (window.syncAllPropsEditors) window.syncAllPropsEditors();
}

// 再生中のシーケンスを途中で止め、待機ポーズへ戻す
function stopSequence() {
    seqFrames = null;
    seqOnComplete = null;
    setSequencePlayingUI(false);
    document.querySelectorAll('.seq-btn').forEach(b => b.classList.remove('active'));
    applyPose(POSE_IDLE);
}

playStopBtn.addEventListener('click', () => {
    if (isSequencePlaying) {
        stopSequence();
    } else if (lastSequence) {
        playSequence(lastSequence);
    }
});
