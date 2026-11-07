// ============================================================
// 「ドラゴンバスター」勇者アニメ用 単体ポーズ（シーケンスから参照）
// ------------------------------------------------------------
// 要望の8アニメーションを構成する13個のキーポーズ＋鍬用に追加した2ポーズ
// ＋農業の収穫／モンスター素材収集用に追加した3ポーズ。
// 複数ポーズが必要なアニメーションは _A/_MID/_B、_READY/_WINDUP/_SLASH
// のように分割し、POSES配列（=ポーズ格納庫のプリセット/GLBクリップ）から
// 参照することで数値の二重管理を避けている。
// （連続再生プレビューは video-edit.js の「🎬 動画編集」機能が担う）
//   1.😊 待機            → POSE_IDLE
//   2.🏃 疾走             → POSE_SPRINT_A / _MID / _B（3ポーズの往復ループ）
//   3.⚔ 大剣構え          → POSE_GS_READY
//   4.⚔ 大剣攻撃          → POSE_GS_WINDUP（振りかぶり）→ POSE_GS_SLASH（斬り下ろし）
//   5.🦘 ジャンプ          → POSE_JUMP_CROUCH（しゃがみ）→ POSE_JUMP_AIR（空中）
//   6.✨ 魔法アイテム使用  → POSE_MAGIC_RAISE（構え）→ POSE_MAGIC_CAST（発動）
//   7.😵 ダメージ          → POSE_DAMAGE
//   8.🏆 勝利             → POSE_VICTORY
//   9.🌾 鍬                → POSE_HOE_WINDUP（振り上げる）/ POSE_HOE_SLASH（振り下ろす）/ POSE_HOE_TILL（刃先を土に残して柄を引き起こし、土をほぐす）
//  10.🔪🎒 収穫・素材収集  → POSE_KNIFE_RAISE（ナイフ振り上げ）→ POSE_KNIFE_SLASH（ナイフ振り下ろし）
//                          → POSE_BAG_CATCH（カバンで受ける）
//  11.🎣 釣り竿           → POSE_FISHING_xxx（ふりかぶり／振り下ろし／ゆっくりひく／あたり／右にふる／左にふる／釣り上げる の7ポーズ）
//  12.🪓 斧で木を切る     → POSE_AXE_WINDUP（振りかぶる）→ POSE_AXE_HIT（木に当てる）→ POSE_AXE_PRY（こじって引き抜く）
// ============================================================
const POSE_IDLE = {
    head: { rx: -0.05, ry: 0.04, rz: 0 },
    arms: [
        { root: { rx:  0.05, ry: 0, rz:  0.12 }, joint: { rx: -0.1,  rz: 0 } },
        { root: { rx:  0.05, ry: 0, rz: -0.15 }, joint: { rx: -0.15, rz: 0 } },
    ],
    legs: [
        { root: { rx:  0.03, rz:  0.06 }, joint: { rx: 0.05 } },
        { root: { rx: -0.02, rz: -0.06 }, joint: { rx: 0.03 } },
    ],
    swordTiltX: -0.4, // 剣先を下げてリラックスして構える
};
const POSE_SPRINT_A = { // 左足が前に出た接地ポーズ
    head: { rx: -0.12, ry: 0, rz: 0 },
    arms: [
        { root: { rx: -0.45, ry: 0, rz:  0.18 }, joint: { rx: -0.45, rz: 0 } },
        { root: { rx:  0.55, ry: 0, rz: -0.18 }, joint: { rx: -0.5,  rz: 0 } },
    ],
    legs: [
        { root: { rx:  0.65, rz:  0.06 }, joint: { rx: 0.85 } },
        { root: { rx: -0.45, rz: -0.06 }, joint: { rx: 0.15 } },
    ],
    swordTiltX: -0.25,
};
const POSE_SPRINT_MID = { // 両足が体の下でそろう通過姿勢
    head: { rx: -0.12, ry: 0, rz: 0 },
    arms: [
        { root: { rx: 0.05, ry: 0, rz:  0.18 }, joint: { rx: -0.5, rz: 0 } },
        { root: { rx: 0.08, ry: 0, rz: -0.18 }, joint: { rx: -0.5, rz: 0 } },
    ],
    legs: [
        { root: { rx: 0.15, rz:  0.06 }, joint: { rx: 0.5 } },
        { root: { rx: 0.12, rz: -0.06 }, joint: { rx: 0.5 } },
    ],
    swordTiltX: -0.25,
};
const POSE_SPRINT_B = { // 右足が前に出た接地ポーズ（Aの左右反転）
    head: { rx: -0.12, ry: 0, rz: 0 },
    arms: [
        { root: { rx:  0.55, ry: 0, rz:  0.18 }, joint: { rx: -0.5,  rz: 0 } },
        { root: { rx: -0.45, ry: 0, rz: -0.18 }, joint: { rx: -0.45, rz: 0 } },
    ],
    legs: [
        { root: { rx: -0.45, rz:  0.06 }, joint: { rx: 0.15 } },
        { root: { rx:  0.65, rz: -0.06 }, joint: { rx: 0.85 } },
    ],
    swordTiltX: -0.25,
};
const POSE_GS_READY = { // 大剣を両手持ちの構えで低く腰を落とす
    head: { rx: -0.05, ry: -0.1, rz: 0 },
    arms: [
        { root: { rx: -0.15, ry:  0.15, rz:  0.65 }, joint: { rx: -0.55, rz: 0 } },
        { root: { rx: -0.25, ry: -0.05, rz: -0.75 }, joint: { rx: -0.6,  rz: 0 } },
    ],
    legs: [
        { root: {  rx: 0.4, rz:  0.12 }, joint: { rx: 0.3 } },
        { root: { rx: -0.3, rz: -0.12 }, joint: { rx: 0.2 } },
    ],
    swordTiltX: 0.7, // 切っ先を前方やや上に構える
};
const POSE_GS_WINDUP = { // 大剣を頭上高くに振りかぶる
    head: { rx: -0.2, ry: -0.05, rz: 0 },
    arms: [
        { root: {  rx: 0.3, ry: 0.1,   rz:  0.35 }, joint: { rx: -0.25, rz: 0 } },
        { root: { rx: -0.9, ry: -0.25, rz: -2.0  }, joint: { rx: -0.65, rz: 0 } },
    ],
    legs: [
        { root: {  rx: 0.45, rz:  0.1 }, joint: { rx: 0.3  } },
        { root: { rx: -0.2,  rz: -0.1 }, joint: { rx: 0.15 } },
    ],
    swordTiltX: 1.5, // 頭上高くに振りかぶった状態
};
const POSE_GS_SLASH = { // 大剣を体の前へ斜めに振り下ろした瞬間
    head: { rx: 0.15, ry: 0.2, rz: 0 },
    arms: [
        { root: { rx: 0.1, ry: 0,    rz: 0.2 }, joint: { rx: -0.1, rz: 0 } },
        { root: { rx: 1.0, ry: 0.35, rz: 0.3 }, joint: { rx: -0.2, rz: 0 } },
    ],
    legs: [
        { root: { rx: -0.15, rz:  0.12 }, joint: { rx: 0.1  } },
        { root: { rx:  0.4,  rz: -0.12 }, joint: { rx: 0.35 } },
    ],
    swordTiltX: -1.4, // 振り下ろし後で切っ先が下を向く
};
const POSE_JUMP_CROUCH = { // 跳躍直前の深いしゃがみ（踏み切り準備）
    head: { rx: 0.1, ry: 0, rz: 0 },
    arms: [
        { root: { rx: -0.5,  ry: 0, rz:  0.15 }, joint: { rx: -0.3,  rz: 0 } },
        { root: { rx: -0.55, ry: 0, rz: -0.15 }, joint: { rx: -0.35, rz: 0 } },
    ],
    legs: [
        { root: { rx: 0.55, rz:  0.1 }, joint: { rx: 1.1 } },
        { root: { rx: 0.55, rz: -0.1 }, joint: { rx: 1.1 } },
    ],
    swordTiltX: -0.5,
};
const POSE_JUMP_AIR = { // 跳躍の頂点、脚を非対称に流した空中姿勢
    head: { rx: -0.15, ry: 0, rz: 0 },
    arms: [
        { root: { rx: -0.8, ry: 0, rz:  0.3 }, joint: { rx: -0.2,  rz: 0 } },
        { root: { rx: -0.7, ry: 0, rz: -0.3 }, joint: { rx: -0.15, rz: 0 } },
    ],
    legs: [
        { root: {  rx: 0.3,  rz:  0.08 }, joint: { rx: 0.8  } },
        { root: { rx: -0.35, rz: -0.08 }, joint: { rx: 0.25 } },
    ],
    swordTiltX: 0.3,
};
const POSE_MAGIC_RAISE = { // 左手の魔法アイテムを頭上へ掲げる
    head: { rx: -0.35, ry: 0, rz: 0 },
    arms: [
        { root: { rx: -1.4, ry: 0, rz:  0.15 }, joint: { rx: -0.1, rz: 0 } },
        { root: { rx:  0.15, ry: 0, rz: -0.25 }, joint: { rx: -0.2, rz: 0 } },
    ],
    legs: [
        { root: {  rx: 0.05, rz:  0.08 }, joint: { rx: 0.05 } },
        { root: { rx: -0.05, rz: -0.08 }, joint: { rx: 0.05 } },
    ],
    swordTiltX: -0.6,
};
const POSE_MAGIC_CAST = { // 魔法発動の瞬間、上体を反らして両腕を開く
    head: { rx: -0.45, ry: 0, rz: 0.05 },
    arms: [
        { root: { rx: -1.5, ry: -0.2, rz:  0.5 }, joint: { rx: -0.05, rz: 0 } },
        { root: { rx: -0.3, ry:  0.15, rz: -0.6 }, joint: { rx: -0.15, rz: 0 } },
    ],
    legs: [
        { root: {  rx: 0.1,  rz:  0.1 }, joint: { rx: 0.1  } },
        { root: { rx: -0.15, rz: -0.1 }, joint: { rx: 0.15 } },
    ],
    swordTiltX: -0.4,
};
const POSE_DAMAGE = { // 被弾のけぞり、剣が力なく下がる
    head: { rx: 0.35, ry: 0.15, rz: 0.1 },
    arms: [
        { root: { rx: 0.4, ry: 0.1, rz:  0.5 }, joint: { rx: -0.9, rz: 0 } },
        { root: { rx: 0.3, ry: 0,   rz: -0.35 }, joint: { rx: -0.3, rz: 0 } },
    ],
    legs: [
        { root: { rx: -0.2, rz:  0.15 }, joint: { rx: 0.35 } },
        { root: {  rx: 0.25, rz: -0.05 }, joint: { rx: 0.1  } },
    ],
    swordTiltX: -0.9,
};
const POSE_VICTORY = { // 大剣を天に掲げて勝ちどきを上げる
    head: { rx: -0.3, ry: 0, rz: 0 },
    arms: [
        { root: { rx: -0.1,  ry: -0.2, rz:  0.45 }, joint: { rx: -0.15, rz: 0 } },
        { root: { rx: -0.35, ry: 0,    rz: -2.6  }, joint: { rx: -0.1,  rz: 0 } },
    ],
    legs: [
        { root: { rx: 0, rz:  0.08 }, joint: { rx: 0 } },
        { root: { rx: 0, rz: -0.08 }, joint: { rx: 0 } },
    ],
    swordTiltX: 1.3, // 剣を高々と天に掲げる
};

// ============================================================
// 🌾「鍬」用の追加ポーズ（振り上げ／振り下ろし）
// ------------------------------------------------------------
// 体・脚の動き自体は既に実績のある POSE_GS_WINDUP / POSE_GS_SLASH
// （大剣の振りかぶり／斬り下ろし）とほぼ同じ大振りの動作を流用する
// （両手を大きく使う道具を頭上に振りかぶって振り下ろす、という
//   体の使い方自体は大剣でも鍬でも共通のため）。
// 異なるのは swordTiltX（右手の道具そのものの傾き）だけで、
// 鍬はHOE_BASE_ROTATIONが「柄をほぼ縦に持つ」向きを基準にしているため、
// 大剣のような大きなチルト値（±1.5前後）は使わず、控えめな値にとどめて
// 腕自体の回転（肩・肘）だけで振り上げ／振り下ろしの動きを表現している。
// ============================================================
const POSE_HOE_WINDUP = { // 鍬を頭上高くに振りかぶる
    head: { rx: -0.2, ry: -0.05, rz: 0 },
    arms: [
        { root: {  rx: 0.3, ry: 0.1,   rz:  0.35 }, joint: { rx: -0.25, rz: 0 } },
        { root: { rx: -0.9, ry: -0.25, rz: -2.0  }, joint: { rx: -0.65, rz: 0 } },
    ],
    legs: [
        { root: {  rx: 0.45, rz:  0.1 }, joint: { rx: 0.3  } },
        { root: { rx: -0.2,  rz: -0.1 }, joint: { rx: 0.15 } },
    ],
    swordTiltX: 0.2, // 振りかぶった腕の角度に自然に沿うよう、基準姿勢からわずかに前傾させる
};
const POSE_HOE_SLASH = { // 鍬を体の前へ振り下ろした瞬間
    head: { rx: 0.15, ry: 0.2, rz: 0 },
    arms: [
        { root: { rx: 0.1, ry: 0,    rz: 0.2 }, joint: { rx: -0.1, rz: 0 } },
        { root: { rx: 1.0, ry: 0.35, rz: 0.3 }, joint: { rx: -0.2, rz: 0 } },
    ],
    legs: [
        { root: { rx: -0.15, rz:  0.12 }, joint: { rx: 0.1  } },
        { root: { rx:  0.4,  rz: -0.12 }, joint: { rx: 0.35 } },
    ],
    swordTiltX: -0.3, // 振り下ろした直後、刃先が少し前に出て地面に食い込むイメージ
};

// 🌾 鍬で土をほぐす（振り上げ→振り下ろしに続く3番目のポーズ）
// ------------------------------------------------------------
// 既存の鍬（createHoe／HOE_BASE_ROTATION）を右手に持ったまま、鍬の形状・基準回転は一切変えず、
// 右腕(arms[1])とswordTiltXだけで姿勢を作っている。
//   ・刃先は地面に残したまま（刃が土に入った状態）、柄を手前・上方向へ引き起こして土をこじる姿勢。
//     振り下ろし(POSE_HOE_SLASH)とは別の姿勢で、柄が約40°まで起き、右ひじは外に張り、右手は腹の前に来る。
//   ・右手(wrist)は柄を横から握る向き（柄と前腕がほぼ直角）。刃の面は下向き・刃の幅は水平。
//   ・左腕は軽く前に出してバランスを取る（左手には何も持たない）。脚は左足を前・右足を後ろに踏ん張る。
//   ・このポーズ形式には胴体の回転が無いため、前傾は頭の向き（やや下向き）で表現し、前かがみになりすぎない。
//   ・数値は、ポーズ定義の回転順(YXZ)で肩→ひじ→手首→鍬を順運動学で合成して、刃先が地面に入ること、
//     柄が頭・胴体・上腕・左腕にめり込まないことを計算で確認して決めた（3D表示での実機確認は未実施。
//     見た目の微調整が必要なら右腕(arms[1])とswordTiltXだけ動かせばよい）。
// ★小道具（右手=鍬／左手=なし）と表情の初期設定は pose-slots.js の DEFAULT_SLOT_PROPS / DEFAULT_SLOT_EXPRESSIONS にある。
const POSE_HOE_TILL = { // 刃先を土に残したまま、柄を手前・上へ引いて土をこじる
    head: { rx: 0.2, ry: -0.15, rz: 0 },
    arms: [
        { root: { rx: -0.55, ry: 0, rz: 0.35 }, joint: { rx: -0.7, rz: 0 }, wrist: { rx: 0, ry: 0, rz: 0 } },
        { root: { rx: 0.25, ry: 0.58, rz: -0.60 }, joint: { rx: -1.43, rz: 0.35 }, wrist: { rx: -0.63, ry: 1.26, rz: 1.01 } },
    ],
    legs: [
        { root: { rx: -0.40, rz: 0.15 }, joint: { rx: 0.35 } },
        { root: { rx: 0.20, rz: -0.15 }, joint: { rx: 0.25 } },
    ],
    swordTiltX: 1.12,
};

// ============================================================
// 🔪🎒 収穫／モンスター素材収集用の追加ポーズ（ナイフ振り上げ・振り下ろし・カバンで受ける）
// ------------------------------------------------------------
// 大剣（POSE_GS_WINDUP/SLASH）のような両手持ちの大振りとは違い、
// ナイフ（＝剣で代用）は右腕だけを使った小さく軽い動作にしたいので、
// 肩(root)・肘(joint)の可動域は控えめにし、角度の作り込みは主に
// swordTiltX（ナイフ自体の傾き）側で行っている。
// ・振り上げ：swordTiltX ≒ 0.5rad（正面より上30度ほど軽く振り上げる）
// ・振り下ろし：swordTiltX = 0（正面0度＝水平まで振り下ろす）
// 左手は収穫袋（harvestBag）を提げたまま自然に構えておき、
// 「カバンで受ける」ポーズでのみ袋の口を前に差し出す動きに切り替える。
// ============================================================
const POSE_KNIFE_RAISE = { // ナイフ（右手）を正面の上30度ほどへ軽く振り上げる
    head: { rx: -0.1, ry: -0.05, rz: 0 },
    arms: [
        // 左腕：収穫袋を提げたまま、作業に備えて自然に構える
        { root: { rx:  0.08, ry: 0,     rz:  0.12 }, joint: { rx: -0.15, rz: 0 } },
        // 右腕：ナイフを正面のやや前方・上へ軽く持ち上げる（大剣の大振りより控えめな可動域）
        { root: { rx: -0.35, ry: -0.05, rz: -0.25 }, joint: { rx: -0.85, rz: 0 } },
    ],
    legs: [
        { root: {  rx: 0.1,  rz:  0.06 }, joint: { rx: 0.08 } },
        { root: { rx: -0.08, rz: -0.06 }, joint: { rx: 0.06 } },
    ],
    swordTiltX: 0.5, // 正面（0度）より上30度ほど軽く振り上げた角度
};
const POSE_KNIFE_SLASH = { // ナイフ（右手）を正面0度（水平）まで軽く振り下ろす
    head: { rx: 0.1, ry: 0.05, rz: 0 },
    arms: [
        // 左腕：振り上げ時と同じく収穫袋を提げたまま
        { root: { rx: 0.08, ry: 0,    rz:  0.12 }, joint: { rx: -0.15, rz: 0 } },
        // 右腕：振り上げた位置から正面へ軽く振り下ろした腕の伸び
        { root: { rx: 0.15, ry: 0.05, rz: -0.1  }, joint: { rx: -0.4,  rz: 0 } },
    ],
    legs: [
        { root: {  rx: 0.02, rz:  0.06 }, joint: { rx: 0.05 } },
        { root: { rx: -0.15, rz: -0.06 }, joint: { rx: 0.12 } },
    ],
    swordTiltX: 0.0, // 正面0度＝水平まで振り下ろした角度
};
const POSE_BAG_CATCH = { // 左手の収穫袋を前に差し出して素材を受ける
    head: { rx: 0.12, ry: 0.08, rz: 0 }, // 袋の方へ視線を落とす
    arms: [
        // 左腕：袋の口を前方へ差し出す（受け皿にするイメージ）
        { root: { rx: -0.55, ry: 0.12, rz: 0.15 }, joint: { rx: -0.45, rz: 0 } },
        // 右腕：ナイフを下げてリラックス（POSE_IDLEと同じ考え方）
        { root: { rx:  0.05, ry: 0,    rz: -0.12 }, joint: { rx: -0.15, rz: 0 } },
    ],
    legs: [
        { root: {  rx: 0.12, rz:  0.06 }, joint: { rx: 0.15 } },
        { root: { rx: -0.05, rz: -0.06 }, joint: { rx: 0.05 } },
    ],
    swordTiltX: -0.4, // 待機時と同じくナイフを下げてリラックスさせる
};

// ============================================================
// 💧「ジョウロ」用の追加ポーズ（正面／右／左に高く構える）
// ------------------------------------------------------------
// ジョウロは鍬やナイフと同じ右手専用の小道具（片手持ち）なので、
// 左腕はPOSE_IDLEと同じ「力を抜いて下げた」状態のまま流用し、
// 右腕（arms[1]）の肩(root)だけで「高く掲げる」動きを作る。
// ・rx（前後）を大きく負の値にするほど、腕が正面上方へ持ち上がる
//   （✨魔法・構え＝POSE_MAGIC_RAISEの左腕と同じ考え方）。
// ・ry（左右のヨー）で、掲げる方向を正面／右／左に振り分ける。
// ・rz（ひねり）は待機時の右腕(-0.15)からあまり動かさず、
//   「正面」は待機に近い値、「右」は体の外側へ少し開き、
//   「左」は体の前を横切るぶんだけ変化させている。
// 顔・重心（脚）も、構えた方向へ軽く追従させて自然さを出している。
// swordTiltXは「持ち上げて見せる」ように、鍬の構え(0.2)〜大剣構え(0.7)の
// 中間程度の値にして、注ぎ口がやや上を向くようにしている。
// ============================================================
const POSE_WATERINGCAN_FRONT_HIGH = { // ジョウロを正面高く構える
    head: { rx: -0.15, ry: 0, rz: 0 }, // 掲げたジョウロを見上げるように少し上向き
    arms: [
        // 左腕：待機と同じく力を抜いて下げたまま
        { root: { rx: 0.05, ry: 0, rz: 0.12 }, joint: { rx: -0.1, rz: 0 } },
        // 右腕：ジョウロを正面のまっすぐ上へ高く掲げる（横方向のブレなし）
        { root: { rx: -1.3, ry: 0, rz: -0.15 }, joint: { rx: -0.15, rz: 0 } },
    ],
    legs: [
        { root: { rx: 0.03, rz: 0.06 }, joint: { rx: 0.05 } },
        { root: { rx: -0.02, rz: -0.06 }, joint: { rx: 0.03 } },
    ],
    swordTiltX: 0.5, // 掲げて見せるように、注ぎ口をやや上向きに傾ける
};
const POSE_WATERINGCAN_RIGHT_HIGH = { // ジョウロを右高く構える
    head: { rx: -0.1, ry: -0.2, rz: 0 }, // ジョウロのある右側へ軽く顔を向ける
    arms: [
        // 左腕：待機と同じく力を抜いて下げたまま
        { root: { rx: 0.05, ry: 0, rz: 0.12 }, joint: { rx: -0.1, rz: 0 } },
        // 右腕：正面構えよりヨーを右へ振り、外側へも少し開いて高く掲げる
        { root: { rx: -1.15, ry: -0.5, rz: -0.35 }, joint: { rx: -0.15, rz: 0 } },
    ],
    legs: [
        // 掲げた右腕とバランスを取るよう、重心をわずかに左足へ
        { root: { rx: 0.02, rz: 0.1 }, joint: { rx: 0.08 } },
        { root: { rx: -0.05, rz: -0.03 }, joint: { rx: 0.02 } },
    ],
    swordTiltX: 0.5, // 掲げて見せるように、注ぎ口をやや上向きに傾ける
};
const POSE_WATERINGCAN_LEFT_HIGH = { // ジョウロを左高く構える
    head: { rx: -0.1, ry: 0.25, rz: 0 }, // ジョウロを体の前で左へ運ぶ方向へ顔を向ける
    arms: [
        // 左腕：待機と同じく力を抜いて下げたまま
        { root: { rx: 0.05, ry: 0, rz: 0.12 }, joint: { rx: -0.1, rz: 0 } },
        // 右腕：体の前を横切るように、正面構えよりヨーを左へ大きく振る
        { root: { rx: -1.15, ry: 0.6, rz: -0.05 }, joint: { rx: -0.15, rz: 0 } },
    ],
    legs: [
        // 掲げた右腕（体の前を横切る側）とバランスを取るよう、重心をわずかに右足へ
        { root: { rx: -0.03, rz: 0.05 }, joint: { rx: 0.03 } },
        { root: { rx: 0.05, rz: -0.08 }, joint: { rx: 0.1 } },
    ],
    swordTiltX: 0.5, // 掲げて見せるように、注ぎ口をやや上向きに傾ける
};

// ============================================================
// 🎣「釣り竿」用の追加ポーズ7種（ポーズ格納庫の末尾に追加）
// ------------------------------------------------------------
// ★釣り竿のモデル（createFishingRod）・曲がり状態(characterData.fishingRodBend)・
//   小道具UIは既存のまま一切変更していない。ここで定義するのは
//   「腕・手首・頭・脚の姿勢」と swordTiltX（竿の傾き）だけ。
// ★小道具の上書き（DEFAULT_SLOT_PROPS）は設定しない。ポーズを選んでも、
//   ユーザーが選んでいる小道具は勝手に変わらない。
//   竿の曲がり状態も自動では切り替えず、キャラタブの「釣り竿の状態」で手動選択する
//   （各ポーズ名の【　】内が推奨の状態）。
// ★角度はすべてラジアン。腕は arms[0]=左 / arms[1]=右（右手に竿）。
//   右手首(wrist)は、竿をその向きに持たせるために使っている（他のポーズ定義には無いが
//   poseDefToSnapshot / applyPoseSnapshot / GLB出力は元々wristに対応済み）。
// ★キャラの向きは+Z前方。竿先の向きは、右肩→肘→手首→竿の順に回転を合成して
//   計算で求め、頭・胴体との干渉も簡易モデルで確認して値を決めた。
// ★swordTiltX は竿の持ち手まわりの傾き（剣と同じ意味）。釣り竿以外の小道具を
//   持っている時にも、同じ向きに傾くだけで破綻はしない。
// ============================================================
const POSE_FISHING_BACKSWING = { // 釣り竿ふりかぶり：右手の竿を頭の横から後方45度まで振りかぶる（竿＝まっすぐ）
    // 右腕：腕を頭の右外側まで上げ、竿先が頭を越えて後方45度（上向き45度）になるようにする ／ 左腕：軽く外へ開いてバランスを取る ／ 脚：体重を後ろ足（右）にかける
    head: { rx: -0.15, ry: -0.10, rz: 0 },
    arms: [
        { root: { rx: 0.10, ry: 0, rz: 0.55 }, joint: { rx: -0.30, rz: 0 } },
        { root: { rx: -2.27, ry: 0.07, rz: -0.64 }, joint: { rx: -1.03, rz: 0 }, wrist: { rx: 0, ry: 0, rz: 0 } },
    ],
    legs: [
        { root: { rx: -0.20, rz: 0.10 }, joint: { rx: 0.10 } },
        { root: { rx: 0.15, rz: -0.10 }, joint: { rx: 0.25 } },
    ],
    swordTiltX: 0.84, // 竿の傾き（計算で求めた値）
};
const POSE_FISHING_FORWARD = { // 釣り竿振り下ろし：竿先を前方45度まで振り下ろした姿勢（竿＝まっすぐ）
    // 右腕：体の前へ伸ばし、竿先が前方45度（前上がり45度）になる ／ 左腕：少し後ろへ引いてバランスを取る ／ 脚：左足を踏み込み、右足は後ろに残す
    head: { rx: -0.10, ry: -0.05, rz: 0 },
    arms: [
        { root: { rx: 0.35, ry: 0, rz: 0.30 }, joint: { rx: -0.20, rz: 0 } },
        { root: { rx: -1.08, ry: 0.16, rz: -0.50 }, joint: { rx: -1.62, rz: 0 }, wrist: { rx: 0.69, ry: 0, rz: 0.04 } },
    ],
    legs: [
        { root: { rx: -0.40, rz: 0.10 }, joint: { rx: 0.35 } },
        { root: { rx: 0.25, rz: -0.10 }, joint: { rx: 0.10 } },
    ],
    swordTiltX: 1.15, // 竿の傾き（計算で求めた値）
};
const POSE_FISHING_REELING = { // ゆっくりひく：投げたルアーをゆっくり引く（竿＝少し曲がる）
    // 右腕：体の前で竿を前方30度ほどに構える ／ 左腕：リール（竿の下側）に手を添えてハンドルを回す位置 ／ 脚：力まず自然に立つ
    head: { rx: 0.10, ry: 0, rz: 0 },
    arms: [
        { root: { rx: -0.81, ry: -0.84, rz: 0.43 }, joint: { rx: -1.14, rz: 0 } },
        { root: { rx: -0.42, ry: 0.31, rz: -0.09 }, joint: { rx: -1.94, rz: 0 }, wrist: { rx: 0.61, ry: 0.05, rz: -0.28 } },
    ],
    legs: [
        { root: { rx: -0.10, rz: 0.08 }, joint: { rx: 0.10 } },
        { root: { rx: 0.05, rz: -0.08 }, joint: { rx: 0.10 } },
    ],
    swordTiltX: 1.16, // 竿の傾き（計算で求めた値）
};
const POSE_FISHING_BITE = { // あたり：魚があたった瞬間。竿を少し引き起こして踏ん張る（竿＝大きく曲がる）
    // 右腕：竿を前方40度ほどに引き起こす ／ 左腕：外へ開いてバランスを取る ／ 脚：踏ん張るように左を前・右を後ろにして膝を曲げる
    head: { rx: 0.05, ry: 0, rz: 0 },
    arms: [
        { root: { rx: -0.50, ry: 0, rz: 0.70 }, joint: { rx: -0.40, rz: 0 } },
        { root: { rx: -0.89, ry: 0.03, rz: -0.14 }, joint: { rx: -1.88, rz: 0 }, wrist: { rx: 0.79, ry: 0, rz: 0 } },
    ],
    legs: [
        { root: { rx: -0.30, rz: 0.14 }, joint: { rx: 0.30 } },
        { root: { rx: 0.20, rz: -0.14 }, joint: { rx: 0.25 } },
    ],
    swordTiltX: 1.18, // 竿の傾き（計算で求めた値）
};
const POSE_FISHING_PULL_RIGHT = { // 竿を右にふる：竿を右方向へ振って魚を引っ張る（竿＝大きく曲がる）
    // 右腕：体の右側へ腕を出し、竿先が右（体の外側）約70度・上向き30度を向く ／ 左腕：左へ開いてバランスを取る ／ 脚：足を広げて膝を曲げ、顔は右を向く
    head: { rx: 0, ry: -0.45, rz: 0 },
    arms: [
        { root: { rx: 0, ry: 0, rz: 1 }, joint: { rx: -0.20, rz: 0 } },
        { root: { rx: -0.79, ry: -1.03, rz: 0.60 }, joint: { rx: -1.96, rz: 0 }, wrist: { rx: 0.79, ry: 0.09, rz: -0.24 } },
    ],
    legs: [
        { root: { rx: 0, rz: 0.25 }, joint: { rx: 0.35 } },
        { root: { rx: 0.05, rz: -0.20 }, joint: { rx: 0.30 } },
    ],
    swordTiltX: 1.22, // 竿の傾き（計算で求めた値）
};
const POSE_FISHING_PULL_LEFT = { // 竿を左にふる：竿を左方向へ振って魚を引っ張る（竿＝大きく曲がる）
    // 右腕：体の前を横切るように左へ振り、竿先が左約70度・上向き30度を向く ／ 左腕：外へ開いてバランスを取る ／ 脚：足を広げて膝を曲げ、顔は左を向く
    head: { rx: 0, ry: 0.45, rz: 0 },
    arms: [
        { root: { rx: 0.30, ry: 0, rz: 0.90 }, joint: { rx: -0.20, rz: 0 } },
        { root: { rx: -0.69, ry: 1.20, rz: -1.09 }, joint: { rx: -1.60, rz: 0 }, wrist: { rx: 0.47, ry: 0, rz: 0.17 } },
    ],
    legs: [
        { root: { rx: 0, rz: 0.20 }, joint: { rx: 0.30 } },
        { root: { rx: 0.05, rz: -0.25 }, joint: { rx: 0.35 } },
    ],
    swordTiltX: 1.09, // 竿の傾き（計算で求めた値）
};
const POSE_FISHING_LANDED = { // 釣り上げる：魚を釣り上げてにっこり（竿＝少し曲がる）。魚のモデルは作らない
    // 右腕：竿を立てる（上向き約68度・少し前傾。頭に竿が刺さらないよう手を体の前に出す） ／ 左腕：釣り糸を持つように、体の前で竿のすぐ下あたりに置く ／ 表情：既存の「笑顔」プリセットを初期割り当て（pose-slots.js）
    head: { rx: -0.25, ry: 0, rz: 0 },
    arms: [
        { root: { rx: -0.68, ry: -0.85, rz: 0.43 }, joint: { rx: -1.59, rz: 0 } },
        { root: { rx: -1.06, ry: -0.06, rz: 0.16 }, joint: { rx: -1.69, rz: 0 }, wrist: { rx: 0.41, ry: 0, rz: 0 } },
    ],
    legs: [
        { root: { rx: -0.05, rz: 0.08 }, joint: { rx: 0.05 } },
        { root: { rx: 0.05, rz: -0.10 }, joint: { rx: 0.10 } },
    ],
    swordTiltX: 1.05, // 竿の傾き（計算で求めた値）
};

// ============================================================
// Quaternionユーティリティ（ポージング系の回転処理はすべてここを経由する）
// ------------------------------------------------------------
// 各ボーンの角度は、これまで通り
//   rx = 前後（Pitch） / ry = 左右（Yaw） / rz = ひねり（Roll）
// という3つの値で入力・保存されるが、実際にボーンへ適用する際は
// bone.rotation.x/y/z への個別代入ではなく、Quaternionとして合成してから
// bone.quaternion へ反映する。これにより
//   ・ジンバルロックを避けられる
//   ・SLERPによる滑らかなポーズ間補間ができる
//   ・GLB出力（quaternionトラック）とそのまま整合する
// というメリットが得られる。
//
// 合成順序は「Yaw（左右）→ Pitch（前後）→ Roll（ひねり）」を基本とする。
// Three.jsのEuler/Quaternionで 'YXZ' オーダーを指定すると、内部的に
//   q = qYaw（Y軸） × qPitch（X軸） × qRoll（Z軸）
// の順で合成されるため、この関数群では一貫して 'YXZ' を使用する。
// ============================================================
const POSE_ROTATION_ORDER = 'YXZ'; // Yaw→Pitch→Rollの順で合成されるEulerオーダー
const _poseWorkEuler = new THREE.Euler(0, 0, 0, POSE_ROTATION_ORDER); // 使い回し用ワーク変数（毎フレーム確保しない）

// 前後(rx=Pitch) / 左右(ry=Yaw) / ひねり(rz=Roll) の角度(ラジアン)からQuaternionを生成する。
// target を渡すと、そのQuaternionに直接書き込む（呼び出し側で使い回してGCコストを避けられる）。
function anglesToQuaternion(rx = 0, ry = 0, rz = 0, target = new THREE.Quaternion()) {
    _poseWorkEuler.set(rx, ry, rz, POSE_ROTATION_ORDER);
    return target.setFromEuler(_poseWorkEuler);
}

// Quaternionから、保存・エクスポート用の rx(Pitch)/ry(Yaw)/rz(Roll) 角度(ラジアン)を逆算する。
function quaternionToAngles(q) {
    _poseWorkEuler.setFromQuaternion(q, POSE_ROTATION_ORDER);
    return { rx: _poseWorkEuler.x, ry: _poseWorkEuler.y, rz: _poseWorkEuler.z };
}

// 角度(ラジアン)をQuaternionに変換してオブジェクトへ直接適用するヘルパー。
// bone.rotation.x/y/z の個別代入の代わりに、常にこの関数を通して適用する。
function setBoneAnglesAsQuaternion(obj, rx = 0, ry = 0, rz = 0) {
    if (!obj) return;
    anglesToQuaternion(rx, ry, rz, obj.quaternion);
}

// 2つの姿勢（{rx,ry,rz}、ラジアン）のQuaternionをSLERPで補間し、そのままボーンへ適用する。
// tickPoseLerpのようにフレーム毎に呼ばれる箇所で使うため、作業用Quaternionは使い回す。
const _slerpQFrom = new THREE.Quaternion();
const _slerpQTo   = new THREE.Quaternion();
function slerpBoneAngles(obj, fromAngles, toAngles, t) {
    if (!obj) return;
    anglesToQuaternion(fromAngles?.rx ?? 0, fromAngles?.ry ?? 0, fromAngles?.rz ?? 0, _slerpQFrom);
    anglesToQuaternion(toAngles?.rx   ?? 0, toAngles?.ry   ?? 0, toAngles?.rz   ?? 0, _slerpQTo);
    obj.quaternion.slerpQuaternions(_slerpQFrom, _slerpQTo, t);
}

// ============================================================
// 🏹 弓（左手に和弓を持つ）の3ポーズ
// ------------------------------------------------------------
// 弓の3状態モデル（createBow、character-body.js）に合わせた体の姿勢。
//   ・3ポーズとも左腕は完全に同じ値（＝左手の握り位置・弓の向きが一致する）。
//     左手首(wrist)は、弓を縦（上端が真上）のまま正面から約28°左へ向けるための回転で、
//     値が大きいのは腕を前上へ伸ばした向きを打ち消して弓を立てているため。
//   ・右腕だけが3ポーズで変わる（弓モデルとは独立。右手の調整は右腕の値だけでできる）。
//       つがえる ：右手を弦と矢の後端（握りの少し手前）に添える
//       引き絞る ：右手を矢の後端へ引き、頬のそばに構える
//       放った直後：右手を右後方へ開く（残心）
// ★角度はすべてラジアン。キャラの向きは+Z前方。腕の位置はFK計算で求め、
//   矢の後端・弦の位置と右手首が合うことを確認して決めた。
// ★小道具の上書き（DEFAULT_SLOT_PROPS）は設定しない。弓が左手に装備されている時だけ、
//   ポーズ適用で弓の状態が連動して切り替わる（pose-slots.jsのBOW_POSE_STATES）。
// ============================================================
const POSE_BOW_NOCKED = { // 矢をつがえる構え（まだ引いていない）
    head: { rx: -0.05, ry: 0.35, rz: 0 },
    arms: [
        { root: { rx: -1.99, ry: 0.11, rz: -0.18 }, joint: { rx: -0.24, rz: -0.51 }, wrist: { rx: 0.33, ry: 2.20, rz: 2.12 } },
        { root: { rx: -2.21, ry: -1.00, rz: 1.08 }, joint: { rx: -0.89, rz: 0.04 }, wrist: { rx: 0, ry: 0, rz: 0 } },
    ],
    legs: [
        { root: { rx: 0.05, rz: 0.16 }, joint: { rx: 0.12 } },
        { root: { rx: -0.04, rz: -0.16 }, joint: { rx: 0.12 } },
    ],
    swordTiltX: 0,
};
const POSE_BOW_DRAWN = { // 弓を引き絞る構え
    head: { rx: -0.05, ry: 0.45, rz: 0 },
    arms: [
        { root: { rx: -1.99, ry: 0.11, rz: -0.18 }, joint: { rx: -0.24, rz: -0.51 }, wrist: { rx: 0.33, ry: 2.20, rz: 2.12 } },
        { root: { rx: -2.21, ry: -1.00, rz: 0.02 }, joint: { rx: -1.97, rz: 0.26 }, wrist: { rx: 0, ry: 0, rz: 0 } },
    ],
    legs: [
        { root: { rx: 0.05, rz: 0.16 }, joint: { rx: 0.12 } },
        { root: { rx: -0.04, rz: -0.16 }, joint: { rx: 0.12 } },
    ],
    swordTiltX: 0,
};
const POSE_BOW_RELEASED = { // 矢を放った直後の構え（左手は弓を持ったまま、右手は右後方へ開く）
    head: { rx: -0.02, ry: 0.40, rz: 0 },
    arms: [
        { root: { rx: -1.99, ry: 0.11, rz: -0.18 }, joint: { rx: -0.24, rz: -0.51 }, wrist: { rx: 0.33, ry: 2.20, rz: 2.12 } },
        { root: { rx: -2.45, ry: 0.18, rz: -1.12 }, joint: { rx: -1.27, rz: -0.04 }, wrist: { rx: 0, ry: 0, rz: 0 } },
    ],
    legs: [
        { root: { rx: 0.05, rz: 0.16 }, joint: { rx: 0.12 } },
        { root: { rx: -0.04, rz: -0.16 }, joint: { rx: 0.12 } },
    ],
    swordTiltX: 0,
};

// ============================================================
// 🪓 斧で木を切る 3ポーズ（振りかぶる／木に当てる／こじって引き抜く）
// ------------------------------------------------------------
// 右手の既存の斧（createAxe、character-body.js）を持つ前提の姿勢。左手は何も持たない。
// 斧の形状・基準回転(AXE_BASE_ROTATION)は変更していない。
//   ・角度はすべてラジアン。キャラの向きは+Z前方。右肩→肘→手首→斧の順に回転を合成して
//     斧の位置・向きを計算し、頭・胴体・脚・左腕に斧と右腕がめり込まないことを確認して決めた。
//     （この環境ではブラウザの3D表示を確認できないため、値は計算と簡易描画での確認。
//      実機の3D表示で見て微調整する場合は、右腕(arms[1])とswordTiltXだけ動かせばよい。）
//   ・「木に当てる」と「こじって引き抜く」は、斧の刃が同じ位置（木に食い込んだ点）にある
//     ものとして作っている。違いは柄の角度と手の位置（引く側は手が低く体に近く、柄が急）。
//   ・このポーズ形式（head/arms/legs/swordTiltX）には胴体（背骨）の回転が無いため、
//     「上半身の前傾・ひねり」は、頭の向き・腕・脚の踏ん張りで近い見た目にしている。
// ★小道具（右手=斧／左手=なし）と表情の初期設定は pose-slots.js の
//   DEFAULT_SLOT_PROPS / DEFAULT_SLOT_EXPRESSIONS にある。
// ============================================================
const POSE_AXE_WINDUP = { // 斧を振りかぶる：右腕を上・後方へ上げ、斧を頭の後ろ上に構える
    head: { rx: -0.15, ry: -0.10, rz: 0 },
    arms: [
        { root: { rx: -0.70, ry: 0.15, rz: 0.45 }, joint: { rx: -0.80, rz: 0 }, wrist: { rx: 0, ry: 0, rz: 0 } },
        { root: { rx: -2.49, ry: -0.16, rz: -1.14 }, joint: { rx: -1.06, rz: 0.50 }, wrist: { rx: 0.90, ry: -0.80, rz: 0.28 } },
    ],
    legs: [
        { root: { rx: -0.15, rz: 0.22 }, joint: { rx: 0.30 } },
        { root: { rx: 0.10, rz: -0.25 }, joint: { rx: 0.35 } },
    ],
    swordTiltX: 1.56,
};
const POSE_AXE_HIT = { // 斧を木に当てる：振り下ろした斧の刃が、前方の木に当たった瞬間
    head: { rx: 0.12, ry: 0.15, rz: 0 },
    arms: [
        { root: { rx: 0.25, ry: 0, rz: 0.50 }, joint: { rx: -0.40, rz: 0 }, wrist: { rx: 0, ry: 0, rz: 0 } },
        { root: { rx: -0.70, ry: -0.32, rz: -0.90 }, joint: { rx: -0.80, rz: 0.50 }, wrist: { rx: 0.11, ry: 0.19, rz: 0.80 } },
    ],
    legs: [
        { root: { rx: -0.35, rz: 0.15 }, joint: { rx: 0.50 } },
        { root: { rx: 0.25, rz: -0.20 }, joint: { rx: 0.30 } },
    ],
    swordTiltX: 1.57,
};
const POSE_AXE_PRY = { // 斧をこじって引き抜く：木に食い込んだ斧の柄を、右手で手前（下）へ引く
    head: { rx: 0.08, ry: 0.12, rz: 0 },
    arms: [
        { root: { rx: 0.20, ry: 0, rz: 0.65 }, joint: { rx: -0.30, rz: 0 }, wrist: { rx: 0, ry: 0, rz: 0 } },
        { root: { rx: -0.10, ry: 0, rz: -1.00 }, joint: { rx: -1.06, rz: 0.50 }, wrist: { rx: 0.62, ry: -0.22, rz: 0.21 } },
    ],
    legs: [
        { root: { rx: -0.30, rz: 0.20 }, joint: { rx: 0.15 } },
        { root: { rx: 0.35, rz: -0.22 }, joint: { rx: 0.50 } },
    ],
    swordTiltX: 0.86,
};

// ポーズ定義（「ドラゴンバスター」勇者アニメ向けプリセット／ポーズ格納庫＝GLBクリップ化される）
// 各値は rotation (x=Pitch, y=Yaw, z=Roll) in radians
// arms[0]=左腕(盾側), arms[1]=右腕(剣側) / legs[0]=左脚, legs[1]=右脚
// root=肩/股関節, joint=肘/膝
// ※ 数値の実体は上の POSE_xxx 定数側にあり、ここではラベルを付けて展開するだけ
//   （複数ポーズで1アニメーションを構成するものは、名前に工程を添えて分けている）
const POSES = [
    { label: '😊 待機',                     ...POSE_IDLE },
    { label: '🏃 疾走・右足着地',           ...POSE_SPRINT_A },
    { label: '🏃 疾走・中間（両足そろう）', ...POSE_SPRINT_MID },
    { label: '🏃 疾走・左足着地',           ...POSE_SPRINT_B },
    { label: '⚔️ 大剣構え',                 ...POSE_GS_READY },
    { label: '⚔️ 大剣攻撃・振りかぶり',     ...POSE_GS_WINDUP },
    { label: '⚔️ 大剣攻撃・斬り下ろし',     ...POSE_GS_SLASH },
    { label: '🦘 ジャンプ・しゃがみ',       ...POSE_JUMP_CROUCH },
    { label: '🦘 ジャンプ・空中',           ...POSE_JUMP_AIR },
    { label: '✨ 魔法・構え',                ...POSE_MAGIC_RAISE },
    { label: '✨ 魔法・発動',                ...POSE_MAGIC_CAST },
    { label: '😵 ダメージ',                  ...POSE_DAMAGE },
    { label: '🏆 勝利',                      ...POSE_VICTORY },
    { label: '🌾 鍬を振り上げる',            ...POSE_HOE_WINDUP },
    { label: '🌾 鍬を振り下ろす',            ...POSE_HOE_SLASH },
    { label: '🔪 ナイフを振り上げる',        ...POSE_KNIFE_RAISE },
    { label: '🔪 ナイフを振り下ろす',        ...POSE_KNIFE_SLASH },
    { label: '🎒 カバンで受ける',            ...POSE_BAG_CATCH },
    { label: '💧 ジョウロを正面高く構える',  ...POSE_WATERINGCAN_FRONT_HIGH },
    { label: '💧 ジョウロを右高く構える',    ...POSE_WATERINGCAN_RIGHT_HIGH },
    { label: '💧 ジョウロを左高く構える',    ...POSE_WATERINGCAN_LEFT_HIGH },
    // 🎣 釣り竿（★必ず末尾に追加：既存ポーズの番号・動画シーケンスの参照先をずらさないため）
    // 名前の【　】内は、キャラタブの「釣り竿の状態」で選ぶことをおすすめする曲がり状態
    // （曲がり状態はポーズでは自動切替しない）。ラベルは初期プリセットのID(default:ラベル)とGLBのクリップ名になるので、
    // 重複させず、「絵文字＋半角スペース＋名前」の形を保つこと。
    { label: '🎣 釣り1 ふりかぶり【まっすぐ】',       ...POSE_FISHING_BACKSWING },
    { label: '🎣 釣り2 振り下ろし【まっすぐ】',       ...POSE_FISHING_FORWARD },
    { label: '🎣 釣り3 ゆっくりひく【少し曲がる】',   ...POSE_FISHING_REELING },
    { label: '🎣 釣り4 あたり【大きく曲がる】',       ...POSE_FISHING_BITE },
    { label: '🎣 釣り5 竿を右にふる【大きく曲がる】', ...POSE_FISHING_PULL_RIGHT },
    { label: '🎣 釣り6 竿を左にふる【大きく曲がる】', ...POSE_FISHING_PULL_LEFT },
    { label: '🎣 釣り7 釣り上げる【少し曲がる】',     ...POSE_FISHING_LANDED },
    // 🏹 弓（★必ず末尾に追加：既存ポーズの番号・動画シーケンスの参照先をずらさないため）
    // ラベルは初期プリセットのID(default:ラベル)とGLBのクリップ名になる。pose-slots.jsのBOW_POSE_STATESのキーと一致させること。
    { label: '🏹 弓・矢をつがえる構え',     ...POSE_BOW_NOCKED },
    { label: '🏹 弓を引き絞る構え',         ...POSE_BOW_DRAWN },
    { label: '🏹 矢を放った直後の構え',     ...POSE_BOW_RELEASED },
    // 🪓 斧で木を切る（★必ず末尾に追加：既存ポーズの番号・動画シーケンスの参照先をずらさないため）
    // ラベルは初期プリセットのID(default:ラベル)とGLBのクリップ名になる。重複させず、「絵文字＋半角スペース＋名前」の形を保つこと。
    // pose-slots.jsのDEFAULT_SLOT_PROPS / DEFAULT_SLOT_EXPRESSIONSのキーと一致させること。
    { label: '🪓 斧を振りかぶる',           ...POSE_AXE_WINDUP },
    { label: '🪓 斧を木に当てる',           ...POSE_AXE_HIT },
    { label: '🪓 斧をこじって引き抜く',     ...POSE_AXE_PRY },
    // 🌾 鍬で土をほぐす（★必ず末尾に追加：既存ポーズの番号・動画シーケンスの参照先をずらさないため）
    // 既存の「🌾 鍬を振り上げる」「🌾 鍬を振り下ろす」に続く3番目の鍬ポーズ。ラベルは初期プリセットのID(default:ラベル)とGLBのクリップ名になる。
    // pose-slots.jsのDEFAULT_SLOT_PROPS / DEFAULT_SLOT_EXPRESSIONSのキーと一致させること。
    { label: '🌾 鍬で土をほぐす',           ...POSE_HOE_TILL },
];

let currentPose = POSES[0];
let poseTarget  = null;   // 補間目標
let poseFrom    = null;   // 補間元
let poseT       = 1.0;    // 0→1 の補間進行度（1=完了）
const POSE_LERP_SPEED = 3.5; // 大きいほど速い

// 🎬 動画編集のテスト再生用：この区間だけ「所要時間(秒)」を明示指定し、
// 角度の進み方が一定になる線形補間(イージング無し)に切り替えるための上書き値。
// null のときは従来通り POSE_LERP_SPEED + smoothstep のイージング補間になる。
let poseLerpDurationOverride = null;

function lerp(a, b, t) { return a + (b - a) * t; }

// ポーズを補間適用する（animateから毎フレーム呼ぶ）
function tickPoseLerp(dt) {
    if (poseT >= 1.0 || !poseTarget || !poseFrom) return;
    const speed = poseLerpDurationOverride ? (1 / poseLerpDurationOverride) : POSE_LERP_SPEED;
    poseT = Math.min(poseT + dt * speed, 1.0);
    // 動画編集のテスト再生中（poseLerpDurationOverride指定時）は角度の進みを一定にしたいので
    // イージング無しの線形t。それ以外（通常のポーズ切替）は従来通りsmoothstepで滑らかにする。
    const t = poseLerpDurationOverride ? poseT : (poseT < 1 ? poseT * poseT * (3 - 2 * poseT) : 1);

    const p = animatedParts;
    if (!p.arms.length) return;

    // 頭：QuaternionをSLERPで補間して適用する。
    // （rx/ry/rzを個別にlerpする方式は、角度が大きい時にジンバルロック付近で
    //   不自然な軌道になることがあるため、球面線形補間に置き換えている）
    if (p.head) slerpBoneAngles(p.head, poseFrom.head, poseTarget.head, t);

    // 腕
    p.arms.forEach((arm, i) => {
        const f = poseFrom.arms[i], g = poseTarget.arms[i];
        slerpBoneAngles(arm.root,  f.root,  g.root,  t);
        slerpBoneAngles(arm.joint, f.joint, g.joint, t);
        slerpBoneAngles(arm.wrist, f.wrist, g.wrist, t);
    });
    // 脚
    p.legs.forEach((leg, i) => {
        const f = poseFrom.legs[i], g = poseTarget.legs[i];
        slerpBoneAngles(leg.root,  f.root,  g.root,  t);
        slerpBoneAngles(leg.joint, f.joint, g.joint, t);
    });
    // 右手の小道具（剣・大剣・鍬。持っている場合のみ）：ポーズごとのチルトをベース回転に加算
    if (p.sword) {
        const tiltFrom = poseFrom.swordTiltX ?? 0;
        const tiltTo   = poseTarget.swordTiltX ?? 0;
        const tilt = lerp(tiltFrom, tiltTo, t);
        p.sword.rotation.x = ACTIVE_PROP_BASE_ROTATION.x + tilt;
    }
    if (poseT >= 1.0 && window._poseEditApplyAfterPose) window._poseEditApplyAfterPose();
}

// 現在の Quaternion をスナップショット（rx/ry/rzのオイラー角相当に逆変換して従来の形式を維持）
function snapshotCurrentRotations() {
    const p = animatedParts;
    if (!p.arms.length) return null;
    // ボーンのQuaternionから前後(Pitch)/左右(Yaw)/ひねり(Roll)角度(ラジアン)を取り出すヘルパー
    const boneToAngles = (obj) => obj ? quaternionToAngles(obj.quaternion) : { rx: 0, ry: 0, rz: 0 };
    return {
        head: boneToAngles(p.head),
        arms: p.arms.map(arm => {
            const root = boneToAngles(arm.root), joint = boneToAngles(arm.joint), wrist = boneToAngles(arm.wrist);
            return {
                root:  { rx: root.rx,  ry: root.ry,  rz: root.rz  },
                joint: { rx: joint.rx, rz: joint.rz },
                wrist: { rx: wrist.rx, ry: wrist.ry, rz: wrist.rz },
            };
        }),
        legs: p.legs.map(leg => {
            const root = boneToAngles(leg.root), joint = boneToAngles(leg.joint);
            return {
                root:  { rx: root.rx, rz: root.rz },
                joint: { rx: joint.rx },
            };
        }),
        swordTiltX: p.sword ? (p.sword.rotation.x - ACTIVE_PROP_BASE_ROTATION.x) : 0,
    };
}

// ポーズを切り替える（補間開始）
// blendSeconds: 省略時は従来通りPOSE_LERP_SPEED+smoothstep。
//   数値を渡すと、その秒数で「角度の進みが一定」の線形補間に切り替わる
//   （🎬 動画編集のテスト再生から使用）。
window.applyPose = function(pose, blendSeconds) {
    currentPose = pose;
    poseFrom   = snapshotCurrentRotations() || pose;
    poseTarget = pose;
    poseT      = 0;
    poseLerpDurationOverride = (typeof blendSeconds === 'number' && blendSeconds > 0) ? blendSeconds : null;
    // degテーブルをこのポーズのスナップショット値に同期しておく
    if (window._poseEditSyncDeg && window.poseDefToSnapshot) {
        window._poseEditSyncDeg(window.poseDefToSnapshot(pose));
    }
};
