// ============================================================
// キャラクター横回転（プレビュー確認専用）
// ------------------------------------------------------------
// 目的: 3Dプレビュー内のキャラクターを、縦軸（Three.jsのY軸）まわりに
//       その場で水平回転させ、横姿・後ろ姿を確認できるようにする。
//
// 設計（既存機能を壊さないための約束）:
//   ・回転させるのは scene-textures.js が用意した characterRotateWrapper
//     （characterGroupの親Group）の rotation.y だけ。
//     characterGroup・関節・animatedParts・ポーズデータ・セーブデータには一切触れない。
//   ・カメラ（OrbitControls）も動かさない。ボタン操作専用なので、
//     キャンバス上のドラッグ（カメラ操作・ポーズ編集ギズモ）とも干渉しない。
//   ・GLB出力は characterGroup を直接書き出す（親のラッパーは含まれない）ため、
//     ここでの回転は出力に混入しない。
//   ・アニメーションは専用のrequestAnimationFrame等を持たず、既存のanimate()から
//     毎フレーム呼ばれる window._charRotateTick() だけで進む。
//     タイマー等が残らないので、キャラ再生成・画面切替で古い処理が残らない。
//   ・向きの定義：「左」＝キャラの正面が画面の左へ向く方向（rotation.yが減る方向）、
//     「右」＝画面の右へ向く方向（rotation.yが増える方向）。
// ============================================================
(function () {
    'use strict';
    if (typeof characterRotateWrapper === 'undefined') return;
    const wrapper = characterRotateWrapper;

    const DEG = Math.PI / 180;
    const TWO_PI = Math.PI * 2;
    const SPIN_SECONDS = 3.0;        // 360°回転にかける時間
    const STEP_SECONDS_PER_90 = 0.45; // 90°あたりの所要時間（小さい角度は比例して短く）
    const STEP_SECONDS_MIN = 0.08;

    // 現在進行中のアニメーション（同時に1つだけ）。無い時は null。
    // { kind:'step'|'spin'|'reset', from, to, rest, t0, dur }
    let anim = null;

    // 角度を (-π, π] に正規化する（数値が無制限に増えないようにする）
    function normalize(a) {
        a = a % TWO_PI;
        if (a > Math.PI) a -= TWO_PI;
        else if (a <= -Math.PI) a += TWO_PI;
        return a;
    }
    function easeInOut(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2; // 緩やかに加速・減速（ピーク速度が小さく、急に飛ばない）
    }

    function setAngle(a) {
        wrapper.rotation.y = normalize(a);
    }

    function refreshButtons() {
        const spinBtn = document.getElementById('rot-spin');
        const stopBtn = document.getElementById('rot-stop');
        if (spinBtn) spinBtn.classList.toggle('active', !!anim && anim.kind === 'spin');
        if (stopBtn) stopBtn.disabled = !anim;
    }

    // 進行中のアニメーションを確実に止め、その時点の見た目の向きで固定する
    function stopAnim() {
        if (!anim) return;
        anim = null;
        setAngle(wrapper.rotation.y);
        refreshButtons();
    }

    function startTween(kind, from, to, seconds, rest) {
        anim = { kind, from, to, rest, t0: performance.now(), dur: Math.max(0.01, seconds) };
        refreshButtons();
    }

    // 相対回転（度）。進行中のアニメーションは先に停止してから始める。
    // 直前のステップ回転がまだ動いている最中に押した場合は、その目標角度を基準に
    // 足し込む（素早く2回押せば確実に180°になる）。360°回転中だった場合は、
    // その時点の見た目の向きを基準にする。
    function rotateBy(deg) {
        const base = (anim && anim.kind === 'step') ? anim.to : wrapper.rotation.y;
        const from = wrapper.rotation.y;
        anim = null;
        const delta = deg * DEG;
        const to = base + delta;
        const seconds = Math.max(STEP_SECONDS_MIN, STEP_SECONDS_PER_90 * Math.abs(to - from) / (Math.PI / 2));
        startTween('step', from, to, seconds, normalize(to));
    }

    // 正面（初期角度0）へ戻す。向きだけを戻し、ポーズには触れない。
    function resetFront() {
        stopAnim();
        const from = normalize(wrapper.rotation.y);
        wrapper.rotation.y = from;
        if (Math.abs(from) < 1e-6) { setAngle(0); refreshButtons(); return; }
        const seconds = 0.15 + 0.45 * Math.abs(from) / Math.PI;
        startTween('reset', from, 0, seconds, 0);
    }

    // 360°回転（その場で一周）。回転中にもう一度呼ぶと停止する。
    function toggleSpin() {
        if (anim && anim.kind === 'spin') { stopAnim(); return; }
        stopAnim();
        const from = wrapper.rotation.y;
        startTween('spin', from, from + TWO_PI, SPIN_SECONDS, normalize(from));
    }

    // animate()から毎フレーム呼ばれる。専用のタイマーは持たない。
    window._charRotateTick = function () {
        if (!anim) return;
        const t = Math.min(1, (performance.now() - anim.t0) / (anim.dur * 1000));
        if (t >= 1) {
            // 終了時は目標の向きにぴたりと合わせる（誤差を残さない）
            wrapper.rotation.y = anim.rest;
            anim = null;
            refreshButtons();
            return;
        }
        wrapper.rotation.y = anim.from + (anim.to - anim.from) * easeInOut(t);
    };

    window.characterRotate = { rotateBy, resetFront, toggleSpin, stop: stopAnim };

    function bind(id, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    }
    bind('rot-left-90',  () => rotateBy(-90));
    bind('rot-left-1',   () => rotateBy(-1));
    bind('rot-right-1',  () => rotateBy(1));
    bind('rot-right-90', () => rotateBy(90));
    bind('rot-front',    resetFront);
    bind('rot-spin',     toggleSpin);
    bind('rot-stop',     stopAnim);
    // 回転メニューの折りたたみ（開閉しても回転状態・アニメーションには影響しない）
    bind('rot-toggle', () => {
        const bar = document.getElementById('char-rotate-bar');
        const toggle = document.getElementById('rot-toggle');
        if (!bar || !toggle) return;
        const collapsed = bar.classList.toggle('collapsed');
        toggle.textContent = collapsed ? '🔄 回転 ▲' : '🔄 回転 ▼';
    });
    refreshButtons();
})();
