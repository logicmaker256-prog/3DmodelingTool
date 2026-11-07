// 1. 初期設定
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3, 10);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.target.set(0, 2, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// 2. テクスチャ生成
// ── 目テクスチャ：トモコレ風に12種類対応 ──────────────────────
// 左目 cx=64（外側=画面左方向）／右目 cx=192（外側=画面右方向）
function createEyeTexture(type, eyeColor) {
    eyeColor = eyeColor || '#000000';
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);

    // fn(cx, outerDir) を左右の目に対して呼ぶ。outerDir は「外側方向」の符号
    // （左目=-1・右目=+1）。offset * outerDir で常に「外側へ動く量」になる。
    function eachEye(fn) {
        fn(64, -1);
        fn(192, 1);
    }

    switch (type) {
        case 'anime01': // 標準丸目
            eachEye((cx) => {
                ctx.fillStyle = eyeColor;
                ctx.beginPath(); ctx.ellipse(cx, 64, 20, 35, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(cx, 45, 8, 0, Math.PI * 2); ctx.fill();
            });
            break;

        case 'anime02': // ジト目（横長・フラット）
            eachEye((cx) => {
                ctx.fillStyle = eyeColor;
                ctx.fillRect(cx - 24, 44, 48, 16);
            });
            break;

        case 'anime03': // 笑顔（にっこり弧線・目を閉じた笑み）
            eachEye((cx) => {
                ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.arc(cx, 70, 24, Math.PI, Math.PI * 2); ctx.stroke();
            });
            break;

        case 'anime04': // つり目（外側の吊り上がった鋭い目）
            eachEye((cx, o) => {
                ctx.fillStyle = eyeColor;
                ctx.beginPath();
                ctx.moveTo(cx - 26 * o, 66);
                ctx.quadraticCurveTo(cx, 34, cx + 24 * o, 46);
                ctx.quadraticCurveTo(cx + 6 * o, 76, cx - 26 * o, 66);
                ctx.closePath(); ctx.fill();
            });
            break;

        case 'anime05': // 泣き目（涙をたたえた丸目）
            eachEye((cx, o) => {
                ctx.fillStyle = eyeColor;
                ctx.beginPath(); ctx.ellipse(cx, 62, 18, 28, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(cx, 50, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#7ec8ff';
                ctx.beginPath();
                ctx.moveTo(cx + 20 * o, 88);
                ctx.quadraticCurveTo(cx + 28 * o, 104, cx + 20 * o, 114);
                ctx.quadraticCurveTo(cx + 12 * o, 104, cx + 20 * o, 88);
                ctx.fill();
            });
            break;

        case 'anime06': // 驚き（大きく見開いた目）
            eachEye((cx) => {
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(cx, 62, 32, 0, Math.PI * 2); ctx.fill();
                ctx.lineWidth = 5; ctx.strokeStyle = '#000';
                ctx.beginPath(); ctx.arc(cx, 62, 32, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = eyeColor;
                ctx.beginPath(); ctx.arc(cx, 64, 15, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(cx, 56, 5, 0, Math.PI * 2); ctx.fill();
            });
            break;

        case 'anime07': // ハート目
            eachEye((cx) => {
                ctx.fillStyle = '#ff5c8a';
                ctx.beginPath();
                ctx.moveTo(cx, 88);
                ctx.bezierCurveTo(cx - 34, 55, cx - 18, 30, cx, 46);
                ctx.bezierCurveTo(cx + 18, 30, cx + 34, 55, cx, 88);
                ctx.fill();
            });
            break;

        case 'anime08': // キラキラ（星の光＋丸目）
            eachEye((cx) => {
                ctx.fillStyle = eyeColor;
                ctx.beginPath(); ctx.ellipse(cx, 64, 20, 34, 0, 0, Math.PI * 2); ctx.fill();
                function star(sx, sy, r) {
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
                        const a2 = a + Math.PI / 5;
                        ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
                        ctx.lineTo(sx + Math.cos(a2) * r * 0.45, sy + Math.sin(a2) * r * 0.45);
                    }
                    ctx.closePath(); ctx.fill();
                }
                star(cx - 6, 48, 11);
                star(cx + 9, 76, 6);
            });
            break;

        case 'anime09': // 半目（けだるげ・眠たそうな半開き目）
            eachEye((cx) => {
                ctx.fillStyle = eyeColor;
                ctx.beginPath();
                ctx.moveTo(cx - 26, 60);
                ctx.quadraticCurveTo(cx, 46, cx + 26, 60);
                ctx.quadraticCurveTo(cx, 78, cx - 26, 60);
                ctx.fill();
                // 上瞼側を消して半開きに見せる
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillRect(cx - 30, 30, 60, 22);
                ctx.globalCompositeOperation = 'source-over';
            });
            break;

        case 'anime10': // にこ目（浅く優しい弧・anime03より控えめ）
            eachEye((cx) => {
                ctx.lineWidth = 7; ctx.strokeStyle = '#000'; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.arc(cx, 84, 20, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
            });
            break;

        case 'anime11': // ウインク（片目だけ閉じる）
            ctx.fillStyle = eyeColor;
            ctx.beginPath(); ctx.ellipse(64, 64, 20, 35, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(64, 45, 8, 0, Math.PI * 2); ctx.fill();
            ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(192, 70, 24, Math.PI, Math.PI * 2); ctx.stroke();
            break;

        case 'anime12': // ぐるぐる（渦巻き目）
            eachEye((cx) => {
                ctx.strokeStyle = eyeColor; ctx.lineWidth = 4; ctx.lineCap = 'round';
                ctx.beginPath();
                const turns = 2.2;
                for (let a = 0; a <= turns * Math.PI * 2; a += 0.15) {
                    const r = 2 + a * 3.2;
                    const x = cx + Math.cos(a) * r;
                    const y = 64 + Math.sin(a) * r;
                    if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            });
            break;

        default:
            eachEye((cx) => {
                ctx.fillStyle = eyeColor;
                ctx.beginPath(); ctx.ellipse(cx, 64, 20, 35, 0, 0, Math.PI * 2); ctx.fill();
            });
    }

    return new THREE.CanvasTexture(canvas);
}

// ── 口テクスチャ：12種類対応 ──────────────────────────────
function createMouthTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 64);
    ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineCap = 'round';

    switch (type) {
        case 'mouth01': // 普通
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(40, 18); ctx.quadraticCurveTo(64, 24, 88, 18); ctx.stroke();
            break;

        case 'mouth02': // 笑顔
            ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(64, 6, 20, 0, Math.PI); ctx.stroke();
            break;

        case 'mouth03': // 大笑い
            ctx.beginPath(); ctx.ellipse(64, 20, 26, 18, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.ellipse(64, 9, 24, 8, 0, 0, Math.PI); ctx.fill();
            break;

        case 'mouth04': // O口
            ctx.beginPath(); ctx.ellipse(64, 16, 13, 16, 0, 0, Math.PI * 2); ctx.fill();
            break;

        case 'mouth05': // 真一文字
            ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(38, 14); ctx.lineTo(90, 14); ctx.stroke();
            break;

        case 'mouth06': // への字
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(38, 10); ctx.lineTo(64, 22); ctx.lineTo(90, 6);
            ctx.stroke();
            break;

        case 'mouth07': // 泣き口（波打つ口）
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(36, 12);
            ctx.quadraticCurveTo(46, 26, 56, 14);
            ctx.quadraticCurveTo(64, 26, 72, 14);
            ctx.quadraticCurveTo(82, 26, 92, 12);
            ctx.stroke();
            break;

        case 'mouth08': // ニヤリ（片側が上がる不敵な笑み）
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(40, 16); ctx.quadraticCurveTo(66, 24, 92, 4);
            ctx.stroke();
            break;

        case 'mouth09': // あくび（縦に大きく開いた口）
            ctx.beginPath(); ctx.ellipse(64, 20, 15, 24, 0, 0, Math.PI * 2); ctx.fill();
            break;

        case 'mouth10': // ベー（舌を出す）
            ctx.beginPath(); ctx.ellipse(64, 15, 20, 15, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff8fa3';
            ctx.beginPath(); ctx.ellipse(64, 30, 9, 14, 0, 0, Math.PI * 2); ctx.fill();
            break;

        case 'mouth11': // 歯見せ（歯の見える笑顔）
            ctx.beginPath(); ctx.arc(64, 4, 22, 0, Math.PI); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(44, 4, 40, 9);
            break;

        case 'mouth12': // 満面の笑み（大きく開いた歯見せ笑顔）
            ctx.beginPath(); ctx.ellipse(64, 12, 30, 20, 0, 0, Math.PI); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(38, 10, 52, 11);
            break;

        default:
            ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(64, 10, 20, 0, Math.PI); ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
}

// ── 眉テクスチャ：10種類対応 ──────────────────────────────
// 左眉 cx=64／右眉 cx=192。side=+1(左眉)/-1(右眉)。
// outerX = cx - 26*side（外側）／innerX = cx + 26*side（内側・鼻寄り）
function createEyebrowTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 100);
    ctx.strokeStyle = '#2a2016'; ctx.fillStyle = '#2a2016'; ctx.lineCap = 'round';

    function eachBrow(fn) {
        fn(64, 1);   // 左眉
        fn(192, -1); // 右眉
    }

    switch (type) {
        case 'brow01': // 普通
            eachBrow((cx, side) => {
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(cx - 26 * side, 55);
                ctx.quadraticCurveTo(cx, 45, cx + 26 * side, 52);
                ctx.stroke();
            });
            break;

        case 'brow02': // 太眉
            eachBrow((cx, side) => {
                ctx.lineWidth = 16;
                ctx.beginPath();
                ctx.moveTo(cx - 26 * side, 55);
                ctx.quadraticCurveTo(cx, 44, cx + 26 * side, 52);
                ctx.stroke();
            });
            break;

        case 'brow03': // 細眉
            eachBrow((cx, side) => {
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(cx - 24 * side, 54);
                ctx.quadraticCurveTo(cx, 46, cx + 24 * side, 51);
                ctx.stroke();
            });
            break;

        case 'brow04': // 怒り（外側が上がり内側が下がる・つり眉）
            eachBrow((cx, side) => {
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(cx - 26 * side, 36);
                ctx.lineTo(cx + 26 * side, 62);
                ctx.stroke();
            });
            break;

        case 'brow05': // 困り（内側が上がる・優しい八の字）
            eachBrow((cx, side) => {
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(cx - 26 * side, 58);
                ctx.quadraticCurveTo(cx, 42, cx + 26 * side, 40);
                ctx.stroke();
            });
            break;

        case 'brow06': // ハの字（困り眉をより直線的・極端に）
            eachBrow((cx, side) => {
                ctx.lineWidth = 9;
                ctx.beginPath();
                ctx.moveTo(cx - 24 * side, 66);
                ctx.lineTo(cx + 24 * side, 36);
                ctx.stroke();
            });
            break;

        case 'brow07': // 上がり眉（外側が上がるキリッとした眉）
            eachBrow((cx, side) => {
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(cx - 26 * side, 34);
                ctx.quadraticCurveTo(cx, 44, cx + 26 * side, 56);
                ctx.stroke();
            });
            break;

        case 'brow08': // 下がり眉（外側が下がる優しい眉）
            eachBrow((cx, side) => {
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(cx - 26 * side, 62);
                ctx.quadraticCurveTo(cx, 48, cx + 26 * side, 42);
                ctx.stroke();
            });
            break;

        case 'brow09': // 驚き（高い位置でアーチ状に上がる）
            eachBrow((cx, side) => {
                ctx.lineWidth = 7;
                ctx.beginPath();
                ctx.moveTo(cx - 26 * side, 42);
                ctx.quadraticCurveTo(cx, 12, cx + 26 * side, 42);
                ctx.stroke();
            });
            break;

        case 'brow10': // 無し
            break;

        default:
            eachBrow((cx, side) => {
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(cx - 26 * side, 55);
                ctx.quadraticCurveTo(cx, 45, cx + 26 * side, 52);
                ctx.stroke();
            });
    }

    return new THREE.CanvasTexture(canvas);
}

// 3. キャラクター生成
let characterGroup = null;
// ★プレビュー専用の横回転ラッパー（character-rotate.js が rotation.y だけを操作する）
//   ・characterGroup 自体の position/rotation/scale は従来どおり常に原点固定・無回転のまま。
//   ・ラッパーはキャラ再生成（createCharacter）をまたいで常に1つだけ存在し続ける。
//   ・GLB出力は characterGroup を直接書き出す（親は含まれない）ため、この回転は混入しない。
const characterRotateWrapper = new THREE.Group();
characterRotateWrapper.name = 'characterRotateWrapper';
scene.add(characterRotateWrapper);
let animatedParts = {};
// ★ 修正：初期データに earType: "human" を追加
// ★表情システム改修：eyeType/mouthType/eyebrowTypeはキャラ固有の値ではなくなり
//   「デフォルト表情」（DEFAULT_EXPRESSION、下記）として一本化されたため、
//   characterDataからは削除した。eyeColor（色）だけは表情に依存しないキャラ属性
//   として引き続きここで保持する。
// ★左手小道具改修：hasShield(boolean)から、持たない/盾/収穫袋の3種類を表せる
//   leftPropType(文字列)へ移行した。新規のcharacterDataにはhasShieldフィールド自体を
//   持たせないが、hasShieldしか持たない古い保存データを読み込んだ場合は
//   resolveLeftPropType() が自動的に 'shield' として解決する（後方互換）。
// ★頭部アクセサリー改修：hasHelmet(boolean)から、なし/ヘルメット/カチューシャの
//   3種類を表せるheadAccessory(文字列)へ移行した。新規のcharacterDataにはhasHelmet
//   フィールド自体を持たせないが、hasHelmetしか持たない古い保存データを読み込んだ
//   場合はcreateCharacter()・save-load-ui.jsの読込処理が自動的に'helmet'として
//   解決する（後方互換）。また、カチューシャは「メイド服を選ぶと自動で付く」ものでは
//   なく、この頭部アクセサリー選択から独立して選べる（メイド服選択とは連動しない）。
let characterData = { headScaleY: 1.1, headScaleX: 1.0, jawWidth: 0.8, eyeColor: "#000000", hairType: "short01", hairColor: "#333333", bodyColor: "#ffe0c0", bustSize: 0.5, earType: "human", bustProtrude: 0.33, shirtColor: "#ffffff", maidColor: "#2b2b36", topWear: "shirt", bottomWear: "none", pantsColor: "#4466aa", skirtColor: "#ffffff", bootsColor: "none", swordType: "none", fishingRodBend: "straight", leftPropType: "none", bowState: "nocked", headAccessory: "none", plateColor: "#d8dce0", plateTrimColor: "#d4af37" };

// ============================================================
// 表情システム（ポーズごとの目・眉・口）
// ------------------------------------------------------------
// 設計:
//   ・キャラタブの表情は「デフォルト表情」に固定（DEFAULT_EXPRESSION）
//   ・ポーズごとに「表情を使用する」ON/OFF＋表情プリセットを保存できる
//   ・OFFの時はDEFAULT_EXPRESSIONを表示、ONの時はそのポーズ専用の表情を表示
// ============================================================

// デフォルト表情（キャラタブ＝目:標準丸目／口:普通／眉:普通、固定値）
const DEFAULT_EXPRESSION = { eyeType: 'anime01', mouthType: 'mouth01', eyebrowType: 'brow01' };

// ポーズに割り当てられる8種の表情プリセット
const EXPRESSION_PRESETS = [
    { key: 'normal',     emoji: '😊', label: '普通',           usage: '待機・歩き',         eyeType: 'anime01', mouthType: 'mouth01', eyebrowType: 'brow01' },
    { key: 'smile',      emoji: '😄', label: '笑顔',           usage: '会話・勝利',         eyeType: 'anime01', mouthType: 'mouth02', eyebrowType: 'brow01' },
    { key: 'angry',      emoji: '😠', label: '怒り',           usage: '攻撃・必殺技',       eyeType: 'anime04', mouthType: 'mouth06', eyebrowType: 'brow04' },
    { key: 'surprised',  emoji: '😲', label: '驚き',           usage: 'ダメージ・イベント', eyeType: 'anime06', mouthType: 'mouth04', eyebrowType: 'brow09' },
    { key: 'pain',       emoji: '😣', label: '痛い',           usage: '被弾・吹き飛び',     eyeType: 'anime09', mouthType: 'mouth07', eyebrowType: 'brow06' },
    { key: 'cry',        emoji: '😢', label: '泣き',           usage: '戦闘不能・イベント', eyeType: 'anime05', mouthType: 'mouth07', eyebrowType: 'brow05' },
    { key: 'serious',    emoji: '😤', label: '真剣',           usage: 'ボス戦・構え',       eyeType: 'anime04', mouthType: 'mouth05', eyebrowType: 'brow07' },
    { key: 'joy',        emoji: '😆', label: '目を閉じた笑顔', usage: '喜び・クリア',       eyeType: 'anime03', mouthType: 'mouth12', eyebrowType: 'brow01' },
];

// {eyeType, mouthType, eyebrowType} のディープコピーを作る。
// ★必須ルール：ポーズ間・プリセット間で同じオブジェクト参照を共有しないため、
//   表情を保存・適用するあらゆる箇所は必ずこの関数を経由する。
function cloneExpression(expr) {
    const e = expr || DEFAULT_EXPRESSION;
    return { eyeType: e.eyeType, mouthType: e.mouthType, eyebrowType: e.eyebrowType };
}

// 現在エディタに表示中の表情（キャラ再構築後の再適用に使う。下のapplyFaceExpressionが更新する）
let currentDisplayedExpression = cloneExpression(DEFAULT_EXPRESSION);

// 目・口・眉のCanvasTexture/Materialを、指定した表情の内容に直接差し替える。
// ★重要：createCharacter()でキャラ全体を再構築するのではなく、既存メッシュの
//   material.mapだけを差し替えるので、ポーズ切替のたびに毎回キャラを
//   再構築する重い処理を避けられる。
// ★古いCanvasTextureは必ずdispose()し、GPUメモリリークを防ぐ。
function applyFaceExpression(expr) {
    const e = cloneExpression(expr);
    currentDisplayedExpression = e;
    const face = animatedParts && animatedParts.face;
    if (!face) return;

    const newEyeTex = createEyeTexture(e.eyeType, characterData.eyeColor);
    const oldEyeTex = face.eyes.map;
    face.eyes.map = newEyeTex;
    face.eyes.needsUpdate = true;
    if (oldEyeTex) oldEyeTex.dispose();

    const newMouthTex = createMouthTexture(e.mouthType);
    const oldMouthTex = face.mouth.map;
    face.mouth.map = newMouthTex;
    face.mouth.needsUpdate = true;
    if (oldMouthTex) oldMouthTex.dispose();

    const newBrowTex = createEyebrowTexture(e.eyebrowType);
    const oldBrowTex = face.eyebrow.map;
    face.eyebrow.map = newBrowTex;
    face.eyebrow.needsUpdate = true;
    if (oldBrowTex) oldBrowTex.dispose();
}
window.applyFaceExpression = applyFaceExpression;

// スロットの状態から「今表示すべき表情」を導く（OFF or 未設定ならデフォルト表情）
function getEffectiveExpression(slot) {
    if (slot && slot.expressionEnabled && slot.expression) return slot.expression;
    return DEFAULT_EXPRESSION;
}
window.getEffectiveExpression = getEffectiveExpression;

// createCharacter()でface周りのメッシュ/マテリアルが新しいオブジェクトに
// 置き換わった直後に呼ばれ、直前まで表示していた表情を新しいメッシュに
// 再適用する。これが無いと、髪色変更など無関係な操作でキャラを再構築する
// たびに表情がデフォルトへ戻ってしまう。
window._reapplyCurrentExpression = function () {
    applyFaceExpression(currentDisplayedExpression);
};

// 剣の基本姿勢（右手で握った状態。切っ先は正面・縦持ち）
// ポーズごとの swordTiltX はこのX値に加算される追加の上下チルト
const SWORD_BASE_ROTATION = { x: Math.PI / 2, y: Math.PI / 2, z: 0.1 };

// 鍬（右手）の基準回転。
// 剣と違い、鍬は「柄をほぼ縦に持ち、刃先を地面に突き立てる」見た目にしたいだけなので、
// wrist（回転0＝腕がほぼ真下に垂れる向き）に対してほとんど回転を掛けない。
// ＝createHoe()側で柄の方向をローカルYにそろえてあるため、ここは単位回転に近い値でよい。
const HOE_BASE_ROTATION = { x: -0.08, y: 0, z: 0.03 };

// ジョウロ（右手）の基準回転。
// createWateringCan()側は「注ぎ口がローカルX方向（横）に伸び、本体は握り位置
// （取っ手の頂点）からローカルY-方向（下）に丸ごとぶら下がる」向きで作って
// あるため、Y軸まわりに-90°回転させて注ぎ口を正面（wristローカルのZ+方向。
// 鍬の刃と同じ「前方」の向き）へ向ける。上下のぶら下がり方向はY軸回転では
// 変化しないため、鍬と同じくX/Zチルトは0のままでよい。
const WATERING_CAN_BASE_ROTATION = { x: 0, y: -Math.PI / 2, z: 0 };

// 釣り竿（右手）の基準回転。
// createFishingRod()は剣と同じ規約（原点＝握りの中心、竿先がローカル+Y方向）で作ってあるため、
// 剣と同じ基準回転（竿先が正面へ向く持ち方）を使い、ポーズごとのswordTiltXも剣と同じ意味になる。
// （SWORD_BASE_ROTATIONを直接共有せず値をコピーしているのは、将来どちらかだけ調整できるようにするため）
const FISHING_ROD_BASE_ROTATION = { x: SWORD_BASE_ROTATION.x, y: SWORD_BASE_ROTATION.y, z: SWORD_BASE_ROTATION.z };

// 斧（右手）の基準回転。
// createAxe()は「握りが原点・柄がローカルY軸・頭部が+Y側・刃先が+Z（正面）」で作ってあり、
// 鍬と同様に腕が垂れた状態（回転0）で柄がほぼ縦になる。頭部がわずかに前へ倒れるよう
// X軸まわりに少しだけ傾けて、体に頭部が当たりにくい持ち方にする。
// ポーズごとのswordTiltXはこのX値に加算される（鍬・剣と同じ扱い）。
const AXE_BASE_ROTATION = { x: 0.15, y: 0, z: 0 };

// 現在右手に装備している小道具（剣/大剣/鍬/ジョウロ/釣り竿/斧）の基準回転。
// createCharacter()実行時にswordTypeへ応じて切り替える。
// pose-data.js / pose-slots.js / glb-export.js は SWORD_BASE_ROTATION を直接参照せず、
// 必ずこの変数を経由する（小道具ごとに基準回転の意味が全く異なるため）。
let ACTIVE_PROP_BASE_ROTATION = SWORD_BASE_ROTATION;

// ── メモリ解放ヘルパー ──────────────────────────────
// characterGroup を作り直す前に、古いGroup配下の
// ジオメトリ・マテリアル・テクスチャ（目/口のCanvasTexture含む）を
// すべてGPUメモリから明示的に破棄する。
// これを呼ばないと scene.remove() だけでは解放されず、
// カスタマイズ操作のたびにキャラクター1体分がリークし続ける。
function disposeObject3D(root) {
    if (!root) return;
    root.traverse((node) => {
        if (node.geometry) {
            node.geometry.dispose();
        }
        if (node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((mat) => {
                ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap', 'aoMap', 'bumpMap']
                    .forEach((key) => { if (mat[key]) mat[key].dispose(); });
                mat.dispose();
            });
        }
    });
}

// ============================================================
// 小道具システム（ポーズごとの右手武器・左手盾）
// ------------------------------------------------------------
// 設計（表情システムと同じ考え方だが、1点だけ異なる）:
//   ・「キャラタブ」の小道具設定（characterData.swordType / leftPropType）を
//     そのまま「デフォルトの小道具」として扱う（表情のように専用の固定定数へ
//     切り離すのではなく、キャラタブのセレクトは引き続き有効な設定項目のまま）。
//   ・ポーズごとに「小道具を変更する」ON/OFF＋右手武器/左手盾の内容を保存できる。
//   ・OFFの時はキャラのデフォルト小道具を表示、ONの時はそのポーズ専用の小道具を表示。
//   ・「今表示すべき小道具」は常にその場で計算し直す（値をキャッシュして使い回すと、
//     キャラタブでデフォルトを変更した直後にキャラが再構築された時、
//     古い小道具が復活してしまうバグになるため）。
// ============================================================

// 左手小道具の実際の種類（'none' / 'shield' / 'harvestBag'）を解決する。
// ★後方互換：leftPropType（新形式）があればそれを使う。無い場合は旧形式の
//   hasShield(boolean)しか持たないデータ（古い保存ファイル／古いポーズ設定）とみなし、
//   hasShield:true なら 'shield' として読み込む。どちらも無ければ 'none'。
function resolveLeftPropType(src) {
    if (!src) return 'none';
    if (src.leftPropType) return src.leftPropType;
    if (src.hasShield) return 'shield';
    return 'none';
}
window.resolveLeftPropType = resolveLeftPropType;

// {swordType, leftPropType} のディープコピーを作る。
// ★必須ルール：ポーズ間・キャラのデフォルト設定間で同じオブジェクト参照を
//   共有しないため、小道具を保存・適用するあらゆる箇所は必ずこの関数を経由する。
// ★釣り竿の曲がり状態(fishingRodBend)は、ポーズ別の小道具設定(slot.props)にも保存できる
//   （ポーズ編集タブ／ポーズ編集ポップアップの「釣り竿の状態」）。slot.propsにfishingRodBendが
//   無い（既存の保存データ・既存のポーズ設定）場合は、キャラタブで選んだ値
//   （characterData.fishingRodBend）で補う。
function cloneProps(p) {
    const src = p || characterData;
    return {
        swordType: src.swordType || 'none',
        leftPropType: resolveLeftPropType(src),
        fishingRodBend: normalizeFishingRodBend(src.fishingRodBend ?? characterData.fishingRodBend),
        // 弓の状態（無い古いデータはキャラタブの値で補う。左手が弓の時だけ意味を持つ）
        bowState: normalizeBowState(src.bowState ?? characterData.bowState),
    };
}
window.cloneProps = cloneProps;

// GLB書き出しで「左手小道具の種類」を区別するキー。
// 弓だけは状態ごとに別モデルなので 'bow:drawn' のように状態を含める（盾・収穫袋・noneはそのまま）。
function getLeftPropVariantKey(props) {
    if (!props) return 'none';
    const t = resolveLeftPropType(props);
    if (t === 'bow') return 'bow:' + normalizeBowState(props.bowState);
    return t;
}
window.getLeftPropVariantKey = getLeftPropVariantKey

// GLB書き出しで「右手小道具の種類」を区別するキー。
// 釣り竿だけは曲がり状態ごとに別モデルなので 'fishingRod:straight' のように状態を含める。
// それ以外（剣・大剣・鍬・ジョウロ・none）は従来どおりswordTypeそのまま。
function getPropVariantKey(props) {
    if (!props) return 'none';
    if (props.swordType === 'fishingRod') return 'fishingRod:' + normalizeFishingRodBend(props.fishingRodBend);
    return props.swordType || 'none';
}
window.getPropVariantKey = getPropVariantKey;

// スロットの状態から「今装備すべき小道具」を導く
// （OFF or 未設定ならキャラタブの現在のデフォルト小道具＝characterData）
function getEffectiveProps(slot) {
    if (slot && slot.propsEnabled && slot.props) return cloneProps(slot.props);
    return cloneProps(characterData);
}
window.getEffectiveProps = getEffectiveProps;

// ★弓ポーズ（slot.bowStateを持つポーズ）の弓の状態をGLB書き出し用に反映した小道具設定。
//   ・ポーズの小道具上書きがOFFで、キャラのデフォルト左手が弓の時だけ、ポーズ側の状態を使う。
//   ・弓を装備していなければ何も変わらない（弓を勝手に装備させない）。
function getExportProps(slot) {
    const p = getEffectiveProps(slot);
    if (p.leftPropType === 'bow' && slot && !slot.propsEnabled && slot.bowState) {
        p.bowState = normalizeBowState(slot.bowState);
    }
    return p;
}
window.getExportProps = getExportProps;

// ★弓ポーズを適用した時、弓を装備している場合に限り、弓の状態をそのポーズの状態へ切り替える。
//   （ポーズ別の小道具上書きがONのポーズは、その上書き内容を優先するので何もしない）
function syncBowStateFromSlot(slot) {
    if (!slot || !slot.bowState || slot.propsEnabled) return;
    if (resolveLeftPropType(characterData) !== 'bow') return;
    characterData.bowState = normalizeBowState(slot.bowState);
    if (window.syncBowStateUI) window.syncBowStateUI();
}
window.syncBowStateFromSlot = syncBowStateFromSlot;

// 右手武器・左手盾のメッシュを、既存の骨格（wrist）に対して直接差し替える。
// ★重要：createCharacter()でキャラ全体を再構築するのではなく、既存のwristの
//   子を付け替えるだけなので、ポーズ切替のたびに毎回キャラを再構築する
//   重い処理を避けられる（表情システムのapplyFaceExpressionと同じ考え方）。
// ★古いGeometry/Materialは必ずdisposeObject3D()で破棄し、GPUメモリリークを防ぐ。
function applyCharacterProps(props) {
    const p = cloneProps(props);
    const parts = animatedParts;
    if (!parts || !parts.arms || parts.arms.length < 2) return;

    const rightWrist = parts.arms[1].wrist;
    const leftWrist   = parts.arms[0].wrist;

    // ── 右手：剣・大剣・鍬・ジョウロ・釣り竿・斧の入れ替え ──
    if (parts.sword) {
        rightWrist.remove(parts.sword);
        disposeObject3D(parts.sword);
        parts.sword = null;
    }
    if (p.swordType !== 'none') {
        let prop;
        if (p.swordType === 'hoe') {
            prop = createHoe();
            ACTIVE_PROP_BASE_ROTATION = HOE_BASE_ROTATION;
        } else if (p.swordType === 'wateringCan') {
            prop = createWateringCan();
            ACTIVE_PROP_BASE_ROTATION = WATERING_CAN_BASE_ROTATION;
        } else if (p.swordType === 'fishingRod') {
            prop = createFishingRod(p.fishingRodBend); // 3状態は同じ関数・同じ寸法から生成（曲がり角だけ違う）
            ACTIVE_PROP_BASE_ROTATION = FISHING_ROD_BASE_ROTATION;
        } else if (p.swordType === 'axe') {
            prop = createAxe();
            ACTIVE_PROP_BASE_ROTATION = AXE_BASE_ROTATION;
        } else {
            const swordScale = (p.swordType === 'greatsword') ? 2 : 1; // 大剣は通常の剣の2倍サイズ
            prop = createSword(swordScale);
            ACTIVE_PROP_BASE_ROTATION = SWORD_BASE_ROTATION;
        }
        rightWrist.add(prop);
        // 握りやすいよう基本姿勢を設定（この直後に呼ばれるapplyPoseSnapshot/tickPoseLerpが
        // ポーズごとのswordTiltXで上下チルトを上書きする）
        prop.rotation.set(ACTIVE_PROP_BASE_ROTATION.x, ACTIVE_PROP_BASE_ROTATION.y, ACTIVE_PROP_BASE_ROTATION.z);
        parts.sword = prop;
    }

    applyLeftHandProp(p);
}

// 左手小道具（持たない/盾/収穫袋/弓のうち常に1つだけ表示）の入れ替え。
// 右手の小道具には触れないので、弓の状態切替のように左手だけ差し替えたい時にも使える。
function applyLeftHandProp(props) {
    const p = cloneProps(props);
    const parts = animatedParts;
    if (!parts || !parts.arms || parts.arms.length < 2) return;
    const leftWrist = parts.arms[0].wrist;

    // ★盾のロジックは以前のまま変更していない（既存機能を壊さないため）。
    //   収穫袋はそれと並列の分岐として追加しただけ。
    if (parts.shield) {
        leftWrist.remove(parts.shield);
        disposeObject3D(parts.shield);
        parts.shield = null;
    }
    if (parts.harvestBag) {
        leftWrist.remove(parts.harvestBag);
        disposeObject3D(parts.harvestBag);
        parts.harvestBag = null;
    }
    if (parts.bow) {
        leftWrist.remove(parts.bow);
        disposeObject3D(parts.bow);
        parts.bow = null;
    }
    if (p.leftPropType === 'shield') {
        const shield = createShield();
        leftWrist.add(shield);
        shield.position.set(0.20, -0.02, 0.02);
        shield.rotation.set(0, Math.PI / 2, 0);
        parts.shield = shield;
    } else if (p.leftPropType === 'harvestBag') {
        const bag = createHarvestBag();
        leftWrist.add(bag);
        // 持ち手が手首の位置に来るよう、少しだけ内側・手前に寄せる（袋本体はcreateHarvestBag()側で
        // 既に-Y方向＝下に垂れ下がる向きに作ってあるので、追加の回転は不要）
        bag.position.set(0.06, 0, 0.02);
        parts.harvestBag = bag;
    } else if (p.leftPropType === 'bow') {
        // 弓は握り位置＝手首の原点（盾・収穫袋と同じ規約）。向きは手首の回転にそのまま従う
        const bow = createBow(p.bowState);
        leftWrist.add(bow);
        parts.bow = bow;
    }
}

window.applyLeftHandProp = applyLeftHandProp;
window.applyCharacterProps = applyCharacterProps;

// 左手の小道具だけを今表示すべき内容で入れ替える（弓の状態切替用。右手・ポーズは触らない）
window._reapplyCurrentLeftProp = function () {
    const hasSlots = (typeof mySlots !== 'undefined') && (typeof activeSlotIndex !== 'undefined');
    const slot = (hasSlots && activeSlotIndex >= 0) ? mySlots[activeSlotIndex] : null;
    applyLeftHandProp(getEffectiveProps(slot));
};

// createCharacter()でwrist（手首）周りのメッシュが新しいオブジェクトに置き換わった
// 直後に呼ばれ、「今表示すべき小道具」を最新の状態から計算し直して装備し直す。
// ★表情システムの_reapplyCurrentExpressionと違い、前回表示していた値を
//   キャッシュして使い回すのではなく、必ず「今アクティブなポーズスロットの
//   小道具設定（ONなら上書き、OFFならキャラの現在のデフォルト）」を毎回
//   計算し直す。mySlots/activeSlotIndexはpose-slots.jsで定義されるため、
//   このファイルの読み込み時点ではまだ存在しないことがある（typeofで安全に判定）。
window._reapplyCurrentProps = function () {
    const hasSlots = (typeof mySlots !== 'undefined') && (typeof activeSlotIndex !== 'undefined');
    const slot = (hasSlots && activeSlotIndex >= 0) ? mySlots[activeSlotIndex] : null;
    applyCharacterProps(getEffectiveProps(slot));
};

