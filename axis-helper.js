// ============================================================
// 座標軸表示（プレビュー確認専用）
// ------------------------------------------------------------
// 目的: キャラクターを横回転させたときに正面が分からなくなる問題を解消するため、
//       ① XYZ座標軸（X=赤 / Y=緑 / Z=青）と ② キャラの「正面」目印 を表示する。
//
// 【キャラクターの初期正面の定義】
//   正面 = characterGroup ローカルの +Z 方向。
//   根拠（character-body.js の実コード）:
//     ・目/眉/口のPlaneは頭メッシュの +Z 側（z=+1.02 / +1.00 / +0.98）に貼られている
//     ・足グループは ankle から +Z へ 0.18 ずれ（コメント「前方+Z」）、つま先・靴先も +Z へ伸びる
//     ・膝当てドームは +Z 向き、すね当ては前面180°（CylinderGeometryのthetaで z>=0 側）
//     ・初期カメラは (0,3,10) ＝ +Z 側から見ており、起動直後はキャラの顔が見えている
//   Three.js の Y軸まわり回転 θ では +Z は (sinθ, 0, cosθ) へ移る。
//   character-rotate.js の「右＝rotation.yが増える方向＝正面が画面右へ向く」と一致する。
//
// 【設計（既存機能を壊さないための約束）】
//   ・このファイルは既存のどのファイルのロジックも変更しない（HTMLにボタンとscript行を追加するのみ）。
//   ・characterGroup / ボーン / animatedParts / ポーズデータ / セーブデータには一切触れない。
//     キャラ本体やボーンのposition・rotation・scaleも書き換えない。
//   ・表示物は専用Groupで独立管理する:
//       - axisHelperWorld : scene 直下。ワールド固定のXYZ座標軸（キャラが回っても動かない基準）
//       - axisHelperFront : characterRotateWrapper の子（characterGroup の「兄弟」）。
//                           ラッパーの回転にそのまま乗るので、回転・1°刻みの連続回転でも
//                           キャラと完全に同じ向きになり、ずれが蓄積しない（値のコピーを一切しない）。
//   ・GLB出力は characterGroup だけを exporter.parse() に渡している（glb-export.js）。
//     両Groupとも characterGroup の子孫ではないため、出力には絶対に混入しない。
//   ・キャラ再生成（createCharacter）は characterGroup だけを remove/dispose して作り直し、
//     ラッパーとその兄弟（ここの正面目印）には触れないため、再生成しても増殖も消失もしない。
//   ・ポーズ編集ギズモは自前の判定球（hitMeshes）だけをレイキャストする。
//     念のため、このファイルの全メッシュは raycast を無効化し、将来どのRaycasterからも拾われない。
//   ・カメラ追従: OrbitControls の 'change' イベントでカメラ距離に応じてGroupのscaleだけを変える
//     （既存カメラ制御や animate() には手を入れない。専用のタイマー/rAFも持たない）。
//   ・再初期化: 読み込みが二重になっても、先に前回分を destroy() してから作るので古い表示物は残らない。
// ============================================================
(function () {
    'use strict';
    if (typeof scene === 'undefined' || typeof camera === 'undefined') return;

    // 二重初期化の防止（古い表示物・イベント・テクスチャを先に片付ける）
    if (window.axisHelper && typeof window.axisHelper.destroy === 'function') {
        window.axisHelper.destroy();
    }

    // ── 調整用の定数（見た目の微調整はここだけでOK） ─────────────────
    // 足元の高さ: 素足の足裏 ≒ -1.33 / 長靴の底 ≒ -1.54（hip y=0.54, 脚長0.85+0.85, foot -0.10 から算出）
    const GROUND_Y = -1.45;
    // 座標軸の原点（ワールド座標）。キャラの左下・すね付近に置き、顔や体の正面を隠さない。
    // 初期カメラ(0,3,10)・縦長スマホで画面からはみ出さず、下部の再生バーにも隠れにくい位置。
    const AXIS_ORIGIN = { x: -1.2, y: -0.75, z: 0.0 };
    const AXIS_LEN = 1.1;          // 軸の長さ（矢印の先端まで）
    const SHAFT_R = 0.04;          // 軸の太さ（スマホでも見えるよう細線ではなく円柱）
    const HEAD_R = 0.12;           // 矢じりの半径
    const HEAD_LEN = 0.30;         // 矢じりの長さ
    const LABEL_SIZE = 0.46;       // 「X」「Y」「Z」文字の大きさ
    const RING_R = 0.85;           // 正面リングの半径（靴先 z≒0.82 の外側）
    const FRONT_CONE_R = 0.20;     // 正面矢じりの半径
    const FRONT_CONE_LEN = 0.42;   // 正面矢じりの長さ
    const FRONT_LABEL_Y = 0.85;    // 「正面 FRONT」文字の足元からの高さ（下部UIに隠れにくくする）
    const FRONT_LABEL_Z = RING_R + FRONT_CONE_LEN + 0.12;
    // 描画順: Groupのrenderorderは「グループ順」になる。ギズモ(999/998)より下、キャラ(0)より上。
    const ORDER_FRONT = 480;
    const ORDER_WORLD = 500;
    // カメラ距離に応じた大きさ補正（画面上でほぼ一定の大きさ。極端な拡大/縮小はクランプ）
    const SCALE_MIN = 0.4;
    const SCALE_MAX = 2.5;

    const disposables = [];   // geometry / material / texture（destroyで破棄）
    function track(x) { disposables.push(x); return x; }
    const noRaycast = function () { /* どのRaycasterからも選択されない */ };

    // ── 部品 ─────────────────────────────────────────────
    function makeMat(color, opacity) {
        return track(new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: opacity,
            depthTest: false, depthWrite: false   // キャラ本体に埋もれない（常に手前に描く）
        }));
    }
    function markMesh(mesh, order) {
        mesh.renderOrder = order;
        mesh.raycast = noRaycast;
        mesh.userData.axisHelper = true;
        mesh.userData.excludeFromExport = true;
        return mesh;
    }
    // 軸方向 axis('x'|'y'|'z') へ伸びる矢印（円柱＋円錐）を parent に追加する。
    // 注意: Groupを入れ子にするとグループ順(renderOrder)が上書きされるため、Meshを直接parentへ追加する。
    function addArrow(parent, axis, color, len, shaftR, headR, headLen, opacity, ox, oy, oz) {
        const mat = makeMat(color, opacity);
        const shaftLen = len - headLen;
        const shaftGeo = track(new THREE.CylinderGeometry(shaftR, shaftR, shaftLen, 10));
        const headGeo = track(new THREE.ConeGeometry(headR, headLen, 14));
        const shaft = markMesh(new THREE.Mesh(shaftGeo, mat), 0);
        const head = markMesh(new THREE.Mesh(headGeo, mat), 0);
        const a = shaftLen / 2, b = shaftLen + headLen / 2;   // 原点からの中心距離
        if (axis === 'x') {          // +Y → +X
            shaft.rotation.z = head.rotation.z = -Math.PI / 2;
            shaft.position.set(ox + a, oy, oz); head.position.set(ox + b, oy, oz);
        } else if (axis === 'y') {   // +Y のまま
            shaft.position.set(ox, oy + a, oz); head.position.set(ox, oy + b, oz);
        } else {                     // 'z': +Y → +Z
            shaft.rotation.x = head.rotation.x = Math.PI / 2;
            shaft.position.set(ox, oy, oz + a); head.position.set(ox, oy, oz + b);
        }
        parent.add(shaft); parent.add(head);
    }
    // 文字だけのSprite（外部ライブラリ不要。既存の目/口テクスチャと同じCanvasTexture方式）
    function makeLabel(text, fill, widthPx, heightPx, fontPx, worldH) {
        const canvas = document.createElement('canvas');
        canvas.width = widthPx; canvas.height = heightPx;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, widthPx, heightPx);
        ctx.font = 'bold ' + fontPx + "px 'Hiragino Kaku Gothic ProN', Meiryo, Arial, sans-serif";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(6, Math.round(fontPx / 6));
        ctx.strokeStyle = '#1b1b1b';        // 暗い縁取り＝明るい背景でも暗い背景でも読める
        ctx.strokeText(text, widthPx / 2, heightPx / 2);
        ctx.fillStyle = fill;
        ctx.fillText(text, widthPx / 2, heightPx / 2);
        const tex = track(new THREE.CanvasTexture(canvas));
        const mat = track(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(worldH * widthPx / heightPx, worldH, 1);
        sprite.renderOrder = 1;
        sprite.raycast = noRaycast;
        sprite.userData.axisHelper = true;
        sprite.userData.excludeFromExport = true;
        return sprite;
    }

    // ── ① ワールド固定のXYZ座標軸（scene直下の専用Group） ──────────────
    const worldGroup = new THREE.Group();
    worldGroup.name = 'axisHelperWorld';
    worldGroup.renderOrder = ORDER_WORLD;
    worldGroup.position.set(AXIS_ORIGIN.x, AXIS_ORIGIN.y, AXIS_ORIGIN.z);
    worldGroup.userData.axisHelper = true;
    worldGroup.userData.excludeFromExport = true;
    const COL_X = 0xff0000, COL_Y = 0x00b400, COL_Z = 0x0000ff;   // Three.jsの色分け（Yは明るい背景で見えるよう少し濃い緑）
    addArrow(worldGroup, 'x', COL_X, AXIS_LEN, SHAFT_R, HEAD_R, HEAD_LEN, 0.95, 0, 0, 0);
    addArrow(worldGroup, 'y', COL_Y, AXIS_LEN, SHAFT_R, HEAD_R, HEAD_LEN, 0.95, 0, 0, 0);
    addArrow(worldGroup, 'z', COL_Z, AXIS_LEN, SHAFT_R, HEAD_R, HEAD_LEN, 0.95, 0, 0, 0);
    const lx = makeLabel('X', '#ff3b3b', 128, 128, 96, LABEL_SIZE); lx.position.set(AXIS_LEN + 0.28, 0, 0);
    const ly = makeLabel('Y', '#2ee05a', 128, 128, 96, LABEL_SIZE); ly.position.set(0, AXIS_LEN + 0.28, 0);
    const lz = makeLabel('Z', '#4a6bff', 128, 128, 96, LABEL_SIZE); lz.position.set(0, 0, AXIS_LEN + 0.28);
    worldGroup.add(lx); worldGroup.add(ly); worldGroup.add(lz);

    // ── ② キャラの正面目印（characterRotateWrapperの子＝characterGroupの兄弟） ──
    // 足元の黄色いリング＋正面(+Z)へ向く大きな矢じり＋「正面 FRONT」文字。
    // ラッパーの rotation.y にそのまま乗るため、回転機能側の値は読みも書きもしない。
    const frontGroup = new THREE.Group();
    frontGroup.name = 'axisHelperFront';
    frontGroup.renderOrder = ORDER_FRONT;
    frontGroup.position.set(0, GROUND_Y, 0);
    frontGroup.userData.axisHelper = true;
    frontGroup.userData.excludeFromExport = true;
    const COL_FRONT = 0xffb300;
    const frontMat = makeMat(COL_FRONT, 0.95);
    const ring = markMesh(new THREE.Mesh(track(new THREE.TorusGeometry(RING_R, 0.03, 8, 56)), frontMat), 0);
    ring.rotation.x = Math.PI / 2;                       // 地面と平行（XZ平面）
    frontGroup.add(ring);
    const cone = markMesh(new THREE.Mesh(track(new THREE.ConeGeometry(FRONT_CONE_R, FRONT_CONE_LEN, 18)), frontMat), 0);
    cone.rotation.x = Math.PI / 2;                       // 先端を +Z（キャラの正面）へ向ける
    cone.position.set(0, 0, RING_R + FRONT_CONE_LEN / 2);
    frontGroup.add(cone);
    const frontLabel = makeLabel('正面 FRONT', '#ffc533', 384, 112, 64, 0.42);
    frontLabel.position.set(0, FRONT_LABEL_Y, FRONT_LABEL_Z);
    frontGroup.add(frontLabel);

    // ── シーンへ接続（キャラ本体のGroupには絶対に入れない） ──────────
    function frontParent() {
        return (typeof characterRotateWrapper !== 'undefined' && characterRotateWrapper) ? characterRotateWrapper : scene;
    }
    // 何らかの理由で外れていたら付け直す（増殖はしない：同じ2つのGroupを付け直すだけ）
    function ensureAttached() {
        if (worldGroup.parent !== scene) scene.add(worldGroup);
        const fp = frontParent();
        if (frontGroup.parent !== fp) fp.add(frontGroup);
    }
    ensureAttached();

    // ── カメラ距離に応じた大きさ補正（OrbitControlsの'change'イベント。専用ループなし） ──
    const _tgt = (typeof controls !== 'undefined' && controls && controls.target) ? controls.target : null;
    const REF_DIST = _tgt ? Math.max(0.001, camera.position.distanceTo(_tgt)) : 10;
    function updateScale() {
        ensureAttached();
        const d = _tgt ? camera.position.distanceTo(_tgt) : REF_DIST;
        const s = Math.min(SCALE_MAX, Math.max(SCALE_MIN, d / REF_DIST));
        worldGroup.scale.set(s, s, s);
        frontGroup.scale.set(s, s, s);   // 自分自身(兄弟)のscaleのみ。ラッパー/キャラには触れない
    }
    const hasControlsEvents = (typeof controls !== 'undefined' && controls && typeof controls.addEventListener === 'function');
    if (hasControlsEvents) controls.addEventListener('change', updateScale);
    updateScale();

    // ── 表示ON/OFF ───────────────────────────────────────
    let visible = true;   // 初期状態は表示ON
    const btn = document.getElementById('axis-toggle-btn');
    function refreshButton() {
        if (!btn) return;
        btn.textContent = '座標軸：' + (visible ? 'ON' : 'OFF');
        btn.classList.toggle('on', visible);
        btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
    }
    function setVisible(v) {
        visible = !!v;
        ensureAttached();
        worldGroup.visible = visible;
        frontGroup.visible = visible;
        refreshButton();
    }
    function toggle() { setVisible(!visible); }
    // addEventListenerではなくonclickへ代入する（再初期化しても二重に反応しない）
    if (btn) btn.onclick = toggle;
    setVisible(true);

    // ── 後片付け（再初期化用） ───────────────────────────────
    function destroy() {
        if (hasControlsEvents) controls.removeEventListener('change', updateScale);
        if (worldGroup.parent) worldGroup.parent.remove(worldGroup);
        if (frontGroup.parent) frontGroup.parent.remove(frontGroup);
        disposables.forEach(function (d) { if (d && typeof d.dispose === 'function') d.dispose(); });
        disposables.length = 0;
        if (btn && btn.onclick === toggle) btn.onclick = null;
        if (window.axisHelper && window.axisHelper.destroy === destroy) window.axisHelper = null;
    }

    window.axisHelper = {
        setVisible: setVisible,
        toggle: toggle,
        isVisible: function () { return visible; },
        destroy: destroy,
        // テスト/確認用（読み取り専用の参照）
        _groups: { world: worldGroup, front: frontGroup }
    };
})();
