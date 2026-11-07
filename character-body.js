// ============================================================
// 小道具生成関数（剣・盾・鍬・ジョウロ・釣り竿・斧・収穫袋・弓）
// ------------------------------------------------------------
// ★重要：以前はcreateCharacter()の内部関数だったが、ポーズごとに
//   小道具を差し替える機能（applyCharacterProps、scene-textures.js）
//   からも呼び出す必要があるため、モジュールスコープ（外）に出した。
//   キャラのボディ形状など他のデータに依存しない独立した関数なので、
//   外に出しても動作は変わらない。
// ============================================================

// ── 小道具：剣（右手用） ──
// シンプルなプリミティブ（柄+鍔+刃）で構成した剣を1つのグループにまとめる
function createSword(scale = 1) {
    const sword = new THREE.Group();
    sword.name = 'swordRight';

    const handleMat = new THREE.MeshLambertMaterial({ color: 0x4a3320 }); // 柄：茶色
    const guardMat   = new THREE.MeshLambertMaterial({ color: 0xc8a020 }); // 鍔：金色
    const bladeMat   = new THREE.MeshLambertMaterial({ color: 0xd8dce0 }); // 刃：銀色

    // 柄（グリップ）：握り込む部分。wristのローカルY軸下方向に伸ばす
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12), handleMat);
    handle.position.set(0, 0, 0);
    sword.add(handle);

    // 鍔（ガード）：柄と刃の境目。幅広の大剣らしく横に張り出す
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.1), guardMat);
    guard.position.set(0, 0.215, 0);
    sword.add(guard);

    // 刃：鍔から上に伸びる、幅広で厚みのある刀身
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.045), bladeMat);
    blade.position.set(0, 0.98, 0);
    sword.add(blade);

    // 刃先（先端を尖らせる）：剣身と同じ幅・厚みの平たい三角形を押し出して作る（円錐だと槍のように見えるため）
    const tipWidth = 0.2;   // 刃の幅と同じ
    const tipHeight = 0.22;
    const tipThickness = 0.045; // 刃の厚みと同じ
    const tipShape = new THREE.Shape();
    tipShape.moveTo(-tipWidth / 2, 0);
    tipShape.lineTo(tipWidth / 2, 0);
    tipShape.lineTo(0, tipHeight);
    tipShape.closePath();
    const tipGeo = new THREE.ExtrudeGeometry(tipShape, { depth: tipThickness, bevelEnabled: false });
    tipGeo.translate(0, 0, -tipThickness / 2); // 厚みの中心を原点に合わせる
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.set(0, 1.73, 0);
    sword.add(tip);

    // scale!==1の場合、全体を一括拡大（大剣は通常の剣の2倍サイズ）
    if (scale !== 1) sword.scale.setScalar(scale);

    return sword;
}

// ── 小道具：盾（左手用） ──
// 丸型ファンタジーシールド：外枠リング＋本体＋中央ボス＋裏側グリップ
function createShield() {
    const shield = new THREE.Group();
    shield.name = 'shieldLeft';

    const rimMat  = new THREE.MeshLambertMaterial({ color: 0xd4af37 }); // 縁：金色
    const faceMat = new THREE.MeshLambertMaterial({ color: 0x3d5a99 }); // 面：青
    const bossMat = new THREE.MeshLambertMaterial({ color: 0xf0c94a }); // 中央ボス：金色

    // 外枠リング
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.08, 12, 24), rimMat);
    shield.add(rim);

    // シールド本体（厚みのある円盤）
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.1, 24), faceMat);
    face.rotation.x = Math.PI / 2;
    shield.add(face);

    // 中央ボス（半球状のふくらみ）
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), bossMat);
    boss.scale.z = 0.5;
    boss.position.z = 0.08;
    shield.add(boss);

    // 裏側グリップ（持ち手）
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 10), rimMat);
    grip.rotation.x = Math.PI / 2;
    grip.position.z = -0.06;
    shield.add(grip);

    return shield;
}

// ── 小道具：鍬（右手用） ──
// 添付の参考モデル「kuwa.html」（鍬の三面図を元にした単独のThree.jsビューア）の
// 形状をそのまま移植したもの：
//   ・柄：直径32mm×全長1500mmの1本の丸棒（continuous、途中で切れ目なし）
//   ・ソケット：直径44mm×高さ60mmの金属カラー
//   ・耳金具：幅150mm×奥行き40mm×厚み11mmの板（BoxGeometry）
//   ・刃：幅150mm、ソケットから前方180mm・下方180mmに湾曲して張り出す
//     ExtrudeGeometry（quadraticCurveToで側面図のカーブを再現）
// kuwa.html側の数値をmm()換算ヘルパー（1mm=0.002ユニット、既存の変換比率を踏襲）で
// そのままシーン単位に落とし込んでいる。
//
// ★座標系の変換について：
//   kuwa.htmlは単独ビューア用に「柄の下端(ワールドY=0、地面)からソケット(Y=1430mm)へ
//   向かって+Y」という向きで作られていた。一方この鍬はwrist（手首）の子として付ける
//   小道具なので、「+Yが上＝腕側、-Yが下＝刃側（地面側）」という逆の規約
//   （createSwordと共通）に合わせる必要がある。
//   そこで「握り位置＝柄の下端から550mm」（＝旧版のaboveGrip=1.10と同じ値を踏襲。
//   握りより上に飛び出す柄の長さは変更しない）に固定し、
//   local Y = mm(GRIP_FROM_END_MM − kuwaY) という式でkuwa.html側のY座標を
//   変換して配置し直している（グリップ基準への平行移動＋上下の符号反転）。
//   刃のShape（quadraticCurveToで作る湾曲プロファイル）も、この符号反転に合わせて
//   Y成分をすべて反転させた値をmm()に渡している。
//   ※握り位置を変えたい場合はGRIP_FROM_END_MMの値だけ調整すればよい。
function createHoe() {
    const hoe = new THREE.Group();
    hoe.name = 'hoeRight';

    // mm → シーン単位 変換（kuwa.htmlの数値をそのままコードに落とし込むためのヘルパー）
    // ★鍬全体を2倍サイズに変更：換算比率を0.002→0.004に。握り位置は原点（Y=0）のままなので
    //   握った位置を基準に、柄・ソケット・耳金具・刃のすべてが均等に2倍へ拡大される。
    const mm = (v) => v * 0.004;

    // kuwa.html側のワールドY（柄下端=0mm）→ 本ツールのローカルY（握り=0、+Yが上/-Yが刃側）
    const GRIP_FROM_END_MM = 550; // 握り位置：柄下端から550mm（旧版のaboveGrip=1.10を踏襲）
    const localY = (kuwaY) => mm(GRIP_FROM_END_MM - kuwaY);

    const woodMat  = new THREE.MeshLambertMaterial({ color: 0xaa7744 }); // 柄：木の色（kuwa.html準拠）
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x4a4a4a }); // ソケット・耳金具・刃：鉄色（kuwa.html準拠）

    // ── 柄（1本の丸棒。全長1500mm・直径32mm、途中で切れ目なし） ──
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(mm(16), mm(16), mm(1500), 12), woodMat);
    handle.position.y = localY(750); // kuwa.html：柄の中心Y=750mm
    hoe.add(handle);

    // ── ソケット（刃の付け根の金属カラー。直径44mm×高さ60mm） ──
    const SOCKET_KUWA_Y = 1430; // kuwa.html：柄下端からソケット中心までの距離
    const socket = new THREE.Mesh(
        new THREE.CylinderGeometry(mm(22), mm(22), mm(60), 12), metalMat);
    socket.position.y = localY(SOCKET_KUWA_Y);
    hoe.add(socket);

    // ── 耳金具（上面図の板。幅150mm×高さ20mm×奥行き40mm） ──
    const shoulder = new THREE.Mesh(
        new THREE.BoxGeometry(mm(150), mm(20), mm(40)), metalMat);
    shoulder.position.set(0, localY(SOCKET_KUWA_Y), mm(15)); // 少し前方にずらす（kuwa.html準拠）
    hoe.add(shoulder);

    // ── 刃本体（側面図のカーブに沿って押し出し。幅150mm・前方180mm×下方180mmの張り出し） ──
    // kuwa.html原本のShapeはY値が「ソケットから見て下方向がマイナス」だったが、
    // 本ツールは座標系の上下が逆（-Yが刃側）なので、Y成分をすべて反転させて移植する。
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(mm(0), mm(-8));
    bladeShape.quadraticCurveTo(mm(120), mm(-5), mm(180), mm(180));
    bladeShape.lineTo(mm(176), mm(180));
    bladeShape.quadraticCurveTo(mm(100), mm(20), mm(0), mm(8));
    bladeShape.lineTo(mm(0), mm(-8));

    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
        depth: mm(150), // 刃の幅（kuwa.htmlの正面図150mm）
        bevelEnabled: true,
        bevelThickness: mm(1),
        bevelSize: mm(1),
        bevelSegments: 2,
        steps: 4,
    });
    bladeGeo.translate(0, 0, -mm(150) / 2); // 押し出したジオメトリの中心を合わせる

    const blade = new THREE.Mesh(bladeGeo, metalMat);
    // ShapeのX軸（前方張り出し）をワールドZ軸に、押し出し方向（Z軸＝幅）をワールドX軸に
    // 向けるための回転（kuwa.html準拠）
    blade.rotation.y = Math.PI / 2;
    blade.position.set(0, localY(SOCKET_KUWA_Y), mm(20));
    hoe.add(blade);

    return hoe;
}

// ── 小道具：斧（右手用） ──
// 木を切る用途の一般的な手斧（全長700mm）。木の柄と金属の頭部（ポール／ソケット／刃）を
// 別マテリアルで作る。外部画像・外部モデルには依存せず、createHoeと同じmm()換算
// （1mm=0.002ユニット）とプリミティブ（Cylinder/Box/Extrude）だけで構成している。
//
// ★座標規約（鍬・剣と共通）：
//   ・原点＝握りの中心（wrist=手首の球の中心に柄が通る）。柄はローカルY軸方向。
//   ・+Yが頭部側（斧の刃がある側）、-Yが柄尻側。
//   ・刃先（エッジ）はローカル+Z方向（wristの「前方」＝鍬の刃と同じ向き）を向く。
//   ・頭部は柄の先端に取り付け、刃は柄に対して横向き（刃の面がYZ平面）に広がる。
//   装備時の基準回転はAXE_BASE_ROTATION（scene-textures.js）。
//   ※握り位置を変えたい場合はGRIP_FROM_BUTT_MMの値だけ調整すればよい。
const AXE_SCALE = 4; // 斧の拡大率（基準サイズの4倍）
function createAxe() {
    const axe = new THREE.Group();
    axe.name = 'axeRight';

    const mm = (v) => v * 0.002; // createHoeと同じ換算比率

    // 柄尻(0mm)からの距離 → 本ツールのローカルY（握り=0、+Yが頭部側）
    const GRIP_FROM_BUTT_MM = 230; // 握り位置：柄尻から230mm
    const localY = (buttY) => mm(buttY - GRIP_FROM_BUTT_MM);

    const woodMat  = new THREE.MeshLambertMaterial({ color: 0x8b5a2b }); // 柄：木の色
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x9aa3ab }); // 頭部：鋼の色

    // ── 柄（1本の丸棒。全長700mm、柄尻がやや太い） ──
    const HANDLE_LEN_MM = 700;
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(mm(16), mm(19), mm(HANDLE_LEN_MM), 12), woodMat); // 上半径, 下半径
    handle.position.y = localY(HANDLE_LEN_MM / 2);
    axe.add(handle);

    // ── 柄尻のふくらみ（すっぽ抜け防止の握り止め） ──
    const knob = new THREE.Mesh(new THREE.SphereGeometry(mm(24), 10, 8), woodMat);
    knob.scale.y = 0.7;
    knob.position.y = localY(0);
    axe.add(knob);

    // ── 頭部（柄の先端側に取り付け）。頭部中心＝柄尻から610mm ──
    const HEAD_Y_MM = 610;
    const headY = localY(HEAD_Y_MM);

    // ソケット（柄を包む金属ブロック。柄より一回り太い）
    const socket = new THREE.Mesh(new THREE.BoxGeometry(mm(44), mm(90), mm(54)), metalMat);
    socket.position.set(0, headY, 0);
    axe.add(socket);

    // ポール（頭部の背側＝刃と反対側のおもり。ローカル-Z方向）
    const poll = new THREE.Mesh(new THREE.BoxGeometry(mm(40), mm(70), mm(40)), metalMat);
    poll.position.set(0, headY, -mm(46));
    axe.add(poll);

    // 刃：側面（YZ平面）の輪郭を押し出した板。刃先がローカル+Z側で、上下に広がる斧らしい輪郭。
    // shapeのx＝前方（+Z）への距離、y＝頭部中心からの上下。
    const BLADE_T_MM = 16; // 刃の厚み（横方向＝ローカルX）
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(mm(20),  mm(42));   // 付け根・上
    bladeShape.lineTo(mm(100), mm(95));   // 刃の上端（前方へ広がる）
    bladeShape.lineTo(mm(112), mm(0));    // 刃先の中央（わずかに丸く突き出す）
    bladeShape.lineTo(mm(100), -mm(95));  // 刃の下端
    bladeShape.lineTo(mm(20),  -mm(42));  // 付け根・下
    bladeShape.closePath();
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: mm(BLADE_T_MM), bevelEnabled: false });
    bladeGeo.translate(0, 0, -mm(BLADE_T_MM) / 2); // 厚みの中心を原点に合わせる
    bladeGeo.rotateY(-Math.PI / 2);                // shapeのx→ローカル+Z、押し出し方向→ローカルX
    const blade = new THREE.Mesh(bladeGeo, metalMat);
    blade.position.set(0, headY, 0);
    axe.add(blade);

    // 全体を一括拡大（握り位置＝原点は変わらない）。大きさを変えたい場合はこの値だけ調整する
    axe.scale.setScalar(AXE_SCALE);

    return axe;
}

// ── 小道具：ジョウロ（右手用） ──
// 添付の参考モデル「water_can.html」（ジョウロの三面図的な形状を元にした
// 単独のThree.jsビューア、単位：mm）の形状をそのまま移植したもの。
// mm→シーン単位の変換はcreateHoeと同じ換算比率（1mm=0.002ユニット）を踏襲する。
//
// ★座標系の変換について：
//   water_can.html側は「本体の底面がワールドY=0（地面）、そこから上に向かって
//   +Y」という向きで作られていた（本体は高さ150mm、取っ手の頂点がY=240mmで
//   モデル中最も高い）。実際に右手で握るのは取っ手の頂点付近なので、
//   「取っ手の頂点＝ローカルY=0（wristの握り位置）」となるよう平行移動して
//   配置し直している。
//   ★createHoeとの違い：kuwa.htmlは「+Yが刃（＝地面に向ける側）」という
//   逆向きの規約だったためY成分の符号反転が必要だったが、water_can.htmlは
//   +Yがそのまま握り側（取っ手の頂点）へ向かう方向なので符号反転は不要。
//   本体・注ぎ口など「ぶら下がる側」の部品はすべて取っ手の頂点より下（＝
//   ローカルYが負）に来るため、収穫用手さげ袋と同じ「丸ごと握りの下に
//   ぶら下がる」構造になる。
//   local Y = mm(canY − GRIP_Y_MM) で変換して配置している。
//   注ぎ口はwater_can.html側でローカルX方向（横）に伸びているため、
//   装備時にWATERING_CAN_BASE_ROTATION（scene-textures.js側、Y軸-90°）で
//   正面（wristローカルのZ+方向。鍬の刃と同じ「前方」の向き）を向くように
//   回転させる。
function createWateringCan() {
    const can = new THREE.Group();
    can.name = 'wateringCanRight';

    // mm → シーン単位 変換（createHoeと同じ換算比率を踏襲）
    const mm = (v) => v * 0.002;

    // water_can.html側のワールドY（取っ手の頂点=240mm）→ 本ツールのローカルY（握り=0）
    const GRIP_Y_MM = 240; // 握り位置：取っ手の頂点（water_can.html側のワールドY）
    const localY = (canY) => mm(canY - GRIP_Y_MM);

    // water_can.html準拠：全パーツ共通のくすんだ緑（DoubleSide＝本体が上面の
    // 開いた筒状のため、内側からも面が見えるようにする。収穫袋と同じ理由）
    const canMat = new THREE.MeshLambertMaterial({ color: 0x6e8e75, side: THREE.DoubleSide });

    // ── 本体（筒状の部分。上面は開いたまま＝底面のみ別メッシュで塞ぐ） ──
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(mm(90), mm(90), mm(150), 24, 1, true), canMat);
    body.position.y = localY(75); // water_can.html：本体の中心Y=75mm
    can.add(body);

    // ── 底面の板 ──
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(mm(90), 24), canMat);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = localY(0);
    can.add(bottom);

    // ── 側面の3本のライン（補強のリブ） ──
    [20, 75, 140].forEach(h => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(mm(90), mm(1.5), 8, 24), canMat);
        ring.position.y = localY(h);
        ring.rotation.x = Math.PI / 2;
        can.add(ring);
    });

    // ── 注ぎ口（パイプ部分） ──
    // water_can.html側のXY平面上の座標（本体側面から斜め上に伸びるパイプ）。
    // 角度・長さは差分ベクトルから求めるため、mm変換前の生の値のまま計算してよい
    // （平行移動・一様スケールのどちらも角度には影響しないため）。
    const spoutBase = { x: 85, y: 25 };
    const spoutTip  = { x: 310, y: 145 };
    const dx = spoutTip.x - spoutBase.x;
    const dy = spoutTip.y - spoutBase.y;
    const spoutLen = Math.sqrt(dx * dx + dy * dy);
    const spoutAngle = Math.atan2(dy, dx);

    const spout = new THREE.Mesh(
        new THREE.CylinderGeometry(mm(10), mm(18), mm(spoutLen), 16), canMat);
    spout.position.set(mm(spoutBase.x + dx / 2), localY(spoutBase.y + dy / 2), 0);
    spout.rotation.z = spoutAngle - Math.PI / 2;
    can.add(spout);

    // 補強用の水平の棒（本体側面から注ぎ口を支える）
    const supportY = 100;
    const t = (supportY - spoutBase.y) / dy;
    const supportTipX = spoutBase.x + t * dx;
    const supportLen = supportTipX - 90;
    const support = new THREE.Mesh(
        new THREE.CylinderGeometry(mm(2), mm(2), mm(supportLen), 8), canMat);
    support.position.set(mm(90 + supportLen / 2), localY(supportY), 0);
    support.rotation.z = Math.PI / 2;
    can.add(support);

    // ── ハス口（シャワーヘッド） ──
    const roseHeight = 25;
    const rose = new THREE.Mesh(
        new THREE.CylinderGeometry(mm(35), mm(12), mm(roseHeight), 20), canMat);
    const roseOffsetX = Math.cos(spoutAngle) * roseHeight / 2;
    const roseOffsetY = Math.sin(spoutAngle) * roseHeight / 2;
    rose.position.set(mm(spoutTip.x + roseOffsetX), localY(spoutTip.y + roseOffsetY), 0);
    rose.rotation.z = spoutAngle - Math.PI / 2;
    can.add(rose);

    // ハス口の穴（水が出る面。Canvasで水玉模様のテクスチャを生成し貼り付ける）
    const holeCanvas = document.createElement('canvas');
    holeCanvas.width = 128; holeCanvas.height = 128;
    const hctx = holeCanvas.getContext('2d');
    hctx.fillStyle = '#d4c79e';
    hctx.fillRect(0, 0, 128, 128);
    hctx.fillStyle = '#222222';
    for (let i = 0; i < 60; i++) {
        const r = Math.sqrt(Math.random()) * 55;
        const theta = Math.random() * Math.PI * 2;
        hctx.beginPath();
        hctx.arc(64 + r * Math.cos(theta), 64 + r * Math.sin(theta), 2, 0, Math.PI * 2);
        hctx.fill();
    }
    const roseTex = new THREE.CanvasTexture(holeCanvas);
    const roseFaceMat = new THREE.MeshLambertMaterial({ map: roseTex });
    const roseFace = new THREE.Mesh(new THREE.CircleGeometry(mm(35), 20), roseFaceMat);
    const roseFaceOffsetX = Math.cos(spoutAngle) * roseHeight;
    const roseFaceOffsetY = Math.sin(spoutAngle) * roseHeight;
    roseFace.position.set(mm(spoutTip.x + roseFaceOffsetX), localY(spoutTip.y + roseFaceOffsetY), 0);
    // 向きはパイプの角度spoutAngleに合わせる（位置を基準に、その方向へのlookAtで
    // 求める＝mm変換後の座標系でも方向ベクトルはそのまま使える）
    roseFace.lookAt(
        roseFace.position.x + Math.cos(spoutAngle),
        roseFace.position.y + Math.sin(spoutAngle),
        roseFace.position.z
    );
    can.add(roseFace);

    // ── 取っ手（ハンドル） ──
    const handlePoints = [
        [-91, 50], [-91, 140], [-60, 230], [0, 240], [60, 210], [85, 150],
    ].map(([x, y]) => new THREE.Vector3(mm(x), localY(y), 0));
    const handleCurve = new THREE.CatmullRomCurve3(handlePoints);
    const handle = new THREE.Mesh(
        new THREE.TubeGeometry(handleCurve, 48, mm(5), 8, false), canMat);
    handle.scale.set(1, 1, 2.5); // water_can.html準拠：奥行き方向に楕円状に潰す
    can.add(handle);

    // ローカル原点(0,0,0)＝取っ手の頂点（握り位置）なので、この位置を基準に
    // 全体を2倍にすると、握り位置はそのままでジョウロ本体だけが大きくなる
    // （createSwordの大剣スケーリングと同じ考え方）
    can.scale.setScalar(2);

    return can;
}

// ── 小道具：釣り竿（右手用） ──
// 3状態（まっすぐ／少し曲がる／大きく曲がる）の竿を、同じ関数・同じ寸法から生成する。
// bend: 'straight' | 'slight' | 'big'（未知の値は'straight'扱い）
//
// ★3状態で「完全に同一」にしているもの（＝切り替えても手からずれない根拠）：
//   ・ローカル原点(0,0,0)＝握り（グリップ）の中心。createSwordの柄と同じ規約。
//   ・グリップ／リール／竿の根元の位置・太さ・色・長さは全状態で共通（このグリップ側は
//     bendに一切依存しない）。
//   ・竿は握りの上端(y=ROD_START_Y)から+Y方向へ伸びる。根元の接線は常に+Y（曲がり角0）。
// ★状態ごとに違うのは「竿先側の曲がり角」だけ：
//   根元から竿の約25%地点までは直線で、それより先に向かって曲がり角が滑らかに増え、
//   竿先で最大になる（釣り竿が魚に引かれた時のしなり方）。
//   曲がる向きはローカル-X方向（SWORD_BASE_ROTATION基準の持ち方では、竿先が
//   手首の-Y方向＝「下（水面側）」へしなる向き）。
//
// 形状は単一のBufferGeometry（テーパー付きチューブ）で作るため、曲げても継ぎ目が出ない。
const FISHING_ROD_BEND_ANGLES = { straight: 0, slight: 0.45, big: 1.15 }; // 竿先の曲がり角(rad)
function normalizeFishingRodBend(v) {
    return (v === 'slight' || v === 'big') ? v : 'straight';
}
function createFishingRod(bend) {
    const rod = new THREE.Group();
    rod.name = 'fishingRodRight';
    const bendKey = normalizeFishingRodBend(bend);
    const tipAngle = FISHING_ROD_BEND_ANGLES[bendKey];

    // ── 寸法（全状態共通） ──
    const GRIP_HALF   = 0.30;   // グリップの半分の長さ（原点を中心に±0.30）
    const GRIP_R      = 0.05;   // グリップの半径
    const ROD_START_Y = GRIP_HALF;      // 竿本体の根元（グリップ上端）
    const ROD_LEN     = 2.9;    // 竿本体の長さ（曲げても弧長は同じ）
    const R_BASE      = 0.040;  // 竿の根元の半径
    const R_TIP       = 0.010;  // 竿先の半径
    const STRAIGHT_RATIO = 0.25; // 根元からこの割合までは曲げない
    const SEGMENTS    = 28;     // 長さ方向の分割数
    const RADIAL      = 10;     // 円周方向の分割数

    const gripMat = new THREE.MeshLambertMaterial({ color: 0x8a5a32 }); // グリップ：コルク風の茶色
    const rodMat  = new THREE.MeshLambertMaterial({ color: 0x2f4858 }); // 竿：濃い青緑
    const reelMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a8 }); // リール：銀灰色
    const seatMat = new THREE.MeshLambertMaterial({ color: 0x555b63 }); // リールシート：濃い灰色

    // ── グリップ（握り部分） ──
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(GRIP_R, GRIP_R, GRIP_HALF * 2, 12), gripMat);
    grip.position.set(0, 0, 0);
    rod.add(grip);

    // ── リールシート＋リール（グリップ上寄りの-X側＝竿の曲がる側と同じ向きに付ける） ──
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(GRIP_R * 1.15, GRIP_R * 1.15, 0.16, 12), seatMat);
    seat.position.set(0, GRIP_HALF - 0.02, 0);
    rod.add(seat);
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 16), reelMat);
    reel.rotation.x = Math.PI / 2; // 円盤の軸をローカルZ方向にそろえる（側面から見て円形）
    reel.position.set(-0.14, GRIP_HALF - 0.02, 0);
    rod.add(reel);
    const reelArm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.04), seatMat);
    reelArm.position.set(-0.05, GRIP_HALF - 0.02, 0);
    rod.add(reelArm);

    // ── 竿本体の中心線（XY平面内の曲線）を、曲がり角を積分して作る ──
    // 接線角θ(u)：u=0..1（竿の弧長の割合）。STRAIGHT_RATIOまでは0、その先は
    // 滑らかに増えて竿先(u=1)でtipAngleになる。接線は(-sinθ, cosθ)＝-X側に曲がる。
    const pts = [];    // 中心線上の点
    const radii = [];  // 各点での半径
    let x = 0, y = ROD_START_Y;
    const ds = ROD_LEN / SEGMENTS;
    for (let i = 0; i <= SEGMENTS; i++) {
        pts.push(new THREE.Vector3(x, y, 0));
        radii.push(R_BASE + (R_TIP - R_BASE) * (i / SEGMENTS));
        // 区間[i, i+1]の中点での接線角で次の点へ進む
        const um = (i + 0.5) / SEGMENTS;
        const k = Math.max(0, (um - STRAIGHT_RATIO) / (1 - STRAIGHT_RATIO));
        const theta = tipAngle * Math.pow(k, 1.8);
        x += -Math.sin(theta) * ds;
        y +=  Math.cos(theta) * ds;
    }

    // ── テーパー付きチューブのジオメトリを手で組む（曲線はXY平面内なので法線は簡単に決まる） ──
    const positions = [];
    const indices = [];
    for (let i = 0; i <= SEGMENTS; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(SEGMENTS, i + 1)];
        const tx = b.x - a.x, ty = b.y - a.y;
        const tl = Math.hypot(tx, ty) || 1;
        const nx = -ty / tl, ny = tx / tl; // XY平面内の法線（接線を90°回転）
        for (let j = 0; j < RADIAL; j++) {
            const ang = (j / RADIAL) * Math.PI * 2;
            const c = Math.cos(ang) * radii[i], sn = Math.sin(ang) * radii[i];
            positions.push(pts[i].x + nx * c, pts[i].y + ny * c, sn); // 断面：法線方向とZ方向
        }
    }
    for (let i = 0; i < SEGMENTS; i++) {
        for (let j = 0; j < RADIAL; j++) {
            const j2 = (j + 1) % RADIAL;
            const a = i * RADIAL + j, b = i * RADIAL + j2;
            const c = (i + 1) * RADIAL + j, d = (i + 1) * RADIAL + j2;
            indices.push(a, b, c, b, d, c); // 外向きが表面になる巻き順（法線＝円周方向×長さ方向）
        }
    }
    const rodGeo = new THREE.BufferGeometry();
    rodGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    rodGeo.setIndex(indices);
    rodGeo.computeVertexNormals();
    const blank = new THREE.Mesh(rodGeo, rodMat);
    blank.name = 'fishingRodBlank';
    rod.add(blank);

    // ── 竿先（先端の小さな玉。将来、釣り糸を付ける位置の目印にもなる） ──
    const tipPoint = pts[SEGMENTS];
    const tipBall = new THREE.Mesh(new THREE.SphereGeometry(R_TIP * 1.4, 8, 8), reelMat);
    tipBall.name = 'fishingRodTip';
    tipBall.position.copy(tipPoint);
    rod.add(tipBall);

    return rod;
}

// ── 小道具：和弓（左手用） ──
// 日本の弓道の和弓を参考にした縦型の長弓。握りが全長の約1/3の位置にある（上が長く下が短い）。
// ★弓の曲がりはボーン変形ではなく「完成済みの3状態モデルの切り替え」で表現する：
//   'nocked'   … 矢をつがえた状態（まだ引いていない。弦は通常位置・矢あり）
//   'drawn'    … 引き絞った状態（弓が大きくしなり、弦は手前に引かれ、矢あり）
//   'released' … 放った直後（弓・弦は通常の形に戻る。矢は出さない）
// ローカル座標：原点＝左手首の握り位置（盾・収穫袋と同じ規約）。弓の上端が+Y、下端が-Y、
// 矢の飛ぶ向き（前方）が+Z、弦は握りより-Z側（射手側）にある。
// 3状態とも同じ握り位置・同じ縮尺・同じ向きで作るので、状態を切り替えても左手の握りはずれない。
const BOW_STATES = ['nocked', 'drawn', 'released'];
function normalizeBowState(v) {
    return BOW_STATES.indexOf(v) >= 0 ? v : 'nocked';
}
const BOW_DIM = {
    upperLen: 2.4,    // 握り中心から上端までの弧長
    lowerLen: 1.2,    // 握り中心から下端までの弧長
    gripHalf: 0.26,   // 握り（曲がらない部分）の半分の長さ
    braceRest: 0.22,  // 通常状態の「握りから弦までの距離」
    nockY: 0.12,      // 矢をつがえる高さ（握り中心より少し上）
    arrowX: -0.105,   // 矢の横位置（握りの横を通る。-X＝体の中心側）
    drawLen: 1.2,     // 引き絞った時の「握りから矢の後端までの距離」
    arrowLen: 1.55,   // 矢の全長（引き絞り時に矢尻が握りの少し先に出る長さ）
    steps: 40,        // 弓の曲線の分割数
};
// 曲率の分布（u=0:握り側〜1:弓の先）。先端付近はわずかに反り返らせる
function bowCurvatureWeight(u) {
    const k = Math.min(1, Math.max(0, (u - 0.80) / 0.20));
    return 1 - 1.6 * k * k * (3 - 2 * k);
}
// 握りから片側の弓の中心線を作る。戻り値は {y, z} の配列（zがマイナス＝射手側へ曲がる）
function bowLimbCurve(len, gain) {
    const n = BOW_DIM.steps, ds = len / n;
    const pts = [{ y: 0, z: 0 }];
    let y = 0, z = 0, th = 0;
    for (let i = 0; i < n; i++) {
        const u = ((i + 0.5) * ds - BOW_DIM.gripHalf) / (len - BOW_DIM.gripHalf);
        const kappa = u <= 0 ? 0 : gain * bowCurvatureWeight(u);
        const thMid = th + kappa * ds * 0.5;
        y += Math.cos(thMid) * ds;
        z -= Math.sin(thMid) * ds;
        th += kappa * ds;
        pts.push({ y: y, z: z });
    }
    return pts;
}
// 先端のzが targetTipZ になる曲率ゲインを二分探索で求める
function bowSolveGain(len, targetTipZ) {
    let lo = 0, hi = 1.4 / (len - BOW_DIM.gripHalf); // この範囲では単調（曲がりすぎて巻き込まない）
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        const c = bowLimbCurve(len, mid);
        if (c[c.length - 1].z > targetTipZ) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}
// 弓の基本形（通常状態）と、引き絞り時のしなり倍率を一度だけ計算して使い回す。
// 弦の長さは不変なので、矢の後端を drawLen まで引いた時に弦の長さが変わらないしなり倍率を求める。
let _bowShapeCache = null;
function getBowShape() {
    if (_bowShapeCache) return _bowShapeCache;
    const D = BOW_DIM;
    const gainUpper = bowSolveGain(D.upperLen, -D.braceRest);
    const gainLower = bowSolveGain(D.lowerLen, -D.braceRest);
    const rU = bowLimbCurve(D.upperLen, gainUpper), rL = bowLimbCurve(D.lowerLen, gainLower);
    const stringLen = rU[D.steps].y + rL[D.steps].y;
    const nock = { y: D.nockY, z: -D.drawLen };
    const gap = (f) => {
        const u = bowLimbCurve(D.upperLen, gainUpper * f)[D.steps];
        const l = bowLimbCurve(D.lowerLen, gainLower * f)[D.steps];
        return Math.hypot(u.y - nock.y, u.z - nock.z) + Math.hypot(-l.y - nock.y, l.z - nock.z) - stringLen;
    };
    // 弦の経路長が一致する倍率を探す（粗く刻んで符号が変わる区間を見つけ、二分探索で詰める）
    let a = 1, b = 1;
    for (let f = 1.05; f <= 4; f += 0.05) { if (gap(f) <= 0) { b = f; a = f - 0.05; break; } }
    for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (gap(m) > 0) a = m; else b = m; }
    _bowShapeCache = { gainUpper: gainUpper, gainLower: gainLower, drawnScale: (a + b) / 2 };
    return _bowShapeCache;
}
function bowSegmentMesh(p0, p1, radius, mat) {
    const dir = new THREE.Vector3().subVectors(p1, p0);
    const len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6), mat);
    m.position.copy(p0).add(p1).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return m;
}
function createBowArrow() {
    const arrow = new THREE.Group();
    arrow.name = 'bowArrow';
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0xd9c58f });  // 矢の軸：竹色
    const headMat  = new THREE.MeshLambertMaterial({ color: 0xaeb4bc });  // 矢尻：鉄色
    const nockMat  = new THREE.MeshLambertMaterial({ color: 0x2b2420 });  // 筈（弦をかける部分）：黒
    const featherW = new THREE.MeshLambertMaterial({ color: 0xf2efe6, side: THREE.DoubleSide }); // 矢羽：白
    const featherB = new THREE.MeshLambertMaterial({ color: 0x2b2b30, side: THREE.DoubleSide }); // 矢羽：黒（1枚だけ色違い）
    const L = BOW_DIM.arrowLen, headLen = 0.16, shaftR = 0.022;
    // 矢の後端が原点、+Z方向が矢先
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftR, shaftR, L - headLen, 8), shaftMat);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0, (L - headLen) / 2);
    arrow.add(shaft);
    const nock = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.05, 8), nockMat);
    nock.rotation.x = Math.PI / 2;
    nock.position.set(0, 0, 0.025);
    arrow.add(nock);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.048, headLen, 8), headMat);
    head.rotation.x = Math.PI / 2; // 円錐の先を+Z（前方）へ向ける
    head.position.set(0, 0, L - headLen / 2);
    arrow.add(head);
    // 矢羽：軸のまわりに120°ずつ3枚（後端寄り）
    for (let i = 0; i < 3; i++) {
        const holder = new THREE.Group();
        holder.rotation.z = i * Math.PI * 2 / 3;
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.075, 0.32), i === 0 ? featherB : featherW);
        f.position.set(0, shaftR + 0.0375, 0.06 + 0.16);
        holder.add(f);
        arrow.add(holder);
    }
    return arrow;
}
function createBow(state) {
    const st = normalizeBowState(state);
    const D = BOW_DIM, shape = getBowShape(), n = D.steps;
    const mul = (st === 'drawn') ? shape.drawnScale : 1;
    const upper = bowLimbCurve(D.upperLen, shape.gainUpper * mul);
    const lower = bowLimbCurve(D.lowerLen, shape.gainLower * mul);

    const bow = new THREE.Group();
    bow.name = 'bowLeft';
    bow.userData.bowState = st;

    const bodyMat  = new THREE.MeshLambertMaterial({ color: 0x8a6a3a });  // 弓本体：竹・木の色
    const bandMat  = new THREE.MeshLambertMaterial({ color: 0x1c1612 });  // 籐の巻き：黒
    const gripMat  = new THREE.MeshLambertMaterial({ color: 0x3a2618 });  // 握りの革：濃い茶
    const tipMat   = new THREE.MeshLambertMaterial({ color: 0xe8dcc0 });  // 弓の先（弦輪をかける所）
    const stringMat = new THREE.MeshLambertMaterial({ color: 0xf0e8d0 }); // 弦：生成り

    // 下端→上端へ並べた1本の中心線（y,z）と、その各点での弓の幅・厚み
    const line = [];
    for (let i = n; i >= 1; i--) line.push({ y: -lower[i].y, z: lower[i].z, s: -lower[i].s });
    for (let i = 0; i <= n; i++) line.push({ y: upper[i].y, z: upper[i].z, s: upper[i].s });
    const total = line.length;
    // s（握りからの弧長）を各点に付ける（bowLimbCurveはyzだけ返すので等間隔で補う）
    line.forEach((p, i) => {
        p.s = (i < n) ? -(D.lowerLen * (n - i) / n) : (D.upperLen * (i - n) / n);
    });
    const widthAt = (s) => {
        const len = s < 0 ? D.lowerLen : D.upperLen;
        const t = Math.min(1, Math.abs(s) / len);
        return { wx: 0.078 - 0.038 * t, tz: 0.056 - 0.028 * t }; // 握り付近が太く先端ほど細い楕円断面
    };
    const RADIAL = 10, positions = [], indices = [];
    for (let i = 0; i < total; i++) {
        const a = line[Math.max(0, i - 1)], b = line[Math.min(total - 1, i + 1)];
        let ty = b.y - a.y, tz = b.z - a.z;
        const tl = Math.hypot(ty, tz) || 1; ty /= tl; tz /= tl;
        const w = widthAt(line[i].s);
        // 断面の基準軸：X（幅方向）と、曲線の面内で接線に直交する向き(0, tz, -ty)
        for (let j = 0; j < RADIAL; j++) {
            const ang = (j / RADIAL) * Math.PI * 2;
            const c = Math.cos(ang) * w.wx, sn = Math.sin(ang) * w.tz;
            positions.push(c, line[i].y + tz * sn, line[i].z - ty * sn);
        }
    }
    for (let i = 0; i < total - 1; i++) {
        for (let j = 0; j < RADIAL; j++) {
            const j2 = (j + 1) % RADIAL;
            const a = i * RADIAL + j, b = i * RADIAL + j2, c = (i + 1) * RADIAL + j, d = (i + 1) * RADIAL + j2;
            indices.push(a, b, c, b, d, c);
        }
    }
    const bodyGeo = new THREE.BufferGeometry();
    bodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    bodyGeo.setIndex(indices);
    bodyGeo.computeVertexNormals();
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.name = 'bowBody';
    bow.add(body);

    // 握り（革巻き）
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, D.gripHalf * 2, 12), gripMat);
    grip.name = 'bowGrip';
    bow.add(grip);

    // 籐の巻き（弓の見分けやすさのための黒い帯）。曲線上の弧長位置に置く
    const bandAt = [-0.95, -0.55, 0.55, 0.95, 1.4, 1.85, 2.25];
    bandAt.forEach((s) => {
        let idx = 0, bestD = 1e9;
        line.forEach((p, i) => { const d = Math.abs(p.s - s); if (d < bestD) { bestD = d; idx = i; } });
        const a = line[Math.max(0, idx - 1)], b = line[Math.min(total - 1, idx + 1)];
        const w = widthAt(line[idx].s);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.05, 12), bandMat);
        band.scale.set(w.wx + 0.012, 1, w.tz + 0.012);
        band.rotation.x = Math.atan2(b.z - a.z, b.y - a.y);
        band.position.set(0, line[idx].y, line[idx].z);
        bow.add(band);
    });

    // 弓の先（上端・下端）
    const tipU = line[total - 1], tipL = line[0];
    const knobU = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), tipMat);
    knobU.name = 'bowTipUpper';
    knobU.position.set(0, tipU.y, tipU.z);
    bow.add(knobU);
    const knobL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), tipMat);
    knobL.name = 'bowTipLower';
    knobL.position.set(0, tipL.y, tipL.z);
    bow.add(knobL);

    // 弦：矢があるとき（nocked/drawn）は、矢の後端の位置で弦が少し折れる。無い時（released）は真っ直ぐ
    const pU = new THREE.Vector3(0, tipU.y, tipU.z), pL = new THREE.Vector3(0, tipL.y, tipL.z);
    const hasArrow = (st !== 'released');
    const nockZ = (st === 'drawn') ? -D.drawLen : -D.braceRest;
    const strGroup = new THREE.Group();
    strGroup.name = 'bowString';
    if (hasArrow) {
        const pN = new THREE.Vector3(D.arrowX, D.nockY, nockZ);
        strGroup.add(bowSegmentMesh(pU, pN, 0.013, stringMat));
        strGroup.add(bowSegmentMesh(pN, pL, 0.013, stringMat));
    } else {
        strGroup.add(bowSegmentMesh(pU, pL, 0.013, stringMat));
    }
    bow.add(strGroup);

    // 矢（released では出さない＝GLBにも含まれない）
    if (hasArrow) {
        const arrow = createBowArrow();
        arrow.position.set(D.arrowX, D.nockY, nockZ);
        bow.add(arrow);
    }
    return bow;
}

// ── 小道具：収穫用手さげ袋（左手用） ──
// 添付の参考画像（布製トートバッグ風の手さげ袋）を元にした、軽量なセミローポリ模型。
// ・袋本体：LatheGeometry（断面を1回転させた形状）を使い、底が丸く閉じて上に向かって
//   少し広がる「膨らんだ袋」のシルエットを作る。さらにZ方向だけ非一様スケールすることで、
//   円柱ではなく楕円形（トートバッグらしい奥行きの浅い断面）にする。
//   口（開口部）は蓋を付けない＝Latheの端をそのまま開けておくことで「中が少し見える構造」になる。
// ・持ち手：TubeGeometry＋CatmullRomCurve3で、Y-Z平面上の半円状の経路を作りチューブ化した
//   単純なループを2本用意する（ポリゴン数を抑えるため分割数は少なめ）。
// ローカル座標は既存の左手小道具（盾）と同じく、原点(0,0,0)＝左手首(wrist)の握り位置。
// wristは+Yが上（腕側）・-Yが下（地面側）の規約（createHoe/createSwordと共通）なので、
// 持ち手を原点付近に、袋本体をそこから-Y方向（下）に垂らすだけで自然な向きになる。
function createHarvestBag() {
    const bag = new THREE.Group();
    bag.name = 'harvestBagLeft';

    const bagMat    = new THREE.MeshLambertMaterial({ color: 0xc9a875, side: THREE.DoubleSide }); // 袋本体：ベージュ〜薄茶（麻袋風）
    const rimMat    = new THREE.MeshLambertMaterial({ color: 0xa9835a }); // 口の縁取り：少し濃い色
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 }); // 持ち手：茶色

    // ── 袋本体 ──
    // 断面プロファイル（半径, 高さ）。高さ0＝底、上に行くほど半径が広がり、口で最大になる。
    // 底は半径をほぼ0にすることで丸く閉じ、口は最後の点で終わる＝開いたまま（蓋を付けない）。
    const bagMouthY = -0.08; // 開口部の高さ（原点＝左手首のすぐ下）
    const bagH      = 0.76;  // 袋の高さ（約0.7〜0.9の範囲内）
    const profile = [
        new THREE.Vector2(0.015, 0),
        new THREE.Vector2(0.26,  0.05),
        new THREE.Vector2(0.35,  0.16),
        new THREE.Vector2(0.37,  0.40),
        new THREE.Vector2(0.38,  0.62),
        new THREE.Vector2(0.40,  0.74),
        new THREE.Vector2(0.405, bagH),
    ];
    const bagGeo = new THREE.LatheGeometry(profile, 10);
    // Lathe生成直後は底が原点(0,0)・+Yが上向きになっているので、口がbagMouthYに来るよう平行移動する
    bagGeo.translate(0, bagMouthY - bagH, 0);
    const bagMesh = new THREE.Mesh(bagGeo, bagMat);
    bagMesh.scale.z = 0.55; // 奥行きを浅くして円柱ではなく楕円形の断面（横幅約0.8×奥行き約0.44）にする
    bag.add(bagMesh);

    // ── 口の縁取り（開口部の布の折り返しを表現する薄いリング） ──
    const rimGeo = new THREE.TorusGeometry(0.405, 0.02, 6, 16);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    // ★スケールはローカル軸に対して先に適用され、その後に回転がかかる（Three.jsのTRS合成順）。
    //   このリングは回転前は自身のローカルXY平面に横たわっているため、回転後に「奥行き」に
    //   なるのはローカルY軸（rotation.xで90°回すとY→Z軸に写る）。よって楕円化はscale.yで行う
    //   （scale.zにすると輪っかの太さ方向が潰れてしまい意図と違う見た目になる）。
    rimMesh.scale.y = 0.55; // 本体と同じ楕円比率に合わせる（奥行きを浅く）
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = bagMouthY;
    bag.add(rimMesh);

    // ── 持ち手（2本） ──
    // 口の縁の前後2点から、半円状に持ち上がって反対側の縁へ戻るループ。
    // 左右（X方向）にオフセットした2本を並べる（添付の手さげ袋と同じ構図）。
    function buildHandle(offsetX) {
        const footZ = 0.115;          // 持ち手の両端（袋口に刺さる位置）の奥行きオフセット
        const footY = bagMouthY - 0.02; // 袋口よりわずかに下に刺さる（浮きを防ぐ）
        const apexY = 0.06;            // ループ頂点の高さ（手首原点よりやや上＝握りやすい位置）
        const segs = 8;
        const points = [];
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const z = footZ * (1 - 2 * t); // +footZ → -footZ
            const y = footY + (apexY - footY) * Math.sin(Math.PI * t); // 半円状に持ち上がる
            points.push(new THREE.Vector3(offsetX, y, z));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 12, 0.022, 6, false);
        return new THREE.Mesh(tubeGeo, handleMat);
    }
    bag.add(buildHandle(-0.16));
    bag.add(buildHandle(0.16));

    return bag;
}

function createCharacter(data) {
    // ★後方互換：古い保存データにtopWearが無い場合、shirtColorから推定する
    if (data.topWear === undefined) {
        data.topWear = (data.shirtColor && data.shirtColor !== 'none') ? 'shirt' : 'none';
    }
    // ★後方互換：旧メイド服（topWear==='maid'、股下まで伸びるワンピース）の
    //   値を新仕様のtopWear名（'maidTop'）へ変換する。
    //   bottomWearを'maidBottom'で補完するかどうかは「旧セーブデータに
    //   bottomWearが本当に存在しなかったか」をロード時の生データからしか
    //   正しく判定できないため（ここに渡ってくるdataは既定値でbottomWearが
    //   常に埋まっているため判定できない）、save-load-ui.js側の読み込み処理で
    //   まとめて行う。ここでは名前の変換のみを行う（他の呼び出し経路でも
    //   壊れないようにするための一般的な後方互換）。
    if (data.topWear === 'maid') {
        data.topWear = 'maidTop';
    }
    // ★後方互換：古い保存データにheadAccessoryが無い場合、hasHelmet(boolean)から推定する
    if (data.headAccessory === undefined) {
        data.headAccessory = data.hasHelmet ? 'helmet' : 'none';
    }
    if (characterGroup) {
        characterRotateWrapper.remove(characterGroup);
        disposeObject3D(characterGroup);
        characterGroup = null;
    }
    characterGroup = new THREE.Group();
    animatedParts = { arms: [], legs: [] };

    // ★ 位置変更：おにぎり型（卵型）を作る共通関数を、頭や耳の処理でも使えるように上に移動しました
    function createEggGeo(scaleX, scaleY, scaleZ, taperY) {
        const geo = new THREE.SphereGeometry(1, 32, 32);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
            let x = p.getX(i); let y = p.getY(i); let z = p.getZ(i);
            let taper = 1.0 - (y * taperY); 
            p.setX(i, x * scaleX * taper);
            p.setY(i, y * scaleY);
            p.setZ(i, z * scaleZ); 
        }
        geo.computeVertexNormals();
        return geo;
    }

    const skinMat = new THREE.MeshLambertMaterial({ color: data.bodyColor });
    const clothesMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const hairMat = new THREE.MeshLambertMaterial({ color: data.hairColor || '#333333' });

    // --- 頭 ---
    const headGeo = new THREE.SphereGeometry(1, 32, 32);
    const pos = headGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        if (y < 0) {
            let factor = 1.0 - (Math.abs(y) * (1.0 - data.jawWidth));
            pos.setX(i, pos.getX(i) * factor); 
            pos.setZ(i, pos.getZ(i) * factor + Math.abs(y) * 0.12); 
        }
    }
    headGeo.computeVertexNormals();
    const head = new THREE.Mesh(headGeo, skinMat);
    head.scale.set(data.headScaleX, data.headScaleY, data.headScaleX);
    // =============================================================
    // 首 → 頭 の順で構築（headPivot は neckPivot の子）
    // 構造: characterGroup → neckPivot → [首メッシュ群, headPivot → head]
    // neckPivotを回転すると首＋頭が一緒に動く
    // =============================================================

    // --- 首 ---
    const neckR = 0.27;
    const neckCylLen = neckR * 2 / 3; // 0.18
    const neckCylBottom = 2.42 + neckR; // 2.69 = 首の根元Y

    // neckPivot: 首の根元(y=2.69)を回転中心とする親グループ
    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, neckCylBottom, 0.03);
    characterGroup.add(neckPivot);
    animatedParts.neck = neckPivot;

    // 胸側半球（neckPivot相対 y=0 = 首の根元）
    const neckBottomGeo = new THREE.SphereGeometry(neckR, 16, 8);
    const neckBottom = new THREE.Mesh(neckBottomGeo, skinMat);
    neckBottom.position.set(0, 0, 0);
    neckPivot.add(neckBottom);

    // 円筒本体
    const neckCylGeo = new THREE.CylinderGeometry(neckR, neckR, neckCylLen, 16, 1, true);
    const neckCyl = new THREE.Mesh(neckCylGeo, skinMat);
    neckCyl.position.set(0, neckCylLen * 0.5, 0);
    neckPivot.add(neckCyl);

    // 頭側半球
    const neckCylTop = neckCylLen;
    const neckTopGeo = new THREE.SphereGeometry(neckR, 16, 8);
    const neckTop = new THREE.Mesh(neckTopGeo, skinMat);
    neckTop.position.set(0, neckCylTop, 0);
    neckPivot.add(neckTop);

    // --- 頭（neckPivotの子として追従） ---
    // headPivot は neckPivot 相対座標で、頭の中心位置に置く
    // neckPivot のワールド座標 y = 2.69、頭中心 y ≈ 2.87 + 0.70*scaleY
    const headBaseY = 2.87;
    const headRadius = 0.70;
    const headCenterWorld = headBaseY + headRadius * data.headScaleY;
    const headCenterLocal = headCenterWorld - neckCylBottom; // neckPivot相対Y

    // headPivot: neckPivotの子、頭の中心を回転ピボットにする
    const headPivot = new THREE.Group();
    headPivot.position.set(0, headCenterLocal, 0.15); // z=0.15は元の頭のオフセット
    neckPivot.add(headPivot); // ★ neckPivotの子にする
    animatedParts.head = headPivot;

    // head メッシュは headPivot の原点（中心）に配置
    head.position.set(0, 0, 0);
    head.rotation.x = 0.05;
    headPivot.add(head);

    // ★表情システム改修：ここでは常にDEFAULT_EXPRESSION（キャラタブの固定デフォルト表情）
    //   でメッシュを生成する。ポーズ専用の表情は、この直後に呼ばれる
    //   window._reapplyCurrentExpression()がmaterial.mapを直接差し替えて反映する。
    const eyeMat = new THREE.MeshBasicMaterial({ map: createEyeTexture(DEFAULT_EXPRESSION.eyeType, data.eyeColor), transparent: true });
    const eyes = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), eyeMat);
    eyes.position.set(0, -0.05, 1.02); head.add(eyes);

    const mouthMat = new THREE.MeshBasicMaterial({ map: createMouthTexture(DEFAULT_EXPRESSION.mouthType), transparent: true });
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), mouthMat);
    mouth.position.set(0, -0.45, 0.98); head.add(mouth);

    const eyebrowMat = new THREE.MeshBasicMaterial({ map: createEyebrowTexture(DEFAULT_EXPRESSION.eyebrowType), transparent: true });
    const eyebrows = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), eyebrowMat);
    eyebrows.position.set(0, 0.42, 1.0); head.add(eyebrows);

    // 表情システム用に参照を公開（ポーズ切替時、キャラ全体を再構築せず
    // これらのMaterialのmapだけを直接差し替えるために使う。GLB出力時にも
    // 「デフォルト表情メッシュ」の可視トグル対象として参照される）
    animatedParts.face = { eyes: eyeMat, mouth: mouthMat, eyebrow: eyebrowMat, eyesMesh: eyes, mouthMesh: mouth, eyebrowMesh: eyebrows };

    // ★ 耳の生成
    if (data.earType === 'human' || data.earType === 'elf') {
        let earGeo;
        if (data.earType === 'human') {
            earGeo = createEggGeo(0.14, 0.24, 0.16, 0.3);
        } else {
            earGeo = createEggGeo(0.14, 0.55, 0.14, 0.65);
        }
        const earL = new THREE.Mesh(earGeo, skinMat);
        if (data.earType === 'human') {
            earL.position.set(0.92, -0.1, -0.05);
            earL.rotation.set(0.1, -0.2, -0.2);
        } else {
            earL.position.set(0.92, 0.05, -0.15);
            earL.rotation.set(-0.15, -0.4, -0.6);
        }
        head.add(earL);

        const earR = new THREE.Mesh(earGeo, skinMat);
        if (data.earType === 'human') {
            earR.position.set(-0.92, -0.1, -0.05);
            earR.rotation.set(0.1, 0.2, 0.2);
        } else {
            earR.position.set(-0.92, 0.05, -0.15);
            earR.rotation.set(-0.15, 0.4, 0.6);
        }
        head.add(earR);
    }

    // --- 髪の毛 ---
    const hairGroup = new THREE.Group();
    hairGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.95), hairMat));

    if (data.hairType === 'short01') {
        const sideGeo = new THREE.ConeGeometry(0.25, 0.8, 16);
        const sideL = new THREE.Mesh(sideGeo, hairMat); sideL.position.set(0.95, -0.4, 0.1); sideL.rotation.z = -0.3;
        const sideR = new THREE.Mesh(sideGeo, hairMat); sideR.position.set(-0.95, -0.4, 0.1); sideR.rotation.z = 0.3;
        hairGroup.add(sideL, sideR);
    } else if (data.hairType === 'long01') {
        // --- 後頭部から毛先まで、継ぎ目のない1本のジオメトリで作成 ---
        // 半径・前後の潰し・後方カーブを高さごとに滑らかに変化させ、
        // 「肩までは緩やかな板」「腰までは丸みのある円錐」の見た目を継ぎ目なく再現する。
        const lerp = (a, b, t) => a + (b - a) * t;
        const totalLen = 3.0;
        const shoulderFrac = 0.43; // 全体のうち肩までが占める割合
        const hairOrigin = { x: 0, y: 0.2, z: -0.45 }; // 頭の中心から見たこの髪メッシュの原点位置
        const headRadius = 1.05; // 頭球のサイズと合わせる

        const longHairGeo = new THREE.CylinderGeometry(1, 1, totalLen, 20, 16); // 半径1固定、頂点ごとに再スケールする
        longHairGeo.translate(0, -totalLen / 2, 0); // 上端(後頭部側)をy=0に揃える
        const lhPos = longHairGeo.attributes.position;
        for (let i = 0; i < lhPos.count; i++) {
            const yOrig = lhPos.getY(i);
            const t = Math.min(1, Math.max(0, -yOrig / totalLen)); // 0(頭側)〜1(毛先)

            // 半径プロファイル：頭元→肩でわずかに広がり、肩→毛先で丸みを持って細くなる
            let r;
            if (t <= shoulderFrac) {
                r = lerp(1.0, 1.08, t / shoulderFrac);
            } else {
                const u = (t - shoulderFrac) / (1 - shoulderFrac);
                r = lerp(1.08, 0.08, Math.pow(u, 0.7));
            }

            // 前後の潰し具合：頭付近は丸く、肩あたりから薄い板状に移行
            const flat = lerp(1.0, 0.45, Math.min(1, t / shoulderFrac));

            let x = lhPos.getX(i) * r;
            let y = yOrig;
            let z = lhPos.getZ(i) * r * flat;
            z -= Math.pow(t, 1.3) * 0.35; // 下にいくほど後方へゆるやかにカーブ

            // 根元(t=0付近)だけ頭の球面にぴったり吸着させ、段差をなくす
            const snapRaw = Math.min(1, Math.max(0, 1 - t / 0.18));
            const snap = snapRaw * snapRaw * (3 - 2 * snapRaw); // なめらかに減衰させる(smoothstep)
            if (snap > 0) {
                const hx = x + hairOrigin.x, hy = y + hairOrigin.y, hz = z + hairOrigin.z; // 頭中心基準の座標
                const dist = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
                const s = headRadius / dist;
                const targetX = hx * s - hairOrigin.x;
                const targetY = hy * s - hairOrigin.y;
                const targetZ = hz * s - hairOrigin.z;
                x += (targetX - x) * snap;
                y += (targetY - y) * snap;
                z += (targetZ - z) * snap;
            }

            lhPos.setX(i, x);
            lhPos.setY(i, y);
            lhPos.setZ(i, z);
        }
        longHairGeo.computeVertexNormals();
        const longHair = new THREE.Mesh(longHairGeo, hairMat);
        longHair.position.set(hairOrigin.x, hairOrigin.y, hairOrigin.z);
        hairGroup.add(longHair);

        // --- 毛先を少し丸める小さな球（親を髪本体にして、常にぴったり付いてくるようにする） ---
        const hairTipCapGeo = new THREE.SphereGeometry(0.09, 12, 10);
        const hairTipCap = new THREE.Mesh(hairTipCapGeo, hairMat);
        hairTipCap.position.set(0, -totalLen, -0.35); // longHairからの相対座標（毛先の中心と一致）
        hairTipCap.scale.set(1, 1, 0.45);
        longHair.add(hairTipCap);
    } else if (data.hairType === 'ponytail01') {
        // --- 前髪（short01と同じ形状・配置） ---
        const sideGeo = new THREE.ConeGeometry(0.25, 0.8, 16);
        const sideL = new THREE.Mesh(sideGeo, hairMat); sideL.position.set(0.95, -0.4, 0.1); sideL.rotation.z = -0.3;
        const sideR = new THREE.Mesh(sideGeo, hairMat); sideR.position.set(-0.95, -0.4, 0.1); sideR.rotation.z = 0.3;
        hairGroup.add(sideL, sideR);

        // --- 後頭部：丸い髪ボリューム（頭のベースキャップと同じ半径でシームレスに繋げ、ポニーテール根元まで深く覆う） ---
        const backVolGeo = new THREE.SphereGeometry(1.1, 32, 32);
        const backVol = new THREE.Mesh(backVolGeo, hairMat);
        backVol.position.set(0, 0.15, -0.4);
        backVol.scale.set(1, 1, 0.62); // 前後方向を潰して後頭部だけに留めつつ、根元までしっかり覆う余裕を持たせる
        hairGroup.add(backVol);

        // --- ポニーテール根元（髪ゴム部分の土台となるピボット。後頭部ボリュームの表面付近まで少し外に出す） ---
        const ponyRoot = new THREE.Group();
        ponyRoot.position.set(0, 0.3, -1.05);
        ponyRoot.scale.set(2, 2, 2); // ポニーテール全体を倍サイズに
        hairGroup.add(ponyRoot);

        // 根元の丸いふくらみ（涙滴の上部分）：後頭部ボリュームと重ねて地肌が見えないようにしつつ、外にしっかり見せる
        const poofGeo = new THREE.SphereGeometry(0.32, 20, 16);
        const poof = new THREE.Mesh(poofGeo, hairMat);
        poof.position.set(0, 0.05, 0.1);
        ponyRoot.add(poof);

        // 髪ゴム（暗め茶色）：ふくらみとテールの境目にはめる。前後の髪より少し太くして帯状にはっきり見せる
        const tieMat = new THREE.MeshLambertMaterial({ color: 0x4a2f1c });
        const tie = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 12), tieMat);
        tie.scale.set(1, 0.42, 1);
        ponyRoot.add(tie);

        // ポニーテール本体：涙滴型（上太・下細）のシリンダーを後方へカーブ変形
        const ponyBodyLen = 1.45;
        const ponyGeo = new THREE.CylinderGeometry(0.3, 0.07, ponyBodyLen, 20, 14);
        ponyGeo.translate(0, -ponyBodyLen / 2 - 0.05, 0); // 根元をponyRoot原点直下に接続
        const ponyPos = ponyGeo.attributes.position;
        for (let i = 0; i < ponyPos.count; i++) {
            const y = ponyPos.getY(i);
            const z = ponyPos.getZ(i);
            ponyPos.setZ(i, z + y * 0.15); // 下にいくほど後方へカーブ
        }
        ponyGeo.computeVertexNormals();
        const ponyBody = new THREE.Mesh(ponyGeo, hairMat);
        ponyRoot.add(ponyBody);

        // 毛先：先端を細くするコーン
        const tipY = -(ponyBodyLen + 0.05);
        const tipCurveZ = tipY * 0.15;
        const tipGeo = new THREE.ConeGeometry(0.09, 0.3, 16);
        const tip = new THREE.Mesh(tipGeo, hairMat);
        tip.position.set(0, tipY - 0.15, tipCurveZ);
        tip.rotation.x = Math.PI; // 先端が下向きになるよう反転
        ponyRoot.add(tip);

        animatedParts.ponyTail = ponyRoot;
    } else if (data.hairType === 'bun01') {
        // --- 前髪（ponytail01/short01と同じ形状・配置を流用） ---
        const sideGeo = new THREE.ConeGeometry(0.25, 0.8, 16);
        const sideL = new THREE.Mesh(sideGeo, hairMat); sideL.position.set(0.95, -0.4, 0.1); sideL.rotation.z = -0.3;
        const sideR = new THREE.Mesh(sideGeo, hairMat); sideR.position.set(-0.95, -0.4, 0.1); sideR.rotation.z = 0.3;
        hairGroup.add(sideL, sideR);

        // --- 後頭部：丸い髪ボリューム（ponytail01と同じ形状を流用。髪留め・しっぽは付けない） ---
        const backVolGeo = new THREE.SphereGeometry(1.1, 32, 32);
        const backVol = new THREE.Mesh(backVolGeo, hairMat);
        backVol.position.set(0, 0.15, -0.4);
        backVol.scale.set(1, 1, 0.62);
        hairGroup.add(backVol);

        // --- お団子：頭頂部中心より少し後方へ配置。2個をわずかに重ねて自然な巻き髪の丸みを出す ---
        const bunGeo = new THREE.SphereGeometry(0.42, 20, 16);
        const bun = new THREE.Mesh(bunGeo, hairMat);
        bun.position.set(0, 0.78, -0.82);
        bun.scale.set(1.0, 0.9, 0.9);
        hairGroup.add(bun);
    }
    head.add(hairGroup);

    // ── 軽装プレートアーマー：ヘルメット（装着時のみ生成し、髪の上から被せる） ──
    if (data.headAccessory === 'helmet') {
        const helmet = createHelmet();
        head.add(helmet);
        animatedParts.helmet = helmet;
    } else {
        animatedParts.helmet = null;
    }

    // ── 頭部アクセサリー：カチューシャ（装着時のみ生成し、髪の上から被せる） ──
    // ★服（メイド服など）とは完全に独立した選択状態。メイド服を選んでも
    //   自動では表示されず、headAccessory === 'headband' の時だけ表示する。
    if (data.headAccessory === 'headband') {
        const headband = createHeadband(head);
        animatedParts.headband = headband;
    } else {
        animatedParts.headband = null;
    }

    // --- 胴体 ---
    // 臀部：胸部と同じ形状・サイズ
    const pelvisGeo = new THREE.SphereGeometry(0.52, 20, 16);
    const pelvis = new THREE.Mesh(pelvisGeo, skinMat);
    pelvis.scale.set(1.15, 0.80, 0.72); // 胸部と同じ楕円球
    pelvis.position.y = 1.1; 
    characterGroup.add(pelvis);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), skinMat); 
    belly.scale.set(1.0, 1.0, 0.72); // 前後を薄くして背中から飛び出さないように
    belly.position.y = 1.5; 
    animatedParts.belly = belly;
    characterGroup.add(belly);

    // chest: 前後につぶれた楕円球（X広め・Y中・Z薄め）
    const chestGeo = new THREE.SphereGeometry(0.52, 20, 16);
    const chest = new THREE.Mesh(chestGeo, skinMat);
    chest.scale.set(1.15, 0.80, 0.72); // 横広・前後薄の楕円球
    chest.position.y = 2.0; 
    animatedParts.chest = chest;
    characterGroup.add(chest);

    // --- 服グループ ---
    // clothesGroupはbodyGroupと完全に分離した独立グループ
    // 将来「鎧」「ローブ」等への拡張もここに追加するだけでOK
    // 下半身装備（ズボン／スカート）は同時装備禁止。bottomWearで切替
    // ズボンの太もも/膝/すね/裾はcreateLeg()内でボーン直下に生成済み
    // ヒップ（pelvis）部の下半身装備はcharacterGroup直下に追加
    if (data.bottomWear === 'pants' && data.pantsColor && data.pantsColor !== 'none') {
        createPants(data.pantsColor, characterGroup, pelvis);
        // ウエスト帯は削除（bellyまで食い込むため）
    } else if ((data.bottomWear === 'skirt' || data.bottomWear === 'longskirt') && data.skirtColor && data.skirtColor !== 'none') {
        // ★ロングスカートは「スカート本体（骨盤〜膝ヒダ）」をそのまま流用し、
        //   そこに新規の裾延長パーツ(createLongSkirtExtension)を継ぎ足す方式なので、
        //   ここのブルマー処理も通常のスカートと全く同じでよい。
        // 臀部を非表示にすると、脚を高く上げるポーズの時に
        // 「脚だけが宙に浮いている」ように見えてしまうため、
        // 隠す代わりに色を変えて「ブルマーを履いている」体にする。
        // pelvisはskinMatを他の部位（頭・腕・脚など）と共有しているため、
        // pelvisだけ専用のMaterialに差し替える（skinMat自体は変更しない）。
        pelvis.material = new THREE.MeshLambertMaterial({ color: 0x2244aa }); // ブルマー色（紺）
        // スカート本体（動的追従版）はcreateLeg()×2実行後でないと
        // 左右の膝ボーン(hip/knee)を参照できないため、下方の
        // 「animatedParts.legs.push(createLeg(...))」の直後で
        // createDynamicSkirt()を呼び出している（このifブロックでは
        // pelvisの色替えだけを行う）。
    } else if (data.bottomWear === 'culotte' && data.skirtColor && data.skirtColor !== 'none') {
        // 腰まわりはズボンと同じ球体カバーを流用（脚に追従するスカート部はcreateLeg内で生成）
        createPants(data.skirtColor, characterGroup, pelvis);
    } else if (data.bottomWear === 'maidBottom') {
        // メイド服下（黒いロングスカート＋前面の白いエプロン）も、通常の
        // スカート／ロングスカートと同じ理由でブルマー色に差し替える。
        // スカート本体（動的追従版）はcreateLeg()×2実行後、下方の
        // 「animatedParts.maidBottom = createMaidBottom(...)」で生成する。
        pelvis.material = new THREE.MeshLambertMaterial({ color: 0x2244aa }); // ブルマー色（紺）
    }
    if (data.topWear === 'shirt' && data.shirtColor && data.shirtColor !== 'none') {
        const sg = createTShirt(data.shirtColor, characterGroup, data);
        if (sg) sg.renderOrder = 2;
    } else if (data.topWear === 'armor') {
        const bp = createBreastplate(data, characterGroup);
        if (bp) bp.renderOrder = 2;
    } else if (data.topWear === 'maidTop') {
        // メイド服上（本体・襟・リボン・胸当て／上部エプロン）。カチューシャは
        // 頭部アクセサリー選択（headAccessory）側で独立して生成するため、
        // ここでは呼び出さない。下半身（黒いロングスカート＋前面エプロン）は
        // bottomWear==='maidBottom'側で独立して生成する（本項目とは無関係）。
        // 袖（パフスリーブ）はこの時点ではまだ肩関節が存在しないため、
        // 軽装プレートアーマーの肩当てと同様、腕生成後（createArm×2の直後）で別途追加する。
        const mg = createMaidTop(data, characterGroup);
        if (mg) mg.renderOrder = 2;
    }

    // 胸の大きさ（バスト）の表現
    if (data.bustSize > 0) {
        const b = data.bustSize;
        const bustRadius = 0.22 * b; // 胸球体の半径
        // 飛び出し量の上限 = 半径の2/3（それ以上は球体が露出して不自然）
        const pRaw = data.bustProtrude;
        const pMax = bustRadius; // 最大=半球（球体の半径分だけ前に出る）
        const p = Math.min(pRaw, pMax);
        const bustGeo = new THREE.SphereGeometry(bustRadius, 16, 16); // 完全な球体

        // 左胸
        const bustL = new THREE.Mesh(bustGeo, skinMat);
        bustL.position.set(0.17, -0.05, p); 
        bustL.rotation.x = Math.PI / 2.2;     
        bustL.rotation.y = -0.15;             
        bustL.rotation.z = -0.2;              
        chest.add(bustL);

        // 右胸
        const bustR = new THREE.Mesh(bustGeo, skinMat);
        bustR.position.set(-0.17, -0.05, p); 
        bustR.rotation.x = Math.PI / 2.2;
        bustR.rotation.y = 0.15;              
        bustR.rotation.z = 0.2;               
        chest.add(bustR);
    }

    // --- 関節ジオメトリ ---
    const bigJointGeo = new THREE.SphereGeometry(0.2, 16, 16); 
    const smallJointGeo = new THREE.SphereGeometry(0.16, 16, 16); 

    // 篭手（前腕当て・手甲）用マテリアル：左右のcreateArm()呼び出しで共有する
    let armPlateMat = null, armTrimMat = null;
    if (data.topWear === 'armor') {
        armPlateMat = new THREE.MeshLambertMaterial({ color: data.plateColor || '#d8dce0' });
        armTrimMat  = new THREE.MeshLambertMaterial({ color: data.plateTrimColor || '#d4af37' });
    }

    // ★ 修正：腕用と脚用でジオメトリを別々に生成する
    // translate()はジオメトリ自体を書き換える破壊的操作のため、共有すると2つ目がずれるバグがあった
    function createLimbGeo() {
        const geo = new THREE.CylinderGeometry(0.16, 0.13, 0.8, 16);
        geo.translate(0, -0.4, 0);
        return geo;
    }

    function createArm(xPos) {
        const shoulder = new THREE.Mesh(bigJointGeo, skinMat); 
        shoulder.position.set(xPos, 2.15, 0); // 肩を下げてなで肩に
        const upperArm = new THREE.Mesh(createLimbGeo(), skinMat); 
        shoulder.add(upperArm);
        const elbow = new THREE.Mesh(smallJointGeo, skinMat); 
        elbow.position.set(0, -0.8, 0);
        upperArm.add(elbow);
        const foreArm = new THREE.Mesh(createLimbGeo(), skinMat); 
        elbow.add(foreArm);
        const wrist = new THREE.Mesh(smallJointGeo, skinMat); 
        wrist.position.set(0, -0.8, 0);
        foreArm.add(wrist);

        // ── 軽装プレートアーマー：篭手（前腕当て＋手甲） ──
        // foreArm/wristはこの関数内で今まさに生成されたばかりなので、
        // ここで直接addすれば確実にタイミング問題を回避できる
        //
        // ★修正：以前は手首を覆う「カフ」と縁取りリングをwrist(手首)側に付けていたため、
        //   手首を捻る/曲げるポーズにすると前腕当てから分離して腕の外側に飛び出して見えるバグがあった。
        //   → カフとリングは前腕当て側（foreArm、手首の回転に巻き込まれない）に固定し、
        //     wristの子には「手を覆う丸いキャップ」だけを残す（これは手と一緒に回転してよい部分）。
        if (data.topWear === 'armor' && armPlateMat && armTrimMat) {
            // 前腕当て（ForeArmArmor）：foreArmに固定。手首の少し上まで伸ばす
            const vambraceGeo = new THREE.CylinderGeometry(0.19, 0.175, 0.46, 16);
            const vambrace = new THREE.Mesh(vambraceGeo, armPlateMat);
            vambrace.position.y = -0.55;
            foreArm.add(vambrace);

            // 前腕当て下端（手首側）の金縁トリム。foreArm側に固定＝手首の回転の影響を受けない
            const vambraceRing = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.025, 8, 20), armTrimMat);
            vambraceRing.rotation.x = Math.PI / 2;
            vambraceRing.position.y = -0.78;
            foreArm.add(vambraceRing);

            // 手甲（HandArmor）：wrist関節を覆う丸いキャップのみ。手の回転に追従してよい部分
            const handCapGeo = new THREE.SphereGeometry(0.19, 14, 12, 0, Math.PI * 2, 0, Math.PI / 1.7);
            const handCap = new THREE.Mesh(handCapGeo, armPlateMat);
            handCap.name = 'handArmor';
            handCap.position.y = -0.02;
            wrist.add(handCap);
        }

        characterGroup.add(shoulder);
        return { root: shoulder, joint: elbow, wrist: wrist };
    }

    // ── 軽装プレートアーマー：ヘルメット ──
    // 頭頂〜額の上あたりまでを覆うドーム状の兜。前は開けて素顔が見えるオープンフェイス構造。
    // こめかみ横に小さな側面プレートを追加。耳や側頭部・後頭部の髪はそのまま覗かせる。
    function createHelmet() {
        const helmet = new THREE.Group();
        helmet.name = 'helmet';

        const plateColor = data.plateColor || '#d8dce0';
        const trimColor  = data.plateTrimColor || '#d4af37';
        // ★修正：MeshStandardMaterial(metalness)は環境マップの無いこのシーンでは
        //   ハイライト以外が真っ黒に見えてしまうため、他の部位と同じLambertに変更
        const plateMat = new THREE.MeshLambertMaterial({ color: plateColor });
        const trimMat  = new THREE.MeshLambertMaterial({ color: trimColor });

        // 本体ドーム：頭頂から額の上あたりまでを覆う（前面は開けて素顔を見せる）
        // ★修正：後ろ髪は将来編集予定＆ロングヘアで干渉してバグるため、
        //   phiStart/phiLengthで水平方向を前半分（左耳〜正面〜右耳）だけに制限する
        const domeThetaLen = Math.PI / 2.7; // 約67°、髪の帽子(π/1.95)より浅く覆う
        const domeR = 1.16; // 髪の帽子(半径1.05)より一回り大きく、外側に被せる
        const domePhiStart  = 0;
        const domePhiLength = Math.PI; // 前半分のみ（後頭部には回り込まない）
        const domeGeo = new THREE.SphereGeometry(domeR, 24, 16, domePhiStart, domePhiLength, 0, domeThetaLen);
        const dome = new THREE.Mesh(domeGeo, plateMat);
        helmet.add(dome);

        // ドーム下端に沿った金色の縁取りリング（同じく前半分のみの円弧）
        const edgeY = domeR * Math.cos(domeThetaLen);
        const edgeR = domeR * Math.sin(domeThetaLen);
        const trimRing = new THREE.Mesh(new THREE.TorusGeometry(edgeR, 0.045, 10, 32, Math.PI), trimMat);
        trimRing.position.y = edgeY;
        trimRing.rotation.x = Math.PI / 2;
        helmet.add(trimRing);

        // こめかみ横の小さな側面プレート（耳の少し外側。左右対称）
        // ★修正：以前は顔の前に垂れ下がる巨大な黒い板になっていたため、
        //   耳と同程度のサイズに縮小し、頭の側面に沿う位置へ移動
        function createTemplePlate(sign) {
            const plateGeo = createEggGeo(0.16, 0.22, 0.09, 0.3);
            const plate = new THREE.Mesh(plateGeo, plateMat);
            plate.position.set(sign * 1.02, edgeY - 0.10, 0.12);
            plate.rotation.set(0.05, sign * -0.25, sign * 0.1);
            return plate;
        }
        helmet.add(createTemplePlate(1));
        helmet.add(createTemplePlate(-1));

        return helmet;
    }

    function createLeg(xPos, pelvisMesh, pantsColor, culotteColor) {
        const hasPants = pantsColor && pantsColor !== 'none';
        const hasCulotte = culotteColor && culotteColor !== 'none';
        const pantsMat = hasPants ? new THREE.MeshLambertMaterial({ color: pantsColor }) : null;
        const hipR = 0.22;

        // ── hipはGroupにしてMeshを子にする（visible=falseの連鎖を防ぐ） ──
        const hip = new THREE.Group();
        hip.position.set(xPos, 0.54, 0.0);

        const hipMesh = new THREE.Mesh(new THREE.SphereGeometry(hipR, 16, 16), skinMat);
        hipMesh.visible = !(hasPants || hasCulotte);
        hip.add(hipMesh);

        // 膝関節：Groupにする
        const kneeR = 0.15;
        const knee = new THREE.Group();
        knee.position.set(0, -0.85, 0);
        hip.add(knee);

        const kneeMesh = new THREE.Mesh(new THREE.SphereGeometry(kneeR, 16, 16), skinMat);
        kneeMesh.visible = !hasPants;
        knee.add(kneeMesh);

        // 太もも
        const thighLen = 0.85;
        const thighTopR  = hipR * 1.1;
        const thighBotR  = kneeR * 0.75;
        const thighGeo = new THREE.CylinderGeometry(thighTopR, thighBotR, thighLen, 16);
        thighGeo.translate(0, -thighLen / 2, 0);
        const thigh = new THREE.Mesh(thighGeo, skinMat);
        thigh.visible = !hasPants;
        hip.add(thigh);

        // ふくらはぎ
        const calfLen = 0.85;
        const calfTopR  = kneeR * 0.85;
        const calfBotR  = 0.13;
        const calfGeo = new THREE.CylinderGeometry(calfTopR, calfBotR, calfLen, 16);
        calfGeo.translate(0, -calfLen / 2, 0);
        const calf = new THREE.Mesh(calfGeo, skinMat);
        calf.visible = !hasPants;
        knee.add(calf);

        // ── 足首（関節球体） ──
        const ankleR = 0.14;
        const ankle = new THREE.Mesh(new THREE.SphereGeometry(ankleR, 16, 16), skinMat);
        ankle.position.set(0, -calfLen, 0);
        knee.add(ankle);

        // ── ズボンパーツ（ボーン直下でポーズ追従） ──
        if (hasPants) {
            // ヒップ（hip球体を包む）
            const pHipGeo = new THREE.SphereGeometry(hipR + 0.045, 16, 16);
            const pHip = new THREE.Mesh(pHipGeo, pantsMat);
            pHip.position.set(0, 0, 0); // hip原点に合わせる
            hip.add(pHip);

            // 太もも（thighを包む円錐台）
            const pThighGeo = new THREE.CylinderGeometry(
                thighTopR + 0.04, thighBotR + 0.04, thighLen, 20);
            pThighGeo.translate(0, -thighLen / 2, 0);
            const pThigh = new THREE.Mesh(pThighGeo, pantsMat);
            hip.add(pThigh);

            // 膝（knee球体を包む）
            const pKneeGeo = new THREE.SphereGeometry(kneeR + 0.04, 16, 16);
            const pKnee = new THREE.Mesh(pKneeGeo, pantsMat);
            pKnee.position.set(0, -0.85, 0); // knee.position と同じ
            hip.add(pKnee);

            // すね（calfを包む円錐台）
            const pCalfGeo = new THREE.CylinderGeometry(
                calfTopR + 0.04, calfBotR + 0.04, calfLen, 20);
            pCalfGeo.translate(0, -calfLen / 2, 0);
            const pCalf = new THREE.Mesh(pCalfGeo, pantsMat);
            // knee直下のcalfと同じ座標系
            knee.add(pCalf);

            // 裾（すね下端を閉じる円盤）
            const pHemGeo = new THREE.CircleGeometry(calfBotR + 0.04, 20);
            const pHem = new THREE.Mesh(pHemGeo, pantsMat);
            pHem.rotation.x = Math.PI / 2;
            pHem.position.set(0, -calfLen, 0);
            knee.add(pHem);
        }

        // ── キュロット（分割スカート）：thigh(hip)の子として追加し、脚の動きに追従させる ──
        // 太もも半ばまでで留めて裾を大きく広げることで、キック等で足がスカートを
        // 貫通して見えるのを防ぐ（膝から下は素足のまま見せてスカートらしさを保つ）。
        if (hasCulotte) {
            const culotteMat = new THREE.MeshLambertMaterial({ color: culotteColor, side: THREE.DoubleSide });

            // 腰の継ぎ目（hip球のカバー。pPelvisとの段差を出さないよう少し大きめ）
            const cHipGeo = new THREE.SphereGeometry(hipR + 0.05, 16, 16);
            const cHip = new THREE.Mesh(cHipGeo, culotteMat);
            hip.add(cHip);

            // 太もも部：円錐台をスカート風にフレアさせる（上は太ももに沿わせ、下は大きく広げる）
            const cTopR = thighTopR + 0.07;
            const cBotR = thighBotR + 0.30;  // 裾を広げて脚の振り幅を吸収
            const cLen  = thighLen * 0.62;   // 膝までは届かせず太もも半ばで終える
            const culotteGeo = new THREE.CylinderGeometry(cTopR, cBotR, cLen, 10, 3);
            culotteGeo.translate(0, -cLen / 2, 0);

            // プリーツ風の軽い波打ち（既存スカートと同じ手法・低ポリのまま質感を出す）
            const cPos = culotteGeo.attributes.position;
            for (let i = 0; i < cPos.count; i++) {
                const cx = cPos.getX(i), cz = cPos.getZ(i);
                const angle = Math.atan2(cz, cx);
                const pleat = 1 + Math.sin(angle * 8) * 0.03;
                cPos.setX(i, cx * pleat);
                cPos.setZ(i, cz * pleat);
            }
            cPos.needsUpdate = true;
            culotteGeo.computeVertexNormals();

            const culotteThigh = new THREE.Mesh(culotteGeo, culotteMat);
            culotteThigh.scale.z = 0.88; // 前後をわずかに薄くしてゴツく見えないように
            culotteThigh.rotation.z = (xPos > 0 ? -1 : 1) * 0.07; // 左右で外側へわずかに開く
            hip.add(culotteThigh);

            // 裾リング（厚み付け）
            const cHemGeo = new THREE.TorusGeometry(cBotR, 0.025, 6, 16);
            const cHem = new THREE.Mesh(cHemGeo, culotteMat);
            cHem.rotation.x = Math.PI / 2;
            cHem.scale.z = 0.88;
            cHem.position.y = -cLen;
            hip.add(cHem);
        }

        // ── 軽装プレートアーマー：腰タセット（左右独立・前は開けたまま） ──
        // 【設計方針】
        //   ・キュロットと同じ「太もも半ばで留めて裾を広げる」構造を流用し、
        //     脚を高く上げても貫通しにくくする
        //   ・ただしキュロットのような全周ではなく、内股側（脚と脚の間＝正面中央）を
        //     開けた部分円筒にする（＝「前にはプレートがない」構造）
        //   ・左右のhipにそれぞれ独立して付ける（腰ボーン＝hipに追従）
        if (data.topWear === 'armor') {
            const tassetPlateMat = new THREE.MeshLambertMaterial({
                color: data.plateColor || '#d8dce0', side: THREE.DoubleSide
            });
            const tassetTrimMat = new THREE.MeshLambertMaterial({
                color: data.plateTrimColor || '#d4af37', side: THREE.DoubleSide
            });

            const tTopR = thighTopR + 0.10;
            const tBotR = thighBotR + 0.34; // 裾を広げて脚の振り幅を吸収（キュロットと同じ考え方）
            const tLen  = thighLen * 0.60;  // 太もも半ばまで（膝には届かせない）

            // 内股側（他方の脚に近い側）を120°分開ける
            const innerTheta = (xPos > 0) ? Math.PI * 1.5 : Math.PI * 0.5;
            const gapHalf = Math.PI / 3; // 開口部の半角（合計120°）
            const tThetaStart  = innerTheta + gapHalf;
            const tThetaLength = Math.PI * 2 - gapHalf * 2; // 残り240°がプレート

            const tassetGeo = new THREE.CylinderGeometry(
                tTopR, tBotR, tLen, 20, 1, true, tThetaStart, tThetaLength
            );
            tassetGeo.translate(0, -tLen / 2, 0);
            const tasset = new THREE.Mesh(tassetGeo, tassetPlateMat);
            hip.add(tasset);

            // 腰まわり（上端）の金縁：同じ開口角の薄い帯で継ぎ目を隠す
            const tTopBandGeo = new THREE.CylinderGeometry(
                tTopR + 0.015, tTopR + 0.015, 0.06, 20, 1, true, tThetaStart, tThetaLength
            );
            const tTopBand = new THREE.Mesh(tTopBandGeo, tassetTrimMat);
            hip.add(tTopBand);

            // 裾（下端）の金縁：同じ開口角の帯
            const tHemGeo = new THREE.CylinderGeometry(
                tBotR + 0.02, tBotR + 0.02, 0.05, 20, 1, true, tThetaStart, tThetaLength
            );
            const tHem = new THREE.Mesh(tHemGeo, tassetTrimMat);
            tHem.position.y = -tLen;
            hip.add(tHem);
        }

        // ── 軽装プレートアーマー：脛当て（膝キャップ＋すね当て、左右） ──
        // 【設計方針】
        //   ・knee（膝関節）の子として追加。膝を曲げる・しゃがむポーズにも一緒に追従する
        //   ・実際の甲冑と同じく前面のみを覆い、背面（ふくらはぎ側）は開けておく
        //     → しゃがみ／膝立ちポーズで背面が突っ張って変形して見えるのを防ぐため
        if (data.topWear === 'armor') {
            const kneeArmorMat = new THREE.MeshLambertMaterial({
                color: data.plateColor || '#d8dce0', side: THREE.DoubleSide
            });
            const kneeArmorTrimMat = new THREE.MeshLambertMaterial({
                color: data.plateTrimColor || '#d4af37', side: THREE.DoubleSide
            });

            // 膝キャップ：膝関節を前から覆う丸いドーム
            // （上向きの半球を90°倒して前(+Z)向きのドームにする）
            const kneeCapR = kneeR + 0.09;
            const kneeCapGeo = new THREE.SphereGeometry(kneeCapR, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
            const kneeCap = new THREE.Mesh(kneeCapGeo, kneeArmorMat);
            kneeCap.rotation.x = Math.PI / 2;
            kneeCap.position.z = 0.06;
            knee.add(kneeCap);

            // 膝キャップ縁の金トリム（回転後のドーム境界は自然にXY平面の円になるため、
            // トーラスは追加回転なしでそのまま使える）
            const kneeRingGeo = new THREE.TorusGeometry(kneeCapR, 0.025, 8, 20);
            const kneeRing = new THREE.Mesh(kneeRingGeo, kneeArmorTrimMat);
            kneeRing.position.z = 0.06;
            knee.add(kneeRing);

            // すね当て：ふくらはぎの前面180°のみを覆う部分円筒（背面は開放）
            // ★ブーツ機能との干渉対策：
            //   既存の長靴シャフトは半径0.19・上端y=-0.30まで伸びている。
            //   すね当てをそこまで長くすると同じ場所で２つの筒が重なりチラつく(Zファイティング)ため、
            //   すね当てはブーツのシャフト上端でぴったり止め、下端半径もシャフトと同じ0.19にして
            //   継ぎ目が自然に見えるようにする（ブーツを履かない場合は少し脛が覗く形になる）
            const shinTopR = kneeR + 0.05;
            const shinBotR = 0.19; // 長靴シャフト半径(0.19)と揃える
            const shinTopY = -0.12;
            const shinBotY = -0.30; // 長靴シャフト上端(-0.30)と揃える
            const shinLen  = shinTopY - shinBotY;
            const shinThetaStart  = -Math.PI / 2;
            const shinThetaLength = Math.PI; // 前面180°のみ

            const shinGeo = new THREE.CylinderGeometry(
                shinTopR, shinBotR, shinLen, 16, 1, true, shinThetaStart, shinThetaLength
            );
            const shin = new THREE.Mesh(shinGeo, kneeArmorMat);
            shin.position.y = shinTopY - shinLen / 2;
            knee.add(shin);

            // すね当て上端（膝下）の金縁
            const shinTopBandGeo = new THREE.CylinderGeometry(
                shinTopR + 0.015, shinTopR + 0.015, 0.05, 16, 1, true, shinThetaStart, shinThetaLength
            );
            const shinTopBand = new THREE.Mesh(shinTopBandGeo, kneeArmorTrimMat);
            shinTopBand.position.y = shinTopY;
            knee.add(shinTopBand);

            // すね当て下端（足首上）の金縁
            const shinBotBandGeo = new THREE.CylinderGeometry(
                shinBotR + 0.015, shinBotR + 0.015, 0.05, 16, 1, true, shinThetaStart, shinThetaLength
            );
            const shinBotBand = new THREE.Mesh(shinBotBandGeo, kneeArmorTrimMat);
            shinBotBand.position.y = shinBotY;
            knee.add(shinBotBand);
        }

        // ── 足グループ（ankle直下・ポーズ追従） ──
        const foot = new THREE.Group();
        foot.position.set(0, -0.10, +0.18);
        ankle.add(foot);

        // ── 素足グループ ──
        const bareFootGroup = new THREE.Group();
        foot.add(bareFootGroup);

        // 【土台】扁平球体
        const soleSphere = new THREE.SphereGeometry(0.20, 20, 14);
        const sole = new THREE.Mesh(soleSphere, skinMat);
        sole.scale.set(0.95, 0.35, 1.6);
        sole.position.set(0, 0, +0.08);
        bareFootGroup.add(sole);

        // 【甲の盛り上がり】
        const instepGeo = new THREE.SphereGeometry(0.18, 16, 12);
        const instep = new THREE.Mesh(instepGeo, skinMat);
        instep.scale.set(0.80, 0.65, 1.55);
        instep.position.set(0, 0.08, +0.04);
        instep.rotation.x = 0.25;
        bareFootGroup.add(instep);

        // ── 長靴グループ（ankle親子でポーズ追従） ──
        const bootGroup = new THREE.Group();
        foot.add(bootGroup);

        // ankle基準でのオフセット（foot.position反映済み座標系）
        // foot原点=かかと付近、前方+Z、上方+Y
        const BOOT_Z = +0.10; // foot座標系でのZ中心

        const bootsColor = data.bootsColor && data.bootsColor !== 'none' ? data.bootsColor : null;

        if (bootsColor) {
            const bootsMat = new THREE.MeshLambertMaterial({ color: bootsColor });

            // ── ソール（足裏の厚底） ──
            const soleRx = 0.24, soleRz = 0.54, soleH = 0.20;
            const soleGeo = new THREE.CylinderGeometry(soleRx, soleRx, soleH, 24, 1, false);
            const sPos = soleGeo.attributes.position;
            for (let i = 0; i < sPos.count; i++) sPos.setZ(i, sPos.getZ(i) * (soleRz / soleRx));
            sPos.needsUpdate = true;
            soleGeo.computeVertexNormals();
            const bootSole = new THREE.Mesh(soleGeo, bootsMat);
            bootSole.position.set(0, -0.18, BOOT_Z);
            bootGroup.add(bootSole);

            // ソール底面
            const soleBotGeo = new THREE.CircleGeometry(soleRx, 24);
            const soleBotMesh = new THREE.Mesh(soleBotGeo, bootsMat);
            soleBotMesh.rotation.x = -Math.PI / 2;
            soleBotMesh.scale.set(1, soleRz / soleRx, 1);
            soleBotMesh.position.set(0, -0.28, BOOT_Z);
            bootGroup.add(soleBotMesh);

            // ── トゥ（足先を覆う楕円筒） ──
            const toeRx = 0.22, toeRz = 0.54, toeH = 0.28;
            const toeGeo = new THREE.CylinderGeometry(toeRx, toeRx, toeH, 20, 1, false);
            const tPos = toeGeo.attributes.position;
            for (let i = 0; i < tPos.count; i++) tPos.setZ(i, tPos.getZ(i) * (toeRz / toeRx));
            tPos.needsUpdate = true;
            toeGeo.computeVertexNormals();
            const toe = new THREE.Mesh(toeGeo, bootsMat);
            toe.position.set(0, -0.06, BOOT_Z);
            bootGroup.add(toe);

            // ── シャフト（足首〜すねの筒）──
            // foot座標系: ankleはfoot親の上なのでシャフトはanкleへ直接追加
            const shaftH = 0.55, shaftR = 0.19;
            const shaftGeo = new THREE.CylinderGeometry(shaftR, shaftR, shaftH, 20);
            const shaft = new THREE.Mesh(shaftGeo, bootsMat);
            // ankleの子として追加（foot座標系から抜けてankle直下に）
            shaft.position.set(0, -calfLen + shaftH / 2, 0);
            knee.add(shaft); // knee直下のankleと同じ親

            // 履き口
            const cuffGeo = new THREE.CylinderGeometry(shaftR + 0.015, shaftR, 0.04, 20);
            const cuff = new THREE.Mesh(cuffGeo, bootsMat);
            cuff.position.set(0, -calfLen + shaftH - 0.02, 0);
            knee.add(cuff);
        }

        // 表示切替
        bareFootGroup.visible = !(data.bootsColor && data.bootsColor !== 'none');
        bootGroup.visible     =  (data.bootsColor && data.bootsColor !== 'none');

        pelvisMesh.parent ? pelvisMesh.parent.add(hip) : characterGroup.add(hip);
        // ★ankleを追加公開：ロングスカートの裾延長(createLongSkirtExtension)が
        //   足首のワールド座標を参照するために必要。既存のroot/jointは変更なし。
        return { root: hip, joint: knee, ankle };
    }

    animatedParts.arms.push(createArm(0.65));  
    animatedParts.arms.push(createArm(-0.65)); 

    // ── 軽装プレートアーマー：肩当て ──
    // ★注意：shoulderメッシュはcreateArm()実行時点でようやく生成されるため、
    //   ここ（腕生成の直後）で呼ぶ必要がある。胸当てと同じ場所で呼ぶと
    //   まだ肩関節が存在せず、肩当てが1つも装着されないバグになる。
    if (data.topWear === 'armor') {
        createShoulderArmor(data, characterGroup);
    }

    // ── メイド服：白いパフスリーブ ──
    // ★注意：createTShirt()内のaddSleeve探索と同じ理由で、肩関節メッシュは
    //   ここ（createArm()×2の直後）でないとまだ存在しない。
    if (data.topWear === 'maidTop') {
        addMaidSleeves(characterGroup);
    }

    const legPantsColor = (data.bottomWear === 'pants') ? data.pantsColor : null;
    const legCulotteColor = (data.bottomWear === 'culotte') ? data.skirtColor : null;
    animatedParts.legs.push(createLeg(0.378,  pelvis, legPantsColor, legCulotteColor)); 
    animatedParts.legs.push(createLeg(-0.378, pelvis, legPantsColor, legCulotteColor)); 

    // ── 下半身装備：スカート（腰・左右膝ボーンに追従する動的版） ──
    // 左右の膝ボーン(hip/knee)が上のcreateLeg()×2で生成済みになった
    // この時点でのみ呼び出せる（createLeg以前だと膝の参照が取れない）。
    // ★ロングスカートも「スカート本体」自体は全く同じものを使う
    //   （下の裾延長パーツを継ぎ足すことで長くする方式のため）。
    if ((data.bottomWear === 'skirt' || data.bottomWear === 'longskirt') && data.skirtColor && data.skirtColor !== 'none') {
        animatedParts.skirt = createDynamicSkirt(data.skirtColor, characterGroup, pelvis, animatedParts.legs);
    } else {
        animatedParts.skirt = null;
    }

    // ── 下半身装備：ロングスカートの裾延長パーツ ──
    // 「スカート」本体（上のcreateDynamicSkirt、内部構造は無改造）の裾に、
    // 足首基準の大きなカプセル型をつなげて足元まで伸ばす追加パーツ。
    // 詳細な設計はcreateLongSkirtExtension()のコメントを参照。
    if (data.bottomWear === 'longskirt' && data.skirtColor && data.skirtColor !== 'none') {
        animatedParts.longSkirtExt = createLongSkirtExtension(data.skirtColor, characterGroup, animatedParts.skirt, animatedParts.legs);
    } else {
        animatedParts.longSkirtExt = null;
    }

    // ── 下半身装備：メイド服下（黒いロングスカート＋前面の白いエプロン） ──
    // ★内部で createDynamicSkirt()／createLongSkirtExtension() を無改造のまま
    //   呼び出すため、上のanimatedParts.skirt／longSkirtExtとは別に、
    //   専用のanimatedParts.maidBottomとして保持する（二重生成ではない）。
    if (data.bottomWear === 'maidBottom') {
        animatedParts.maidBottom = createMaidBottom(data, characterGroup, pelvis, animatedParts.legs);
    } else {
        animatedParts.maidBottom = null;
    }

    // ── 小道具：右手の武器・左手の盾 ──
    // ★重要：ここでは装備しない。arms[0]/arms[1]（wrist）が今しがた新しく
    //   作り直されたばかりで、キャラ再構築のたびに古い小道具は消えてしまう
    //   （scene.remove()時にdisposeObject3D済み）ため、いったんnullにしておき、
    //   下のwindow._reapplyCurrentProps()で「今表示すべき小道具」を
    //   （キャラのデフォルト、または上書き中のポーズの内容から）計算し直して
    //   改めて装備させる。後方互換：古い保存データのswordType欠落
    //   （hasSword(true/false)しか持たない場合）への変換は、
    //   読込直後のcharacterData.swordType確定時点（save-load-ui.js）で
    //   既に行われているため、ここではdata.swordTypeをそのまま信頼してよい。
    animatedParts.sword  = null;
    animatedParts.shield = null;

    // 長靴はcreateLeg()内でankle親子として生成済み

    characterRotateWrapper.add(characterGroup);
    if (window._poseEditApplyAll) window._poseEditApplyAll();
    // キャラ再構築で顔メッシュが新しいオブジェクトに置き換わったので、
    // 直前まで表示していた表情（ポーズ専用 or デフォルト）を再適用する
    if (window._reapplyCurrentExpression) window._reapplyCurrentExpression();
    // キャラ再構築でwrist（手首）が新しいオブジェクトに置き換わったので、
    // 今表示すべき小道具（キャラのデフォルト、またはアクティブなポーズの上書き）を
    // 再計算して装備し直す
    if (window._reapplyCurrentProps) window._reapplyCurrentProps();
}
