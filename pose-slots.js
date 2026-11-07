// ============================================================
// プリセット＝スロット管理（初期はPOSES件数ぶん。格納庫の＋／－は並べ替え、増減はポージングタブのコピー／消去ボタン）
// ============================================================
const SLOT_COUNT = POSES.length; // 初期プリセットの件数（ドラゴンバスター勇者用13ポーズ＋鍬2＋収穫用ナイフ/カバン3＋ジョウロ3＋釣り7＋弓3＋斧3＋鍬で土をほぐす1）

// ============================================================
// キャラクター識別（キャラごとにポーズ格納庫／動画シーケンスを分けて保存する）
// ------------------------------------------------------------
// 「📁ファイル」タブのセーブファイル名（拡張子抜き）を、そのままキャラの
// 識別キーとして使う。複数のキャラを行き来しても、それぞれの編集内容が
// 別々のブラウザ保存領域に残るので、キャラAを編集中にキャラBのファイルを
// 読み込んでも、キャラAの分が上書きされて消えることがない。
// ============================================================
const DEFAULT_CHARACTER_KEY = '3dmaker_save';
const LS_KEY_PREFIX = '3dmaker_myslots_v4'; // v3から：①ポーズごとのid管理 ②キャラ別保存 に対応するため更新

function sanitizeCharacterKey(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return DEFAULT_CHARACTER_KEY;
    // ファイル名として使えない記号は置換しておく
    return trimmed.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
}
let currentCharacterKey = DEFAULT_CHARACTER_KEY;
function slotsStorageKey(charKey) {
    return `${LS_KEY_PREFIX}::${charKey}`;
}

// ポーズごとの一意なID発行（追加ポーズの識別・動画シーケンスの参照ズレ防止に使う）
let _slotIdSeq = 0;
function genSlotId() {
    _slotIdSeq++;
    return 'custom:' + Date.now().toString(36) + _slotIdSeq + Math.random().toString(36).slice(2, 6);
}

// POSESをスナップショット形式に変換するヘルパー
function poseDefToSnapshot(pose) {
    if (!pose) return null;
    return {
        head: { rx: pose.head?.rx ?? 0, ry: pose.head?.ry ?? 0, rz: pose.head?.rz ?? 0 },
        arms: (pose.arms || []).map(a => ({
            root:  { rx: a.root?.rx ?? 0, ry: a.root?.ry ?? 0, rz: a.root?.rz ?? 0 },
            joint: { rx: a.joint?.rx ?? 0, rz: a.joint?.rz ?? 0 },
            wrist: { rx: a.wrist?.rx ?? 0, ry: a.wrist?.ry ?? 0, rz: a.wrist?.rz ?? 0 },
        })),
        legs: (pose.legs || []).map(l => ({
            root:  { rx: l.root?.rx ?? 0, rz: l.root?.rz ?? 0 },
            joint: { rx: l.joint?.rx ?? 0 },
        })),
        swordTiltX: pose.swordTiltX ?? 0,
    };
}
window.poseDefToSnapshot = poseDefToSnapshot;

// 初期スロットに、ポーズの用途に合った表情プリセットを最初から割り当てておく
// （表情プリセット表の「用途」列と完全一致するものだけ選定。曖昧なものは
//   OFF＝デフォルト表情のままにしておく）
const DEFAULT_SLOT_EXPRESSIONS = {
    '😊 待機':                     'normal',     // 待機・歩き
    '⚔️ 大剣構え':                 'serious',    // ボス戦・構え
    '⚔️ 大剣攻撃・振りかぶり':     'angry',      // 攻撃・必殺技
    '⚔️ 大剣攻撃・斬り下ろし':     'angry',      // 攻撃・必殺技
    '😵 ダメージ':                  'surprised',  // ダメージ・イベント
    '🏆 勝利':                      'smile',      // 会話・勝利
    '🎣 釣り7 釣り上げる【少し曲がる】': 'smile',  // 魚を釣り上げてにっこり（既存の「笑顔」プリセット）
    '🏹 弓・矢をつがえる構え':      'serious',    // ボス戦・構え
    '🏹 弓を引き絞る構え':          'serious',    // ボス戦・構え
    '💧 ジョウロを正面高く構える':  'smile',      // 農作業・見せポーズ
    '💧 ジョウロを右高く構える':    'smile',      // 農作業・見せポーズ
    '💧 ジョウロを左高く構える':    'smile',      // 農作業・見せポーズ
    '🪓 斧を振りかぶる':            'serious',    // 木こり・気合を入れる
    '🪓 斧を木に当てる':            'angry',      // 振り下ろした瞬間の力み
    '🪓 斧をこじって引き抜く':      'serious',    // 食い込んだ斧を引く踏ん張り
    '🌾 鍬を振り上げる':            'serious',    // 農作業・気合を入れる
    '🌾 鍬を振り下ろす':            'angry',      // 振り下ろす瞬間の力み
    '🌾 鍬で土をほぐす':            'serious',    // 土をこじる踏ん張り
    '🔪 ナイフを振り上げる':        'serious',    // 収穫・素材収集・気合を入れる
    '🔪 ナイフを振り下ろす':        'angry',      // 振り下ろす瞬間の力み
};

// 初期スロットに、ポーズの用途に合った小道具の上書きを最初から割り当てておく
// （鍬のポーズは、キャラの現在の右手装備（デフォルト）に関わらず「鍬を持っている」
//   状態で見せたいポーズなので、初期状態から上書きをONにしておく。それ以外の
//   ポーズは「キャラのデフォルト小道具のまま」＝OFFにしておく）
// ★収穫・素材収集用のナイフ／カバンの3ポーズは、キャラのデフォルト装備に
//   関わらず常に「右手に剣（＝ナイフ代用）・左手に収穫袋」の組み合わせで
//   見せたい一連の動作なので、3ポーズとも同じ上書きをONにしておく。
// ★ジョウロを構える3ポーズも同様に、キャラのデフォルト右手装備に関わらず
//   常に「右手にジョウロ・左手は何も持たない」状態で見せたいポーズなので、
//   3ポーズとも上書きをONにしておく。
const DEFAULT_SLOT_PROPS = {
    '🌾 鍬を振り上げる':     { swordType: 'hoe',   leftPropType: 'none' },
    '🌾 鍬を振り下ろす':     { swordType: 'hoe',   leftPropType: 'none' },
    '🌾 鍬で土をほぐす':     { swordType: 'hoe',   leftPropType: 'none' },
    '🔪 ナイフを振り上げる': { swordType: 'sword', leftPropType: 'harvestBag' },
    '🔪 ナイフを振り下ろす': { swordType: 'sword', leftPropType: 'harvestBag' },
    '🎒 カバンで受ける':     { swordType: 'sword', leftPropType: 'harvestBag' },
    '💧 ジョウロを正面高く構える': { swordType: 'wateringCan', leftPropType: 'none' },
    '💧 ジョウロを右高く構える':   { swordType: 'wateringCan', leftPropType: 'none' },
    '💧 ジョウロを左高く構える':   { swordType: 'wateringCan', leftPropType: 'none' },
    // 🪓 斧で木を切る3ポーズ：キャラのデフォルト装備に関わらず「右手に既存の斧・左手は何も持たない」
    '🪓 斧を振りかぶる':       { swordType: 'axe', leftPropType: 'none' },
    '🪓 斧を木に当てる':       { swordType: 'axe', leftPropType: 'none' },
    '🪓 斧をこじって引き抜く': { swordType: 'axe', leftPropType: 'none' },
};

// ★🎣 釣りポーズ7種には、あえて小道具の上書きを設定していない（propsEnabled=OFF）。
//   ポーズを選んでも、ユーザーがキャラタブ／ポーズ別設定で選んでいる小道具は変わらない。
//   釣り竿の曲がり状態も、ポーズごとの上書き(slot.props)には含めない既存設計のまま
//   （characterData.fishingRodBend を手動で選ぶ。推奨状態はポーズ名の【　】内に表示）。

// 🏹 弓ポーズが対応する弓の状態。これを持つスロットは slot.bowState を持ち、
//   「左手に弓を装備している時だけ」ポーズ適用で弓の状態が連動して切り替わる
//   （小道具の上書き=propsEnabledとは別の仕組みなので、弓を勝手に装備させることはない）。
const BOW_POSE_STATES = {
    '🏹 弓・矢をつがえる構え':   'nocked',
    '🏹 弓を引き絞る構え':       'drawn',
    '🏹 矢を放った直後の構え':   'released',
};

// デフォルトスロット（プリセット7種の初期値）
function defaultSlots() {
    return POSES.slice(0, SLOT_COUNT).map((pose, i) => {
        const exprKey = DEFAULT_SLOT_EXPRESSIONS[pose.label] || null;
        const preset  = exprKey ? EXPRESSION_PRESETS.find(p => p.key === exprKey) : null;
        const propsOverride = DEFAULT_SLOT_PROPS[pose.label] || null;
        return {
            id:            'default:' + pose.label, // 初期プリセットは名前から決まる固定ID（追加・削除で並びがずれても迷子にならない）
            name:          pose.label,          // 絵文字込みの元のラベル
            poseSnapshot:  poseDefToSnapshot(pose),
            isDefault:     true,                // リセット用フラグ
            defaultIndex:  i,                   // POSES[i]のindex
            // ★表情システム：スロットごとに完全に独立したオブジェクトを持たせる
            //   （cloneExpressionで必ずディープコピーし、同じ参照を共有しない）
            expressionEnabled: !!preset,
            expressionKey:     exprKey || 'normal',
            expression:        cloneExpression(preset || DEFAULT_EXPRESSION),
            // ★小道具システム：スロットごとに完全に独立したオブジェクトを持たせる
            //   （cloneProps で必ずディープコピーし、同じ参照を共有しない）
            propsEnabled: !!propsOverride,
            props:        cloneProps(propsOverride || characterData),
            // 弓ポーズだけ、対応する弓の状態を持つ（他のポーズにはこのフィールド自体を持たせない）
            ...(BOW_POSE_STATES[pose.label] ? { bowState: BOW_POSE_STATES[pose.label] } : {}),
        };
    });
}

// 保存データにid（旧形式）が無い場合に補う。isDefaultなら名前から決まる固定IDに、
// そうでなければ新規のカスタムIDにする。
function normalizeSlotId(slot) {
    if (!slot) return slot;
    if (!slot.id) slot.id = slot.isDefault ? ('default:' + slot.name) : genSlotId();
    return slot;
}

// 保存データにexpression関連フィールドが無い（旧形式）場合に安全な初期値を補い、
// 併せてexpressionを必ずディープコピーして独立させる。
function normalizeSlotExpression(slot) {
    if (!slot) return slot;
    if (typeof slot.expressionEnabled !== 'boolean') slot.expressionEnabled = false;
    if (!slot.expressionKey) slot.expressionKey = 'normal';
    slot.expression = cloneExpression(slot.expression || DEFAULT_EXPRESSION);
    return slot;
}

// 保存データにprops関連フィールドが無い（旧形式）場合に安全な初期値を補い、
// 併せてpropsを必ずディープコピーして独立させる。
function normalizeSlotProps(slot) {
    if (!slot) return slot;
    if (typeof slot.propsEnabled !== 'boolean') slot.propsEnabled = false;
    slot.props = cloneProps(slot.props || characterData);
    return slot;
}

// 保存データのbowStateが不正な場合は取り除く（弓ポーズ以外・旧データはフィールド自体が無いのが正常）
function normalizeSlotBowState(slot) {
    if (!slot) return slot;
    if (slot.bowState !== undefined && BOW_STATES.indexOf(slot.bowState) < 0) delete slot.bowState;
    return slot;
}

// 保存データが空・不正な場合の後方互換フォールバック（大昔のセーブファイル用）。
// ＋／－でスロット数が自由に増減するようになったので、基本は保存内容をそのまま
// 尊重する（＝ユーザーが削除したポーズを勝手に復活させたりしない）。
function reconcileSlots(savedArr) {
    if (!Array.isArray(savedArr) || savedArr.length === 0) return defaultSlots();
    return savedArr;
}

// スロット配列に、id・表情・小道具それぞれの正規化をまとめて適用する
function normalizeSlots(arr) {
    return arr.map(normalizeSlotId).map(normalizeSlotExpression).map(normalizeSlotProps).map(normalizeSlotBowState);
}

// ============================================================
// 🎣 釣りポーズ7種を、釣り竿追加より前に保存されたデータへ「末尾に」補う
// ------------------------------------------------------------
// 保存済みのポーズ格納庫（ブラウザ保存／セーブファイル）は配列をそのまま読み込む仕様なので、
// POSESに新ポーズを足しただけでは、既存キャラの格納庫には増えない。
// そこで、読み込み時に「まだ釣りポーズ対応の印が無いデータ」だけ、末尾に7種を追加する。
//   ・末尾に足すだけなので、既存ポーズの番号・動画シーケンスの参照先(index)はずれない。
//   ・追加は1キャラにつき1回だけ（印を残す）。その後ユーザーが釣りポーズを削除しても復活しない。
//   ・印は、ブラウザ保存では専用キー（既存キーとは別）、セーブファイルでは fishingPosesAdded:true。
//   ・同じIDのポーズが既にあれば重複して追加しない。
// ============================================================
const FISHING_MIGRATION_KEY_PREFIX = '3dmaker_fishing7_v1';
function fishingMigrationKey(charKey) { return `${FISHING_MIGRATION_KEY_PREFIX}::${charKey}`; }
function isFishingPoseLabel(label) { return typeof label === 'string' && label.startsWith('🎣 釣り'); }
function isFishingSlotsHandled(charKey) {
    try { return localStorage.getItem(fishingMigrationKey(charKey)) === '1'; } catch(e) { return false; }
}
function markFishingSlotsHandled(charKey) {
    try { localStorage.setItem(fishingMigrationKey(charKey), '1'); } catch(e) {}
}
function appendMissingFishingSlots(arr) {
    const have = new Set(arr.map(sl => sl && sl.id));
    const add = defaultSlots().filter(d => isFishingPoseLabel(d.name) && !have.has(d.id));
    return add.length ? arr.concat(add) : arr;
}

// ============================================================
// 🏹 弓ポーズ3種を、弓追加より前に保存されたデータへ「末尾に」補う
// ------------------------------------------------------------
// 釣りポーズの補完と全く同じ考え方（末尾に足すだけで既存ポーズの番号はずれない／
// 追加は1キャラにつき1回だけ／同じIDがあれば重複追加しない）。
// 印は、ブラウザ保存では専用キー、セーブファイルでは bowPosesAdded:true。
// ============================================================
const BOW_MIGRATION_KEY_PREFIX = '3dmaker_bow3_v1';
function bowMigrationKey(charKey) { return `${BOW_MIGRATION_KEY_PREFIX}::${charKey}`; }
function isBowPoseLabel(label) { return typeof label === 'string' && label.startsWith('🏹 '); }
function isBowSlotsHandled(charKey) {
    try { return localStorage.getItem(bowMigrationKey(charKey)) === '1'; } catch(e) { return false; }
}
function markBowSlotsHandled(charKey) {
    try { localStorage.setItem(bowMigrationKey(charKey), '1'); } catch(e) {}
}
function appendMissingBowSlots(arr) {
    const have = new Set(arr.map(sl => sl && sl.id));
    const add = defaultSlots().filter(d => isBowPoseLabel(d.name) && !have.has(d.id));
    return add.length ? arr.concat(add) : arr;
}

// ============================================================
// 🪓 斧ポーズ3種を、斧ポーズ追加より前に保存されたデータへ「末尾に」補う
// ------------------------------------------------------------
// 釣り・弓の補完と全く同じ考え方（末尾に足すだけで既存ポーズの番号・動画シーケンスの参照先は
// ずれない／追加は1キャラにつき1回だけ／同じIDがあれば重複追加しない）。
// 「新ポーズ未追加」と「追加後にユーザーが削除」を区別する印：
//   ・ブラウザ保存：キャラ別の専用キー（既存キーとは別）。saveSlots()が書き込むたびに印が付く。
//   ・セーブファイル：axePosesAdded:true（buildSaveData）。
// 印が無い＝斧ポーズ対応前に保存されたデータだけが対象なので、追加後に削除した分は復活しない。
// 補うのは斧の3ポーズ(default:🪓…)だけで、既存スロットの順番・ID・中身には触れない。
// ============================================================
const AXE_MIGRATION_KEY_PREFIX = '3dmaker_axe3_v1';
function axeMigrationKey(charKey) { return `${AXE_MIGRATION_KEY_PREFIX}::${charKey}`; }
function isAxePoseLabel(label) { return typeof label === 'string' && label.startsWith('🪓 '); }
function isAxeSlotsHandled(charKey) {
    try { return localStorage.getItem(axeMigrationKey(charKey)) === '1'; } catch(e) { return false; }
}
function markAxeSlotsHandled(charKey) {
    try { localStorage.setItem(axeMigrationKey(charKey), '1'); } catch(e) {}
}
function appendMissingAxeSlots(arr) {
    const have = new Set(arr.map(sl => sl && sl.id));
    const add = defaultSlots().filter(d => isAxePoseLabel(d.name) && !have.has(d.id));
    return add.length ? arr.concat(add) : arr;
}

// ============================================================
// 🌾 鍬で土をほぐす（1ポーズ）を、追加より前に保存されたデータへ「末尾に」補う
// ------------------------------------------------------------
// 釣り・弓・斧の補完と全く同じ考え方（末尾に足すだけで既存ポーズの番号・動画シーケンスの参照先は
// ずれない／追加は1キャラにつき1回だけ／同じIDがあれば重複追加しない）。
//   ・ブラウザ保存：キャラ別の専用キー（既存キーとは別）。saveSlots()が書き込むたびに印が付く。
//   ・セーブファイル：hoeTillPoseAdded:true（buildSaveData）。この印が無い旧ファイルもそのまま読み込める。
// 補うのは「🌾 鍬で土をほぐす」だけで、既存スロットの順番・ID・中身（既存の鍬2ポーズを含む）には触れない。
// ============================================================
const HOETILL_MIGRATION_KEY_PREFIX = '3dmaker_hoetill1_v1';
function hoeTillMigrationKey(charKey) { return `${HOETILL_MIGRATION_KEY_PREFIX}::${charKey}`; }
function isHoeTillPoseLabel(label) { return label === '🌾 鍬で土をほぐす'; }
function isHoeTillSlotsHandled(charKey) {
    try { return localStorage.getItem(hoeTillMigrationKey(charKey)) === '1'; } catch(e) { return false; }
}
function markHoeTillSlotsHandled(charKey) {
    try { localStorage.setItem(hoeTillMigrationKey(charKey), '1'); } catch(e) {}
}
function appendMissingHoeTillSlots(arr) {
    const have = new Set(arr.map(sl => sl && sl.id));
    const add = defaultSlots().filter(d => isHoeTillPoseLabel(d.name) && !have.has(d.id));
    return add.length ? arr.concat(add) : arr;
}

// ============================================================
// 🌾💧 鍬2種（振り上げる／振り下ろす）＋ジョウロ3種を、保存済みデータへ「末尾に」補う
// ------------------------------------------------------------
// 【なぜ必要か】この5ポーズはPOSESの途中（13・14・18〜20番目）に定義されているが、
// 釣り・弓・斧・鍬で土をほぐす と違って、保存済みデータへ補う専用の移行処理が無かった。
// 保存データ（ブラウザ保存／セーブファイル）は配列をそのまま読み込む仕様なので、
// これら5ポーズの追加より前に保存されたデータには、POSESに定義が残っていても永久に戻らなかった。
// 【既存の移行印を流用しない理由】fishing/bow/axe/hoetill の印は saveSlots() が保存のたびに
// 一括で付けるため、既存ユーザーは全て「対応済み」になっている。それを流用すると
// 「5ポーズが無い旧データ」と「ユーザーが削除した」を区別できないので、専用の新しい印を使う。
//   ・ブラウザ保存：キャラ別の専用キー 3dmaker_farmtools5_v1::<キャラ>。
//   ・セーブファイル：farmToolPosesAdded:true（buildSaveData）。この印が無い旧ファイルもそのまま読み込める。
//   ・末尾に足すだけなので、既存ポーズの順番・ID・中身・動画シーケンスの参照先(index)は一切ずれない。
//   ・同じID、または同じ名前のスロットが既にあれば追加しない（二重登録しない。既存スロットは削除も統合もしない）。
//   ・追加後にユーザーが削除したポーズは、印が付いているので復活しない。
//   ・補完に失敗した場合は印を付けない（_farmToolFailedKeys）。次回の読み込みでやり直す。
// ============================================================
const FARMTOOL_MIGRATION_KEY_PREFIX = '3dmaker_farmtools5_v1';
function farmToolMigrationKey(charKey) { return `${FARMTOOL_MIGRATION_KEY_PREFIX}::${charKey}`; }
const FARMTOOL_POSE_LABELS = [
    '🌾 鍬を振り上げる',
    '🌾 鍬を振り下ろす',
    '💧 ジョウロを正面高く構える',
    '💧 ジョウロを右高く構える',
    '💧 ジョウロを左高く構える',
];
function isFarmToolPoseLabel(label) { return FARMTOOL_POSE_LABELS.indexOf(label) >= 0; }
function isFarmToolSlotsHandled(charKey) {
    try { return localStorage.getItem(farmToolMigrationKey(charKey)) === '1'; } catch(e) { return false; }
}
function markFarmToolSlotsHandled(charKey) {
    try { localStorage.setItem(farmToolMigrationKey(charKey), '1'); } catch(e) {}
}
const _farmToolFailedKeys = new Set(); // 補完に失敗したキャラ（このセッション中は印を付けない）
function appendMissingFarmToolSlots(arr) {
    const haveIds   = new Set(arr.map(sl => sl && sl.id));
    const haveNames = new Set(arr.map(sl => sl && sl.name));
    const add = defaultSlots().filter(d => isFarmToolPoseLabel(d.name) && !haveIds.has(d.id) && !haveNames.has(d.name));
    return add.length ? arr.concat(add) : arr;
}
// 例外が起きても既存スロットは1件も失わず（元の配列を返す）、印も付けない。
function appendMissingFarmToolSlotsSafe(arr, charKey) {
    try {
        const out = appendMissingFarmToolSlots(arr);
        _farmToolFailedKeys.delete(charKey);
        if (out.length !== arr.length) {
            const added = out.slice(arr.length).map(sl => sl.name);
            console.info('[pose-migrate:farmtools]', charKey, '補完:', added.length + '件', added);
            showSlotStatus(`🌾💧 鍬・ジョウロのポーズ${added.length}件を格納庫の末尾に補いました`);
        }
        return out;
    } catch(e) {
        _farmToolFailedKeys.add(charKey);
        console.warn('[pose-migrate:farmtools] 補完に失敗（既存データは変更しません）', charKey, e);
        return arr;
    }
}

// ============================================================
// 🔪🎒 収穫ポーズ3種（ナイフを振り上げる／振り下ろす／カバンで受ける）を、保存済みデータへ「末尾に」補う
// ------------------------------------------------------------
// 鍬・ジョウロの補完（farmtools5）と全く同じ考え方。この3ポーズも補完処理が無く、
// 追加前に保存されたデータには戻らなかった。専用の新しい印 3dmaker_harvest3_v1::<キャラ> を使い、
// 末尾に足すだけ／同じIDまたは同名があれば追加しない／追加後に削除した分は復活しない／失敗時は印を付けない。
// セーブファイルの印は harvestPosesAdded:true。
// ============================================================
const HARVEST_MIGRATION_KEY_PREFIX = '3dmaker_harvest3_v1';
function harvestMigrationKey(charKey) { return `${HARVEST_MIGRATION_KEY_PREFIX}::${charKey}`; }
const HARVEST_POSE_LABELS = ['🔪 ナイフを振り上げる', '🔪 ナイフを振り下ろす', '🎒 カバンで受ける'];
function isHarvestPoseLabel(label) { return HARVEST_POSE_LABELS.indexOf(label) >= 0; }
function isHarvestSlotsHandled(charKey) {
    try { return localStorage.getItem(harvestMigrationKey(charKey)) === '1'; } catch(e) { return false; }
}
function markHarvestSlotsHandled(charKey) {
    try { localStorage.setItem(harvestMigrationKey(charKey), '1'); } catch(e) {}
}
const _harvestFailedKeys = new Set();
function appendMissingHarvestSlots(arr) {
    const haveIds   = new Set(arr.map(sl => sl && sl.id));
    const haveNames = new Set(arr.map(sl => sl && sl.name));
    const add = defaultSlots().filter(d => isHarvestPoseLabel(d.name) && !haveIds.has(d.id) && !haveNames.has(d.name));
    return add.length ? arr.concat(add) : arr;
}
function appendMissingHarvestSlotsSafe(arr, charKey) {
    try {
        const out = appendMissingHarvestSlots(arr);
        _harvestFailedKeys.delete(charKey);
        if (out.length !== arr.length) {
            const added = out.slice(arr.length).map(sl => sl.name);
            console.info('[pose-migrate:harvest]', charKey, '補完:', added.length + '件', added);
            showSlotStatus(`🔪🎒 収穫のポーズ${added.length}件を格納庫の末尾に補いました`);
        }
        return out;
    } catch(e) {
        _harvestFailedKeys.add(charKey);
        console.warn('[pose-migrate:harvest] 補完に失敗（既存データは変更しません）', charKey, e);
        return arr;
    }
}

// ============================================================
// 📌 「デフォルトにする」：新規キャラクター用のポーズ保管庫テンプレート
// ------------------------------------------------------------
// ・defaultSlots()＝従来の工場出荷時プリセット。個別ポーズの「初期ポーズに戻す」や各種移行処理の基準なので、
//   このテンプレートとは完全に分離して一切変更しない。
// ・テンプレートは専用キーに保存する（キャラ別キー 3dmaker_myslots_v4::〜 とは別。接頭辞も重ならない）。
// ・使うのは「そのキャラの保存領域が空」の新規キャラの初期化時だけ（loadSlotsForCharacter内）。
//   保存済みキャラ・セーブファイル読込・個別リセットには使わない。
// ============================================================
const DEFAULT_TEMPLATE_LS_KEY = '3dmaker_pose_vault_default_template_v1';

// テンプレートとして使えるスロットか（applyPoseSnapshotが触る最低限の構造を確認）
function isValidTemplateSlot(s) {
    return !!s && typeof s === 'object' && typeof s.name === 'string'
        && !!s.poseSnapshot && typeof s.poseSnapshot === 'object'
        && !!s.poseSnapshot.head && Array.isArray(s.poseSnapshot.arms) && Array.isArray(s.poseSnapshot.legs);
}

// 保存済みテンプレートを読み、新規キャラ用のスロット配列（毎回新しく生成した独立コピー）を返す。
// 未保存・破損・構造不正・読込不能なら null（呼び出し側が従来の初期プリセットにフォールバックする）。
function loadDefaultTemplateSlots() {
    try {
        const raw = localStorage.getItem(DEFAULT_TEMPLATE_LS_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw); // 毎回新しくパースするので、他のオブジェクトと参照を共有しない
        const arr = (data && Array.isArray(data.slots)) ? data.slots : null;
        if (!arr || arr.length === 0 || !arr.every(isValidTemplateSlot)) return null;
        const slots = normalizeSlots(arr);
        // id：初期プリセット由来の固定ID('default:〜')は「初期ポーズに戻す」の対応付けに使うので維持し、
        //     追加ポーズのID('custom:〜')は新規キャラ用に振り直す。重複したIDも振り直す。
        const seen = new Set();
        slots.forEach(sl => {
            const isFactoryId = typeof sl.id === 'string' && sl.id.startsWith('default:');
            if (!isFactoryId || seen.has(sl.id)) sl.id = genSlotId();
            seen.add(sl.id);
        });
        return slots;
    } catch(e) {
        return null;
    }
}

// 指定したキャラ（キー）専用の保存領域からポーズ格納庫を読み込む。
// 何も保存されていない（＝そのキャラは初めて）場合は初期プリセットを返す。
function loadSlotsForCharacter(charKey) {
    let isBrandNewCharacter = false; // 保存領域が「まったく空(null)」と確認できた時だけtrue（破損・読取エラー時はfalseのまま）
    try {
        const raw = localStorage.getItem(slotsStorageKey(charKey));
        if (raw === null) isBrandNewCharacter = true;
        if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length > 0) {
                let slots = normalizeSlots(arr);
                // 釣りポーズ追加前に保存されたデータ：初回だけ末尾に7種を補い、保存し直す（印も付く）
                const needFishing = !isFishingSlotsHandled(charKey);
                const needBow = !isBowSlotsHandled(charKey);
                const needAxe = !isAxeSlotsHandled(charKey);
                const needHoeTill = !isHoeTillSlotsHandled(charKey);
                const needFarmTool = !isFarmToolSlotsHandled(charKey);
                const needHarvest = !isHarvestSlotsHandled(charKey);
                if (needFishing) slots = appendMissingFishingSlots(slots);
                // 弓ポーズ追加前に保存されたデータ：初回だけ末尾に3種を補い、保存し直す（印も付く）
                if (needBow) slots = appendMissingBowSlots(slots);
                // 斧ポーズ追加前に保存されたデータ：初回だけ末尾に3種を補い、保存し直す（印も付く）
                if (needAxe) slots = appendMissingAxeSlots(slots);
                // 鍬で土をほぐすポーズ追加前に保存されたデータ：初回だけ末尾に1種を補い、保存し直す（印も付く）
                if (needHoeTill) slots = appendMissingHoeTillSlots(slots);
                // 鍬2種＋ジョウロ3種の追加前に保存されたデータ：専用の印が無い間だけ、末尾に不足分を補う
                if (needFarmTool) slots = appendMissingFarmToolSlotsSafe(slots, charKey);
                // 収穫ポーズ3種の追加前に保存されたデータ：専用の印が無い間だけ、末尾に不足分を補う
                if (needHarvest) slots = appendMissingHarvestSlotsSafe(slots, charKey);
                if (needFishing || needBow || needAxe || needHoeTill || needFarmTool || needHarvest) saveSlots(slots, charKey);
                return slots;
            }
        }
    } catch(e) {}
    // 初めてのキャラ：「デフォルトにする」で保存したテンプレートがあれば、それを初期内容にする。
    // 未保存・破損・読込不能なら null が返るので、従来の初期プリセット(defaultSlots)に安全に戻る。
    if (isBrandNewCharacter) {
        const tpl = loadDefaultTemplateSlots();
        if (tpl) return tpl;
    }
    return defaultSlots();
}

// 指定した（省略時は現在の）キャラ専用の保存領域へポーズ格納庫を書き込む
function saveSlots(slots, charKey) {
    const key = charKey || currentCharacterKey;
    try { localStorage.setItem(slotsStorageKey(key), JSON.stringify(slots)); } catch(e) { return false; }
    markFishingSlotsHandled(key); // 保存される配列は釣りポーズ対応済み（削除した分は復活させない）
    markBowSlotsHandled(key);     // 同様に弓ポーズ対応済み
    markAxeSlotsHandled(key);     // 同様に斧ポーズ対応済み
    markHoeTillSlotsHandled(key); // 同様に鍬で土をほぐすポーズ対応済み
    // 同様に鍬2種＋ジョウロ3種も対応済み。ただし補完に失敗したキャラには印を付けない（失敗したのに「済み」にしない）
    if (!_farmToolFailedKeys.has(key)) markFarmToolSlotsHandled(key);
    if (!_harvestFailedKeys.has(key)) markHarvestSlotsHandled(key); // 収穫ポーズも同様（失敗時は付けない）
    return true;
}

let mySlots = loadSlotsForCharacter(currentCharacterKey);

// ── キャラの切り替え（ファイル名入力欄の変更・別ファイルの読込で呼ばれる） ──
// 今のキャラの編集内容を確定保存してから、新しいキャラ専用の保存領域に切り替える。
// 3D画面のポーズはあえてここでは変えない（名前を打ち替えただけで見た目が急に
// 変わると分かりづらいため）。切り替え後、格納庫のボタン一覧だけ更新する。
function switchCharacterByName(rawName, opts) {
    opts = opts || {};
    const newKey = sanitizeCharacterKey(rawName);
    if (newKey === currentCharacterKey && !opts.force) return false;

    saveSlots(mySlots, currentCharacterKey);
    if (window.saveVideoSequencesForCurrentCharacter) window.saveVideoSequencesForCurrentCharacter(currentCharacterKey);

    currentCharacterKey = newKey;
    mySlots = loadSlotsForCharacter(currentCharacterKey);
    activeSlotIndex = -1; // 切替直後はどのプリセットにも自動保存しない
    buildSlotButtons();
    if (window.syncAllExpressionEditors) syncAllExpressionEditors();
    if (window.syncAllPropsEditors) syncAllPropsEditors();
    if (window.loadVideoSequencesForCurrentCharacter) window.loadVideoSequencesForCurrentCharacter(currentCharacterKey);
    showSlotStatus(`🔀「${currentCharacterKey}」のポーズ格納庫に切り替えました`);
    return true;
}
window.switchCharacterByName = switchCharacterByName;
window.sanitizeCharacterKey = sanitizeCharacterKey;
window.getCurrentCharacterKey = () => currentCharacterKey;

// セーブファイルを読み込んだ直後に呼ばれる：ファイル内に保存されていた
// ポーズ格納庫／動画シーケンスを、そのキャラ専用の保存領域として確定保存する。
// fishingAlreadyHandled … セーブファイルの fishingPosesAdded（釣りポーズ追加後に保存したファイルなら true）
// bowAlreadyHandled     … セーブファイルの bowPosesAdded（弓ポーズ追加後に保存したファイルなら true）
// axeAlreadyHandled     … セーブファイルの axePosesAdded（斧ポーズ追加後に保存したファイルなら true）
// hoeTillAlreadyHandled … セーブファイルの hoeTillPoseAdded（鍬で土をほぐすポーズ追加後に保存したファイルなら true）
// farmToolAlreadyHandled … セーブファイルの farmToolPosesAdded（鍬2種＋ジョウロ3種の補完対応後に保存したファイルなら true）
function adoptCharacterFromLoadedFile(rawKeyName, loadedSlotsArr, loadedVideoSeqArr, fishingAlreadyHandled, bowAlreadyHandled, axeAlreadyHandled, hoeTillAlreadyHandled, farmToolAlreadyHandled, harvestAlreadyHandled) {
    // 今のキャラの分を失わないよう、切り替え前に確定保存しておく
    saveSlots(mySlots, currentCharacterKey);
    if (window.saveVideoSequencesForCurrentCharacter) window.saveVideoSequencesForCurrentCharacter(currentCharacterKey);

    currentCharacterKey = sanitizeCharacterKey(rawKeyName);
    if (Array.isArray(loadedSlotsArr) && loadedSlotsArr.length > 0) {
        mySlots = normalizeSlots(loadedSlotsArr);
        // 釣りポーズ追加前に作られたセーブファイル（印が無い）なら、末尾に釣りポーズ7種を補う
        if (!fishingAlreadyHandled) mySlots = appendMissingFishingSlots(mySlots);
        // 弓ポーズ追加前に作られたセーブファイル（印が無い）なら、末尾に弓ポーズ3種を補う
        if (!bowAlreadyHandled) mySlots = appendMissingBowSlots(mySlots);
        // 斧ポーズ追加前に作られたセーブファイル（印が無い）なら、末尾に斧ポーズ3種を補う
        if (!axeAlreadyHandled) mySlots = appendMissingAxeSlots(mySlots);
        // 鍬で土をほぐすポーズ追加前に作られたセーブファイル（印が無い）なら、末尾に1種を補う
        if (!hoeTillAlreadyHandled) mySlots = appendMissingHoeTillSlots(mySlots);
        // 鍬2種＋ジョウロ3種の補完対応前に作られたセーブファイル（印が無い）なら、末尾に不足分を補う
        if (!farmToolAlreadyHandled) mySlots = appendMissingFarmToolSlotsSafe(mySlots, currentCharacterKey);
        // 収穫ポーズ3種の補完対応前に作られたセーブファイル（印が無い）なら、末尾に不足分を補う
        if (!harvestAlreadyHandled) mySlots = appendMissingHarvestSlotsSafe(mySlots, currentCharacterKey);
    } else {
        mySlots = defaultSlots();
    }
    saveSlots(mySlots, currentCharacterKey);
    buildSlotButtons();
    if (window.syncAllExpressionEditors) syncAllExpressionEditors();
    if (window.syncAllPropsEditors) syncAllPropsEditors();

    if (window.adoptVideoSequencesForCurrentCharacter) {
        window.adoptVideoSequencesForCurrentCharacter(currentCharacterKey, loadedVideoSeqArr);
    }
}
window.adoptCharacterFromLoadedFile = adoptCharacterFromLoadedFile;

// 現在「選択中」のプリセット番号（-1 = どのプリセットにも紐付かない状態＝アイドル/コマンド再生中など）
// このスロットに対してポーズを編集すると自動的に上書き保存される
let activeSlotIndex = 0;

let _autoSaveTimer = null;
let _autoSavePending = false; // 自動保存待ちの編集があるか（コピー時に最新の姿勢を取りこぼさないため）
function autoSaveActiveSlot() {
    clearTimeout(_autoSaveTimer);
    _autoSavePending = true;
    _autoSaveTimer = setTimeout(() => {
        _autoSavePending = false;
        if (activeSlotIndex < 0 || !mySlots[activeSlotIndex]) return;
        const snap = captureFullPoseSnapshot();
        if (!snap) return;
        mySlots[activeSlotIndex].poseSnapshot = snap;
        mySlots[activeSlotIndex].isDefault    = false;
        saveSlots(mySlots);
        showSlotStatus(`✅ プリセット${activeSlotIndex + 1}「${mySlots[activeSlotIndex].name}」に自動保存しました`);
    }, 400);
}

// 現在の3Dポーズ状態をスナップショット
function captureFullPoseSnapshot() {
    return snapshotCurrentRotations();
}

// スナップショットをシーン上の骨格に適用
function applyPoseSnapshot(snapshot) {
    if (!snapshot) return;
    const p = animatedParts;
    if (!p.arms || !p.arms.length) return;

    // Quaternionを用いてボーンへ回転を適用する（Euler角の個別代入はしない）
    function setR(obj, rx=0, ry=0, rz=0) {
        setBoneAnglesAsQuaternion(obj, rx, ry, rz);
    }

    if (p.head) setR(p.head, snapshot.head.rx, snapshot.head.ry, snapshot.head.rz);

    p.arms.forEach((arm, i) => {
        const a = snapshot.arms[i];
        if (!a) return;
        setR(arm.root,  a.root.rx,  a.root.ry,  a.root.rz);
        setR(arm.joint, a.joint.rx, 0,           a.joint.rz);
        setR(arm.wrist, a.wrist?.rx ?? 0, a.wrist?.ry ?? 0, a.wrist?.rz ?? 0);
    });
    p.legs.forEach((leg, i) => {
        const l = snapshot.legs[i];
        if (!l) return;
        setR(leg.root,  l.root.rx, 0, l.root.rz);
        setR(leg.joint, l.joint.rx, 0, 0);
    });
    if (p.sword && snapshot.swordTiltX !== undefined) {
        p.sword.rotation.x = ACTIVE_PROP_BASE_ROTATION.x + snapshot.swordTiltX;
    }

    // ポーズ補間を完了済みに（_poseEditApplyAfterPoseが余計に呼ばれないよう先にnullにする）
    poseTarget = null; poseFrom = null; poseT = 1.0;
    idleEnabled = false;
    syncIdleSelect(false);

    // ポーズ編集パネルのdegテーブルをスナップショット値に同期
    // （同期しないと_poseEditApplyAfterPoseが全0で上書きしてしまう）
    if (window._poseEditSyncDeg) window._poseEditSyncDeg(snapshot);
}

// ── スロットUI構築 ──────────────────────────────────────────
let slotEditTarget = -1;

// スロットiを「選択中」にして、そのポーズ・小道具・表情を3D画面に反映する
// （プリセットボタンのクリック、および＋で追加した直後の自動選択の両方から使う）
function activateSlot(i) {
    const slot = mySlots[i];
    if (!slot) return;
    document.querySelectorAll('.slot-apply-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.slot-apply-btn[data-slot-idx="${i}"]`);
    if (btn) btn.classList.add('active');
    // ★順序が重要：小道具の入れ替え（applyCharacterProps）を先に行ってから
    //   ポーズのスナップショット（applyPoseSnapshot）を適用する。
    //   こうすることで、新しく装備した小道具にもそのポーズのswordTiltX
    //   （傾き）が正しく反映される。
    syncBowStateFromSlot(slot); // 弓ポーズなら、弓を装備している時だけ弓の状態を連動させる
    applyCharacterProps(getEffectiveProps(slot)); // このポーズ専用の小道具（OFFならキャラのデフォルト）を反映
    applyPoseSnapshot(slot.poseSnapshot);
    applyFaceExpression(getEffectiveExpression(slot)); // このポーズ専用の表情（OFFならデフォルト表情）を反映
    activeSlotIndex = i; // このプリセットを編集したら自動保存される
    seqFrames = null;
    seqOnComplete = null;
    setSequencePlayingUI(false); // プリセットを選んだら動画編集シーケンスの再生は打ち切り扱いにする
    // シーケンスボタンのactiveも外す
    document.querySelectorAll('.seq-btn').forEach(b => b.classList.remove('active'));
    // 「🎮 ポージング」タブ側の表情・小道具エディタも、選んだポーズに合わせて同期する
    syncAllExpressionEditors();
    syncAllPropsEditors();
}

// 名前の重複を避ける（「〇〇 コピー」「〇〇 コピー2」…）
function uniqueSlotName(base) {
    const existing = new Set(mySlots.map(s => s.name));
    if (!existing.has(base)) return base;
    let n = 2;
    while (existing.has(`${base}${n}`)) n++;
    return `${base}${n}`;
}

// 「＋」：idx番目のポーズを複製して、その次に追加する
function insertSlotAfter(idx) {
    const base = mySlots[idx];
    if (!base) return;
    const copy = {
        id:                genSlotId(),
        name:              uniqueSlotName(base.name + ' コピー'),
        poseSnapshot:      JSON.parse(JSON.stringify(base.poseSnapshot)),
        isDefault:         false,
        expressionEnabled: base.expressionEnabled,
        expressionKey:     base.expressionKey,
        expression:        cloneExpression(base.expression),
        propsEnabled:      base.propsEnabled,
        props:             cloneProps(base.props),
        ...(base.bowState ? { bowState: base.bowState } : {}),
    };
    const insertAt = idx + 1;
    mySlots.splice(insertAt, 0, copy);
    // 動画シーケンス側の参照インデックスがずれないよう調整
    if (window.remapPoseIndicesOnInsert) window.remapPoseIndicesOnInsert(insertAt);
    saveSlots(mySlots);
    buildSlotButtons();
    activateSlot(insertAt);
    showSlotStatus(`➕「${copy.name}」を追加しました`);
    openSlotEditPopup(insertAt); // そのまま名前を付けられるよう編集ポップアップを開く
}

// 「－」：idx番目のポーズを削除する
function removeSlotAt(idx) {
    const removed = mySlots[idx];
    if (!removed) return;
    if (mySlots.length <= 1) {
        showSlotStatus('⚠️ 最後の1件は削除できません');
        return;
    }
    if (!confirm(`「${removed.name}」を削除しますか？`)) return;

    mySlots.splice(idx, 1);
    if (activeSlotIndex === idx) activeSlotIndex = -1;
    else if (activeSlotIndex > idx) activeSlotIndex -= 1;
    // 動画シーケンス側の参照インデックスがずれないよう調整
    const affectedSequences = window.remapPoseIndicesOnDelete ? window.remapPoseIndicesOnDelete(idx) : false;
    saveSlots(mySlots);
    buildSlotButtons();
    showSlotStatus(affectedSequences
        ? `🗑️「${removed.name}」を削除しました（このポーズを含む保存済みシーケンスも自動調整しました）`
        : `🗑️「${removed.name}」を削除しました`);
}

// 「＋」：idx番目のポーズを1つ上（一覧の前）のポーズと入れ替える。一番上なら何もしない
// 「－」：idx番目のポーズを1つ下（一覧の後ろ）のポーズと入れ替える。一番下なら何もしない
// 並び順だけを変える（中身・id・名前は変えない）。選択中の印・動画シーケンスの参照は一緒に追従させる。
function moveSlot(idx, dir) {
    const other = idx + dir;
    if (!mySlots[idx] || other < 0 || other >= mySlots.length) return;
    const t = mySlots[idx]; mySlots[idx] = mySlots[other]; mySlots[other] = t;
    if (activeSlotIndex === idx) activeSlotIndex = other;
    else if (activeSlotIndex === other) activeSlotIndex = idx;
    if (window.remapPoseIndicesOnSwap) window.remapPoseIndicesOnSwap(idx, other);
    saveSlots(mySlots);
    buildSlotButtons();
    // buildSlotButtonsは先頭を選択表示にするので、実際の選択中ポーズの表示に戻す（ポーズの再適用はしない）
    document.querySelectorAll('.slot-apply-btn').forEach(b => b.classList.remove('active'));
    const act = document.querySelector(`.slot-apply-btn[data-slot-idx="${activeSlotIndex}"]`);
    if (act) act.classList.add('active');
    showSlotStatus(`↕️「${mySlots[other].name}」を${dir < 0 ? '上' : '下'}へ移動しました`);
}

// 🎮 ポージングタブの「このポーズをコピー」／「このポーズを消去」は、既存の＋（複製）／－（削除）処理を
// そのまま呼ぶ。対象は「ポーズ格納庫で選択中のポーズ」（activeSlotIndex）。
function copyCurrentPose() {
    const i = activeSlotIndex;
    if (i < 0 || !mySlots[i]) {
        alert('先にポーズ格納庫からコピーしたいポーズを選択してください');
        return;
    }
    // 編集直後で自動保存がまだなら、いま画面に出ている姿勢を選択中ポーズへ反映してからコピーする
    if (_autoSavePending) {
        clearTimeout(_autoSaveTimer);
        _autoSavePending = false;
        const snap = captureFullPoseSnapshot();
        if (snap) {
            mySlots[i].poseSnapshot = snap;
            mySlots[i].isDefault    = false;
            saveSlots(mySlots);
        }
    }
    insertSlotAfter(i); // 複製・一意ID発行・動画シーケンス参照調整・保存・選択・名前入力ポップアップ
}
function deleteCurrentPose() {
    const i = activeSlotIndex;
    if (i < 0 || !mySlots[i]) {
        alert('先にポーズ格納庫から削除したいポーズを選択してください');
        return;
    }
    removeSlotAt(i); // 確認ダイアログ・最後の1件は削除不可・シーケンス参照調整・保存・選択解除
}

function buildSlotButtons() {
    const container = document.getElementById('pose-slot-buttons');
    if (!container) return;
    container.innerHTML = '';

    mySlots.forEach((slot, i) => {
        const row = document.createElement('div');
        row.className = 'pose-slot-row';

        // 番号バッジ
        const badge = document.createElement('div');
        badge.className = 'slot-num-badge';
        badge.textContent = i + 1;

        // 適用ボタン（＝プリセットボタン）
        const applyBtn = document.createElement('button');
        applyBtn.className = 'slot-apply-btn has-data';
        applyBtn.dataset.slotIdx = i;
        // 表情がONのポーズには、絵文字バッジを付けて一目で分かるようにする
        const exprBadge = slot.expressionEnabled
            ? ' ' + ((EXPRESSION_PRESETS.find(p => p.key === slot.expressionKey) || {}).emoji || '😊')
            : '';
        // 小道具がONのポーズにも、一目で分かるようバッジを付ける
        const propsBadge = slot.propsEnabled ? ' 🗡️' : '';
        applyBtn.textContent = slot.name + exprBadge + propsBadge;
        applyBtn.addEventListener('click', () => activateSlot(i));

        // 編集ボタン（✏️）— 名前変更・リセット
        const editBtn = document.createElement('button');
        editBtn.className = 'slot-edit-btn';
        editBtn.textContent = '✏️';
        editBtn.title = `プリセット${i+1}を編集`;
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openSlotEditPopup(i);
        });

        // 上へボタン（＋）— このポーズを1つ上と入れ替える（複製は🎮ポージングの「このポーズをコピー」へ）
        const addBtn = document.createElement('button');
        addBtn.className = 'slot-add-btn';
        addBtn.textContent = '＋';
        addBtn.title = `「${slot.name}」を1つ上へ`;
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveSlot(i, -1);
        });

        // 下へボタン（－）— このポーズを1つ下と入れ替える（削除は🎮ポージングの「このポーズを消去」へ）
        const delBtn = document.createElement('button');
        delBtn.className = 'slot-move-down-btn';
        delBtn.textContent = '－';
        delBtn.title = `「${slot.name}」を1つ下へ`;
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveSlot(i, 1);
        });

        row.append(badge, applyBtn, editBtn, addBtn, delBtn);
        container.appendChild(row);
    });

    // 最初のスロットをactive
    const first = container.querySelector('.slot-apply-btn');
    if (first) first.classList.add('active');

    // 🎬 動画編集のポーズ選択一覧も、名前変更やリセット・読込・追加削除に合わせて更新する
    if (window.buildPosePickerButtons) window.buildPosePickerButtons();
}

function showSlotStatus(msg) {
    const el = document.getElementById('saveLoadStatus');
    if (!el) return;
    el.textContent = msg;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 2500);
}

// ── スロット名編集ポップアップ ───────────────────────────────
function openSlotEditPopup(slotIdx) {
    slotEditTarget = slotIdx;
    const popup   = document.getElementById('slot-edit-popup');
    const overlay = document.getElementById('slot-popup-overlay');
    const input   = document.getElementById('slot-name-input');
    if (!popup || !overlay || !input) return;
    input.value = mySlots[slotIdx].name;
    popup.classList.add('open');
    overlay.classList.add('open');
    if (window._exprEditors) window._exprEditors.popup.sync();
    if (window._propsEditors) window._propsEditors.popup.sync();
    setTimeout(() => input.focus(), 50);
}

// ============================================================
// 表情エディタ（共通ロジック）
// ------------------------------------------------------------
// 「🗃️ ポーズ格納庫」の✏️編集ポップアップと「🎮 ポージング」タブの
// 両方に、同じ操作性の表情エディタ（ON/OFFトグル＋8プリセット）を置く。
// 編集対象スロットの取得方法だけが呼び出し元ごとに異なるので、
// getTargetIndex() 関数で切り替える：
//   ・ポップアップ側 → 今開いているスロット(slotEditTarget)
//   ・ポージングタブ側 → 今アクティブなスロット(activeSlotIndex)
//     （体のポージング編集も同じactiveSlotIndexに自動保存されるため、
//      「今動かしている体」と「今設定する表情」が常に同じポーズを指す）
// ============================================================
function createExpressionEditorUI({ toggleId, buttonsId, statusId, getTargetIndex }) {
    const toggle    = document.getElementById(toggleId);
    const container = document.getElementById(buttonsId);
    const statusEl  = statusId ? document.getElementById(statusId) : null;
    if (!toggle || !container) return { sync(){} };

    // プリセットボタンは初回に1度だけ生成する
    container.innerHTML = '';
    EXPRESSION_PRESETS.forEach(preset => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot-expr-btn';
        btn.dataset.key = preset.key;
        btn.title = preset.usage;
        btn.innerHTML = `<span class="expr-emoji">${preset.emoji}</span><span class="expr-label">${preset.label}</span>`;
        btn.addEventListener('click', () => {
            const idx = getTargetIndex();
            if (idx < 0 || !mySlots[idx]) return;
            const slot = mySlots[idx];
            // ★必須ルール：プリセットの内容はディープコピーして持たせる（同じ参照を共有しない）
            slot.expressionEnabled = true;
            slot.expressionKey     = preset.key;
            slot.expression        = cloneExpression(preset);
            saveSlots(mySlots);
            syncAllExpressionEditors();
            buildSlotButtons(); // 格納庫の表情バッジも更新
            // 今まさに表示中のポーズなら、その場でプレビューに反映する
            if (idx === activeSlotIndex) applyFaceExpression(getEffectiveExpression(slot));
        });
        container.appendChild(btn);
    });

    toggle.addEventListener('change', (e) => {
        const idx = getTargetIndex();
        if (idx < 0 || !mySlots[idx]) return;
        const slot = mySlots[idx];
        slot.expressionEnabled = (e.target.value === 'true');
        saveSlots(mySlots);
        syncAllExpressionEditors();
        buildSlotButtons();
        if (idx === activeSlotIndex) applyFaceExpression(getEffectiveExpression(slot));
    });

    function sync() {
        const idx = getTargetIndex();
        const slot = (idx >= 0) ? mySlots[idx] : null;
        const enabled = !!slot;
        toggle.disabled = !enabled;
        toggle.value = slot ? (slot.expressionEnabled ? 'true' : 'false') : 'false';
        container.style.opacity = (enabled && slot.expressionEnabled) ? '1' : '0.45';
        container.style.pointerEvents = (enabled && slot.expressionEnabled) ? '' : 'none';
        container.querySelectorAll('.slot-expr-btn').forEach(b => {
            b.disabled = !enabled;
            b.classList.toggle('active', enabled && slot.expressionEnabled && b.dataset.key === slot.expressionKey);
        });
        if (statusEl) {
            if (enabled) {
                statusEl.textContent = `「${slot.name}」の表情を編集中`;
                statusEl.classList.remove('inactive');
            } else {
                statusEl.textContent = '👉 まず🗃️ポーズ格納庫でポーズを選んでください';
                statusEl.classList.add('inactive');
            }
        }
    }

    return { sync };
}

// 両方の表情エディタをまとめて同期する
function syncAllExpressionEditors() {
    if (!window._exprEditors) return;
    window._exprEditors.popup.sync();
    window._exprEditors.posing.sync();
}
window.syncAllExpressionEditors = syncAllExpressionEditors;

window._exprEditors = {
    popup: createExpressionEditorUI({
        toggleId: 'slot-expr-toggle', buttonsId: 'slot-expr-buttons', statusId: null,
        getTargetIndex: () => slotEditTarget,
    }),
    posing: createExpressionEditorUI({
        toggleId: 'posing-expr-toggle', buttonsId: 'posing-expr-buttons', statusId: 'posing-expr-status',
        getTargetIndex: () => activeSlotIndex,
    }),
};
syncAllExpressionEditors();

// ============================================================
// 小道具エディタ（共通ロジック）
// ------------------------------------------------------------
// 表情エディタ（createExpressionEditorUI）と全く同じ構成・対象切替の
// 考え方を、右手武器/左手盾の2つのセレクトボックスに対して適用する。
// ============================================================
// rodBendSelectId / rodBendGroupId … 🎣右手が釣り竿の時だけ表示する「釣り竿の状態」（このポーズ専用）
function createPropsEditorUI({ toggleId, swordSelectId, shieldSelectId, rodBendSelectId, rodBendGroupId, bowStateSelectId, bowStateGroupId, statusId, getTargetIndex }) {
    const toggle     = document.getElementById(toggleId);
    const swordSel   = document.getElementById(swordSelectId);
    const shieldSel  = document.getElementById(shieldSelectId);
    const rodBendSel = rodBendSelectId ? document.getElementById(rodBendSelectId) : null;
    const rodBendGrp = rodBendGroupId ? document.getElementById(rodBendGroupId) : null;
    const bowStateSel = bowStateSelectId ? document.getElementById(bowStateSelectId) : null;
    const bowStateGrp = bowStateGroupId ? document.getElementById(bowStateGroupId) : null;
    const statusEl   = statusId ? document.getElementById(statusId) : null;
    if (!toggle || !swordSel || !shieldSel) return { sync(){} };
    // 弓の状態の欄は、左手が弓の時だけ見せる（キャラタブと同じ挙動）
    function updateBowStateVisibility() {
        if (bowStateGrp) bowStateGrp.style.display = (shieldSel.value === 'bow') ? '' : 'none';
    }
    // 釣り竿の状態の欄は、右手が釣り竿の時だけ見せる（キャラタブと同じ挙動）
    function updateRodBendVisibility() {
        if (rodBendGrp) rodBendGrp.style.display = (swordSel.value === 'fishingRod') ? '' : 'none';
    }

    // ★必須ルール：セレクトの内容はディープコピーして持たせる（同じ参照を共有しない）
    function commit() {
        const idx = getTargetIndex();
        if (idx < 0 || !mySlots[idx]) return;
        const slot = mySlots[idx];
        slot.propsEnabled = (toggle.value === 'true');
        // 釣り竿の状態もこのポーズの上書きとして保存する（欄が無い画面では従来どおりキャラの値で補われる）
        slot.props = { swordType: swordSel.value, leftPropType: shieldSel.value,
                       fishingRodBend: normalizeFishingRodBend(rodBendSel ? rodBendSel.value : (slot.props && slot.props.fishingRodBend)),
                       bowState: normalizeBowState(bowStateSel ? bowStateSel.value : (slot.props && slot.props.bowState)) };
        saveSlots(mySlots);
        syncAllPropsEditors();
        buildSlotButtons(); // 格納庫の小道具バッジも更新
        // 今まさに表示中のポーズなら、その場でプレビューに反映する
        if (idx === activeSlotIndex) applyCharacterProps(getEffectiveProps(slot));
    }

    toggle.addEventListener('change', commit);
    swordSel.addEventListener('change', commit);
    shieldSel.addEventListener('change', commit);
    if (rodBendSel) rodBendSel.addEventListener('change', commit);
    if (bowStateSel) bowStateSel.addEventListener('change', commit);

    function sync() {
        const idx = getTargetIndex();
        const slot = (idx >= 0) ? mySlots[idx] : null;
        const enabled = !!slot;
        toggle.disabled = !enabled;
        toggle.value = slot ? (slot.propsEnabled ? 'true' : 'false') : 'false';
        // セレクトには常にそのスロットの保存済み上書き内容を表示する（ONにした瞬間に
        // 迷わず選べるよう、OFF中でも直前に選んだ内容を保持・表示しておく）
        const p = slot ? cloneProps(slot.props) : cloneProps(characterData);
        swordSel.value  = p.swordType;
        shieldSel.value = p.leftPropType;
        if (rodBendSel) { rodBendSel.value = p.fishingRodBend; rodBendSel.disabled = !enabled; }
        updateRodBendVisibility();
        if (bowStateSel) { bowStateSel.value = p.bowState; bowStateSel.disabled = !enabled; }
        updateBowStateVisibility();
        const active = enabled && slot.propsEnabled;
        swordSel.disabled  = !enabled;
        shieldSel.disabled = !enabled;
        swordSel.style.opacity  = active ? '1' : '0.45';
        shieldSel.style.opacity = active ? '1' : '0.45';
        if (rodBendSel) rodBendSel.style.opacity = active ? '1' : '0.45';
        if (bowStateSel) bowStateSel.style.opacity = active ? '1' : '0.45';
        if (statusEl) {
            if (enabled) {
                statusEl.textContent = `「${slot.name}」の小道具を編集中`;
                statusEl.classList.remove('inactive');
            } else {
                statusEl.textContent = '👉 まず🗃️ポーズ格納庫でポーズを選んでください';
                statusEl.classList.add('inactive');
            }
        }
    }

    return { sync };
}

// 両方の小道具エディタをまとめて同期する
function syncAllPropsEditors() {
    if (!window._propsEditors) return;
    window._propsEditors.popup.sync();
    window._propsEditors.posing.sync();
}
window.syncAllPropsEditors = syncAllPropsEditors;

window._propsEditors = {
    popup: createPropsEditorUI({
        toggleId: 'slot-props-toggle', swordSelectId: 'slot-props-sword', shieldSelectId: 'slot-props-shield',
        rodBendSelectId: 'slot-props-rodbend', rodBendGroupId: 'slot-props-rodbend-group',
        bowStateSelectId: 'slot-props-bowstate', bowStateGroupId: 'slot-props-bowstate-group', statusId: null,
        getTargetIndex: () => slotEditTarget,
    }),
    posing: createPropsEditorUI({
        toggleId: 'posing-props-toggle', swordSelectId: 'posing-props-sword', shieldSelectId: 'posing-props-shield',
        rodBendSelectId: 'posing-props-rodbend', rodBendGroupId: 'posing-props-rodbend-group',
        bowStateSelectId: 'posing-props-bowstate', bowStateGroupId: 'posing-props-bowstate-group', statusId: 'posing-props-status',
        getTargetIndex: () => activeSlotIndex,
    }),
};
syncAllPropsEditors();

function closeSlotEditPopup() {
    document.getElementById('slot-edit-popup').classList.remove('open');
    document.getElementById('slot-popup-overlay').classList.remove('open');
    slotEditTarget = -1;
}

document.getElementById('slot-popup-ok').addEventListener('click', () => {
    if (slotEditTarget < 0) return;
    const name = document.getElementById('slot-name-input').value.trim();
    if (name) {
        mySlots[slotEditTarget].name = name;
        mySlots[slotEditTarget].isDefault = false;
    }
    saveSlots(mySlots);
    buildSlotButtons();
    closeSlotEditPopup();
});

document.getElementById('slot-popup-cancel').addEventListener('click', closeSlotEditPopup);
document.getElementById('pose-copy-btn').addEventListener('click', copyCurrentPose);
document.getElementById('pose-delete-btn').addEventListener('click', deleteCurrentPose);
document.getElementById('slot-popup-overlay').addEventListener('click', closeSlotEditPopup);

// 🔄 初期ポーズに戻すボタン
// ★＋／－でスロットの並びが初期状態からずれることがあるので、配列の位置(i)では
//   なく id／名前で対応する初期プリセットを探す（追加したポーズには初期状態が
//   無いので、その場合はエラー表示にする）。
document.getElementById('slot-popup-reset').addEventListener('click', () => {
    if (slotEditTarget < 0) return;
    const i    = slotEditTarget;
    const slot = mySlots[i];
    if (!slot) return;
    const defId = slot.id && slot.id.startsWith('default:') ? slot.id : ('default:' + slot.name);
    const def   = defaultSlots().find(d => d.id === defId) || defaultSlots().find(d => d.name === slot.name);
    if (!def) {
        showSlotStatus('⚠️ このポーズには初期状態がありません（追加したポーズのため）');
        closeSlotEditPopup();
        return;
    }
    mySlots[i] = { ...def, id: slot.id }; // このスロット自体の識別子(id)は変えず、中身だけ初期化
    saveSlots(mySlots);
    buildSlotButtons();
    // 初期ポーズ（表情・小道具含む）を即適用
    syncBowStateFromSlot(mySlots[i]);
    applyCharacterProps(getEffectiveProps(mySlots[i]));
    applyPoseSnapshot(mySlots[i].poseSnapshot);
    applyFaceExpression(getEffectiveExpression(mySlots[i]));
    activeSlotIndex = i;
    syncAllExpressionEditors();
    syncAllPropsEditors();
    showSlotStatus(`プリセット${i+1}を初期ポーズに戻しました`);
    closeSlotEditPopup();
});

// ============================================================
// 📌 「デフォルトにする」ボタン（ポーズ保管庫の一番下）
// ============================================================
// 自動保存待ちの編集が残っていれば、選択中ポーズへ反映して確定させる（copyCurrentPose・自動保存タイマーと同じ処理）
function flushPendingAutoSaveNow() {
    if (!_autoSavePending) return;
    clearTimeout(_autoSaveTimer);
    _autoSavePending = false;
    const i = activeSlotIndex;
    if (i < 0 || !mySlots[i]) return;
    const snap = captureFullPoseSnapshot();
    if (snap) {
        mySlots[i].poseSnapshot = snap;
        mySlots[i].isDefault    = false;
        saveSlots(mySlots);
    }
}

// 現在のmySlots全体をJSONディープコピーして、専用キーに保存する。成功ならtrue
function saveCurrentSlotsAsDefaultTemplate() {
    try {
        const copy = JSON.parse(JSON.stringify(mySlots)); // mySlotsと参照を共有しない独立コピー
        if (!Array.isArray(copy) || copy.length === 0 || !copy.every(isValidTemplateSlot)) return false;
        localStorage.setItem(DEFAULT_TEMPLATE_LS_KEY, JSON.stringify({
            version: 1,
            savedAt: new Date().toISOString(),
            slots: copy,
        }));
        return loadDefaultTemplateSlots() !== null; // 読み戻して、実際に使える形で保存できたか確認
    } catch(e) {
        return false;
    }
}

function showDefaultTemplateMessage(msg, ok) {
    const el = document.getElementById('pose-default-msg');
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? '#2e7d32' : '#c62828';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 4000);
}

const poseDefaultBtn = document.getElementById('pose-default-btn');
if (poseDefaultBtn) {
    poseDefaultBtn.addEventListener('click', () => {
        if (!confirm('現在のポーズ保管庫の内容を、今後の新しいキャラクターのデフォルトにしますか？\n（すでにあるキャラクターの保管庫は変更されません）')) return; // キャンセル：何も変更しない
        let ok = false;
        try {
            flushPendingAutoSaveNow();
            ok = saveCurrentSlotsAsDefaultTemplate();
        } catch(e) {
            ok = false;
        }
        const msg = ok
            ? '✅ 現在のポーズ保管庫をデフォルトとして保存しました'
            : '⚠️ デフォルトの保存に失敗しました（ブラウザの保存領域をご確認ください）';
        showDefaultTemplateMessage(msg, ok);
        showSlotStatus(msg);
    });
}
