// ============================================================
// createTShirt() — 服生成関数
// ============================================================
// 【設計方針】
//   ・body（素体）と完全分離。新しいMesh/Geometry/Materialで構成
//   ・clothesGroup を characterGroup の子として追加
//   ・胴体：頂点変形で胸部を前方に押し出し自然な膨らみを表現
//   ・袖：左右別Meshで肩関節の子にする（腕回転に追従）
//   ・将来「鎧」「ローブ」等を追加するときはこの関数を参考に
// ============================================================
function createTShirt(color, targetGroup, data) {

    // ── マテリアル ──────────────────────────────────────────
    const shirtMat = new THREE.MeshLambertMaterial({
        color: color,
        side: THREE.DoubleSide,
    });

    // ── clothesGroup：服全体をまとめるグループ ──────────────
    const clothesGroup = new THREE.Group();
    clothesGroup.name = 'clothesGroup';

    // ============================================================
    // 【胴体 上部】半楕円ドーム＋首穴
    // 設計図①: 胸部楕円の上側を微増した半楕円スキン
    // 設計図②: 中央に首球体半径(neckR=0.27)の穴
    // ============================================================
    // chest上端y≈2.42、ドーム半径≈0.68（肩をカバー）
    const domeY    = 2.10;  // ドーム底面（首が見えるよう下げる）
    const domeR    = 0.68;  // 横半径（肩をカバー）
    const domeH    = 0.38;  // ドームの高さ（半楕円）
    const neckHole = 0.30;  // 首穴半径（neckR=0.27より少し大きめ）
    const segments = 32;

    // SphereGeometryの上半分を使ってドームを作る
    // phiStart=0, phiLength=π → 上半球
    // 首穴：thetaStart=arcsin(neckHole/domeR)で中央を開ける
    const domeGeo = new THREE.SphereGeometry(
        domeR,      // radius
        segments,   // widthSegments
        16,         // heightSegments
        0,          // phiStart
        Math.PI * 2,// phiLength（全周）
        Math.asin(neckHole / domeR), // thetaStart：首穴の角度から始める
        Math.PI / 2 // thetaLength：上半球のみ
    );
    // Y方向をdomeH/domeRで圧縮して半楕円に
    // Z方向を0.72倍で前後を薄く
    const domePos = domeGeo.attributes.position;
    for (let i = 0; i < domePos.count; i++) {
        domePos.setY(i, domePos.getY(i) * (domeH / domeR));
        domePos.setZ(i, domePos.getZ(i) * 0.72);
    }
    domePos.needsUpdate = true;
    domeGeo.computeVertexNormals();

    const dome = new THREE.Mesh(domeGeo, shirtMat);
    dome.name = 'shirtDome';
    dome.position.y = domeY;
    clothesGroup.add(dome);

    // 首穴の縁取り（TorusGeometry）
    const collarGeo = new THREE.TorusGeometry(neckHole, 0.035, 8, 32);
    const collar = new THREE.Mesh(collarGeo, shirtMat);
    collar.name = 'shirtCollar';
    collar.rotation.x = Math.PI / 2; // 水平に寝かせる
    collar.position.y = domeY + domeH * 0.95;
    clothesGroup.add(collar);

    // ============================================================
    // 【胴体 下部】ドーム底面(y=domeY)から股下(y=0.65)まで円錐台
    // 設計図③: 楕円端から股下まで円錐台を伸ばす
    // ============================================================
    const skirtH   = domeY - 0.65;  // ≈1.77
    // heightSegments：元は1（上端→下端の直線テーパーのみ）。
    // 裾だけをなだらかに広げるための下記フレア処理に必要な分割数を確保する。
    // ★ジオメトリの三角形が増えるだけで、フレア処理を除けば見た目は従来と同じ。
    const skirtHeightSegs = 12;
    const skirtGeo = new THREE.CylinderGeometry(
        domeR,        // radiusTop: ドーム底面と同じ半径（＝胸・肩まわりの基準。ここは変更しない）
        domeR * 0.92, // radiusBottom: 裾の基準半径（従来通り）
        skirtH,
        segments,
        skirtHeightSegs,
        true  // openEnded
    );

    // ── 裾（下端）付近だけを外側へなだらかに広げる ──────────────────
    // 目的：スカート（下半身）と重ねたときに、スカートの端がTシャツの
    //       外側へ飛び出して見える問題の緩和。
    // 方針：胸・肩まわり（上側）の形状は一切変更せず、下端に近づくにつれて
    //       半径を少しずつ広げ、最下端で「現在の裾半径(domeR*0.92)の約1.2倍」
    //       を目安にする（smoothstepでなだらかに繋ぎ、段差を作らない）。
    const flareStartT   = 0.55; // これを超えた高さ割合(0=上端/1=下端)だけ広げる。胸・胴体上部には掛からない
    const flareMaxExtra  = 0.2;  // 最下端での追加割合（+20%＝約1.2倍）
    const skirtPos = skirtGeo.attributes.position;
    for (let i = 0; i < skirtPos.count; i++) {
        const y = skirtPos.getY(i); // ローカルY：+skirtH/2(上端)〜-skirtH/2(下端)
        const t = (skirtH / 2 - y) / skirtH; // 0(上端)〜1(下端)
        if (t > flareStartT) {
            const raw  = (t - flareStartT) / (1 - flareStartT);
            const ease = raw * raw * (3 - 2 * raw); // smoothstep：急な折れ目を作らない
            const scale = 1 + flareMaxExtra * ease;
            skirtPos.setX(i, skirtPos.getX(i) * scale);
            skirtPos.setZ(i, skirtPos.getZ(i) * scale);
        }
    }
    skirtPos.needsUpdate = true;

    // Z方向を0.72倍にして楕円断面（既存処理。上のフレアは楕円比を保ったまま拡大する）
    for (let i = 0; i < skirtPos.count; i++) {
        skirtPos.setZ(i, skirtPos.getZ(i) * 0.72);
    }
    skirtPos.needsUpdate = true;
    skirtGeo.computeVertexNormals();

    const skirt = new THREE.Mesh(skirtGeo, shirtMat);
    skirt.name = 'shirtSkirt';
    skirt.position.y = domeY - skirtH / 2;
    clothesGroup.add(skirt);

    // ============================================================
    // 【胸カバー】bustSize連動で胸球体を服色で覆う
    // ① 左右の胸の間を埋める円柱（谷間カバー）
    // ② 左右それぞれ外側を服色球体で覆う
    // chest(y=2.0)の子 bustL/R の位置に合わせる
    // bustL: position(+0.26, 0.15, p), bustR: position(-0.26, 0.15, p)
    // ============================================================
    if (data.bustSize > 0) {
        const b   = data.bustSize;
        const p   = data.bustProtrude;
        const br  = 0.22 * b;       // 胸球体の半径
        const cr  = br * 1.08;      // カバー半径（胸より少し大き目）

        // chestメッシュを探す（y≈2.0）
        let chestMesh = null;
        targetGroup.traverse(obj => {
            if (obj.isMesh && Math.abs(obj.position.y - 2.0) < 0.05
                && !obj.name.startsWith('shirt')) {
                chestMesh = obj;
            }
        });

        if (chestMesh) {
            // ① 谷間円柱：左右胸中心(x=±0.26)の間を埋める
            //    半径=cr、高さ=左右間距離(0.52)、中心x=0
            const bridgeGeo = new THREE.CylinderGeometry(cr, cr, 0.36, 20);
            bridgeGeo.rotateZ(Math.PI / 2); // X方向に横倒し
            const bridge = new THREE.Mesh(bridgeGeo, shirtMat);
            bridge.name = 'bustBridge';
            bridge.position.set(0, -0.05, p);
            chestMesh.add(bridge);
            clothesGroup.userData.bustBridge = bridge;

            // ② 左右それぞれ外側を球体で覆う
            const coverGeoL = new THREE.SphereGeometry(cr, 16, 16);
            const coverL = new THREE.Mesh(coverGeoL, shirtMat);
            coverL.name = 'bustCoverL';
            coverL.position.set(0.17, -0.05, p);
            chestMesh.add(coverL);

            const coverGeoR = new THREE.SphereGeometry(cr, 16, 16);
            const coverR = new THREE.Mesh(coverGeoR, shirtMat);
            coverR.name = 'bustCoverR';
            coverR.position.set(-0.17, -0.05, p);
            chestMesh.add(coverR);

            // clothesGroupに参照を保持（削除時に使用）
            clothesGroup.userData.bustCovers = [bridge, coverL, coverR];
        }
    }

    targetGroup.add(clothesGroup);

    // ============================================================
    // 【袖】左右別Mesh — 肩関節(shoulder)の子として追加
    // 理由：腕の回転アニメーションに自動追従させるため
    // ============================================================
    // shoulderは createArm() 内で characterGroup に add されている
    // ここでは characterGroup の子を走査して肩を探す
    function addSleeve(shoulderMesh, side) {
        // 半袖：短い開口円筒
        const sleeveGeo = new THREE.CylinderGeometry(
            0.24,  // 上端（肩側）：肩関節を余裕を持って覆う
            0.21,  // 下端（腕側）：腕に向かってやや細く
            0.42,  // 長さ
            16, 1, true // openEnded
        );
        // 袖口（下端）をふさぐ円
        const cuffGeo = new THREE.CircleGeometry(0.21, 16);

        const sleeve = new THREE.Mesh(sleeveGeo, shirtMat);
        const cuff   = new THREE.Mesh(cuffGeo, shirtMat);
        sleeve.name = `sleeve_${side}`;
        cuff.name   = `cuff_${side}`;

        // 円筒を腕方向（X軸）に向ける
        sleeve.rotation.z = Math.PI / 2;
        cuff.rotation.z   = Math.PI / 2;

        // 肩関節中心から腕方向にオフセット
        const offsetX = (side === 'L') ? 0.21 : -0.21;
        sleeve.position.set(offsetX, 0, 0);
        cuff.position.set(offsetX * 2, 0, 0);

        shoulderMesh.add(sleeve);
        shoulderMesh.add(cuff);
    }

    // characterGroup 直下の Mesh を走査して肩(y≈2.3)を特定
    targetGroup.children.forEach(child => {
        if (child.isMesh && Math.abs(child.position.y - 2.15) < 0.05) {
            if (child.position.x > 0) {
                addSleeve(child, 'L');
            } else if (child.position.x < 0) {
                addSleeve(child, 'R');
            }
        }
    });

    return clothesGroup; // 参照を返す（削除・切り替え用）
}

// ============================================================
// 軽装プレートアーマー：胸当て（前後一体型）
// ============================================================
// 【設計方針】
//   ・createTShirt()と同じドーム＋胴体円錐台の座標系を流用し、
//     形状は前後がつながった1枚の一体シェルとして生成（前後別パーツにはしない）
//   ・素材だけをLambert(甲冑色)＋金の縁取りに変更し「鎧」らしい質感にする
//   ・胸の膨らみ（bustSize/bustProtrude）にも追従してカバーする
//   ・肩当て・篭手は次のステップで追加するため、袖は作らない
// ============================================================
function createBreastplate(data, targetGroup) {

    const plateColor = data.plateColor || '#d8dce0';
    const trimColor  = data.plateTrimColor || '#d4af37';
    const plateMat = new THREE.MeshLambertMaterial({ color: plateColor, side: THREE.DoubleSide });
    const trimMat  = new THREE.MeshLambertMaterial({ color: trimColor });

    const breastplateGroup = new THREE.Group();
    breastplateGroup.name = 'breastplateGroup';

    // ── 上部：肩をカバーする半楕円ドーム＋首穴（Tシャツと同じ座標系） ──
    const domeY    = 2.10;
    const domeR    = 0.68;
    const domeH    = 0.38;
    const neckHole = 0.30;
    const segments = 32;

    const domeGeo = new THREE.SphereGeometry(
        domeR, segments, 16,
        0, Math.PI * 2,
        Math.asin(neckHole / domeR),
        Math.PI / 2
    );
    const domePos = domeGeo.attributes.position;
    for (let i = 0; i < domePos.count; i++) {
        domePos.setY(i, domePos.getY(i) * (domeH / domeR));
        domePos.setZ(i, domePos.getZ(i) * 0.72);
    }
    domePos.needsUpdate = true;
    domeGeo.computeVertexNormals();

    const dome = new THREE.Mesh(domeGeo, plateMat);
    dome.name = 'breastplateDome';
    dome.position.y = domeY;
    breastplateGroup.add(dome);

    // 首まわりの金縁
    const collarGeo = new THREE.TorusGeometry(neckHole, 0.04, 8, 32);
    const collar = new THREE.Mesh(collarGeo, trimMat);
    collar.name = 'breastplateCollar';
    collar.rotation.x = Math.PI / 2;
    collar.position.y = domeY + domeH * 0.95;
    breastplateGroup.add(collar);

    // ── 下部：胴体（円錐台）。裾は少し絞り、下端に金縁を巻く ──
    const skirtH = domeY - 0.65;
    const skirtTopR = domeR;
    const skirtBotR = domeR * 0.92;
    const skirtGeo = new THREE.CylinderGeometry(skirtTopR, skirtBotR, skirtH, segments, 1, true);
    const skirtPos = skirtGeo.attributes.position;
    for (let i = 0; i < skirtPos.count; i++) {
        skirtPos.setZ(i, skirtPos.getZ(i) * 0.72);
    }
    skirtPos.needsUpdate = true;
    skirtGeo.computeVertexNormals();

    const skirt = new THREE.Mesh(skirtGeo, plateMat);
    skirt.name = 'breastplateSkirt';
    skirt.position.y = domeY - skirtH / 2;
    breastplateGroup.add(skirt);

    // 裾（腰まわり）の金縁トリム
    // 円環は回転前のローカルY軸が回転後のワールドZ軸になるため、
    // ワールドZ方向を0.72倍にするにはローカルscale.yを0.72にする
    const hemGeo = new THREE.TorusGeometry(skirtBotR, 0.035, 8, segments);
    const hem = new THREE.Mesh(hemGeo, trimMat);
    hem.name = 'breastplateHem';
    hem.rotation.x = Math.PI / 2;
    hem.scale.set(1, 0.72, 1);
    hem.position.y = domeY - skirtH;
    breastplateGroup.add(hem);

    // ── 胸の膨らみカバー：bustSize連動でchestの胸球体を甲冑色で覆う ──
    if (data.bustSize > 0) {
        const b  = data.bustSize;
        const p  = data.bustProtrude;
        const cr = (0.22 * b) * 1.08;

        let chestMesh = null;
        targetGroup.traverse(obj => {
            if (obj.isMesh && Math.abs(obj.position.y - 2.0) < 0.05
                && !obj.name.startsWith('shirt') && !obj.name.startsWith('breastplate')) {
                chestMesh = obj;
            }
        });

        if (chestMesh) {
            const bridgeGeo = new THREE.CylinderGeometry(cr, cr, 0.36, 20);
            bridgeGeo.rotateZ(Math.PI / 2);
            const bridge = new THREE.Mesh(bridgeGeo, plateMat);
            bridge.name = 'breastplateBridge';
            bridge.position.set(0, -0.05, p);
            chestMesh.add(bridge);

            const coverL = new THREE.Mesh(new THREE.SphereGeometry(cr, 16, 16), plateMat);
            coverL.name = 'breastplateCoverL';
            coverL.position.set(0.17, -0.05, p);
            chestMesh.add(coverL);

            const coverR = new THREE.Mesh(new THREE.SphereGeometry(cr, 16, 16), plateMat);
            coverR.name = 'breastplateCoverR';
            coverR.position.set(-0.17, -0.05, p);
            chestMesh.add(coverR);

            breastplateGroup.userData.bustCovers = [bridge, coverL, coverR];
        }
    }

    targetGroup.add(breastplateGroup);
    return breastplateGroup;
}

// ============================================================
// 軽装プレートアーマー：肩当て（左右）
// ============================================================
// 【設計方針】
//   ・shoulder関節(createArm内、characterGroup直下、y≈2.15)の子として追加し、
//     腕の回転・ポーズ変更に自動追従させる（袖と同じ考え方）
//   ・丸みのある小さなドーム＋縁取りリングのみのシンプルな構造（v1）
// ============================================================
function createShoulderArmor(data, targetGroup) {
    const plateColor = data.plateColor || '#d8dce0';
    const trimColor  = data.plateTrimColor || '#d4af37';
    const plateMat = new THREE.MeshLambertMaterial({ color: plateColor });
    const trimMat  = new THREE.MeshLambertMaterial({ color: trimColor });

    function buildPauldron() {
        const p = new THREE.Group();
        p.name = 'pauldron';

        // 肩関節を覆う丸いキャップ
        const capR = 0.30;
        const capThetaLen = Math.PI / 1.8;
        const capGeo = new THREE.SphereGeometry(capR, 16, 12, 0, Math.PI * 2, 0, capThetaLen);
        const cap = new THREE.Mesh(capGeo, plateMat);
        p.add(cap);

        // キャップ下端の金縁トリム
        const ringR = capR * Math.sin(capThetaLen);
        const ringY = capR * Math.cos(capThetaLen);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.03, 8, 24), trimMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = ringY;
        p.add(ring);

        return p;
    }

    // characterGroup直下のMeshを走査してshoulder(y≈2.15)を特定
    // ※createTShirt()のaddSleeve探索ロジックと同じ考え方
    targetGroup.children.forEach(child => {
        if (child.isMesh && Math.abs(child.position.y - 2.15) < 0.05) {
            const pauldron = buildPauldron();
            pauldron.position.set(0, 0.06, 0); // 関節球より少し上に載せる
            child.add(pauldron);
        }
    });
}

// ============================================================
// フリル帯（波打つジグザグの縁）生成ヘルパー
// ============================================================
// 【設計方針】
//   ・CylinderGeometryと同じ角度基準（θ=0が正面+Z、x=radius*sinθ、
//     z=radius*cosθ*zScale）を採用し、エプロン等の円弧パーツと
//     位置・向きをぴったり一致させられるようにする。
//   ・内側（付け根）の輪と、外側（ひだ先。山/谷を交互に繰り返す）の輪を
//     2段のリボン状メッシュとして帯状に結ぶ、低ポリのギザギザ表現。
//   ・山（peak）はやや外側かつ下に垂れ、谷はその手前で止めることで、
//     単純なノコギリ波よりも布のフリルらしい丸みのある印象にする。
function createFrillStrip(radius, y, zScale, arcStart, arcSpan, color, opts = {}) {
    const {
        segments = 24, // 円弧の分割数（ひだの密度の基準）
        waveAmp  = 0.05, // 山（ひだ先）の張り出し量
        dropAmp  = 0.03, // 山がやや下に垂れる量
        closed   = false, // true: 円弧の始点と終点を繋いで輪にする
    } = opts;

    const mat = new THREE.MeshLambertMaterial({ color: color, side: THREE.DoubleSide });
    const cols = segments + 1;
    const positions = new Float32Array(2 * cols * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pos = geo.attributes.position;

    for (let i = 0; i <= segments; i++) {
        const u = arcStart + arcSpan * (i / segments);
        const sinU = Math.sin(u), cosU = Math.cos(u);
        const peak = (i % 2 === 0);
        const outerR = radius + (peak ? waveAmp : waveAmp * 0.3);
        const outerY = y - (peak ? dropAmp : dropAmp * 0.3);

        pos.setXYZ(i, radius * sinU, y, radius * cosU * zScale);           // 内側（付け根）
        pos.setXYZ(cols + i, outerR * sinU, outerY, outerR * cosU * zScale); // 外側（ひだ先）
    }

    const indices = [];
    for (let i = 0; i < segments; i++) {
        const i2 = (closed && i === segments - 1) ? 0 : i + 1;
        indices.push(i, cols + i, i2,  i2, cols + i, cols + i2);
    }
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return new THREE.Mesh(geo, mat);
}

// ============================================================
// 小さなリボン（蝶結び）生成ヘルパー
// ============================================================
// 胸元のリボンと、カチューシャ前面の飾り房の両方で使い回す。
function createBowAccent(mat, size = 1) {
    const group = new THREE.Group();
    const wingGeo = new THREE.SphereGeometry(0.09 * size, 12, 10);
    const wingL = new THREE.Mesh(wingGeo, mat);
    wingL.scale.set(1, 0.62, 0.55);
    wingL.position.set(0.085 * size, 0, 0);
    group.add(wingL);
    const wingR = new THREE.Mesh(wingGeo, mat);
    wingR.scale.set(1, 0.62, 0.55);
    wingR.position.set(-0.085 * size, 0, 0);
    group.add(wingR);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05 * size, 10, 8), mat);
    group.add(knot);
    return group;
}

// ============================================================
// 上半身衣装：メイド服上（旧・メイド服ワンピースの上半分＋襟＋リボン＋胸当て）
// ============================================================
// 【衣装分離について】
//   ・以前はこの関数（createMaidOutfit）が「上半身＋下半身」の
//     ワンピース全体（股下近くまで伸びる一枚布）を生成していた。
//   ・今回、上半身用に分離した版がこの createMaidTop()。股下までの
//     ワンピースをやめ、腰の高さ(waistY)で本体・エプロンを打ち切る。
//     下半身（黒いロングスカート＋前面の白いエプロン＋各種フリル）は
//     createMaidBottom()（本ファイル内、下方）が別途担当する。
//   ・waistY は、旧ワンピース版のウエストタイ帯（旧maidWaistband）と
//     全く同じ計算式で求めており、旧デザインの腰位置から見た目が
//     ずれないようにしている。
// 【設計方針（旧版から変更なし）】
//   ・本体（ドーム＋胴体円錐台）は createTShirt() と全く同じ座標系
//     （domeY/domeR/domeH/neckHole/segments）を流用し、既存の服・胸の
//     膨らみ・下半身スカートとのサイズ・位置関係を完全に一致させる。
//   ・エプロンは本体と同じ円錐台の座標系を、正面だけの円弧
//     （CylinderGeometryのthetaStart/thetaLength）で流用し、本体表面の
//     曲面に沿わせることで「浮いて見える」「めり込む」を防ぐ。
//   ・白いパフスリーブは肩関節メッシュが存在しないと追従先が無いため、
//     この関数では作らない。addMaidSleeves()（本ファイル内）を
//     腕生成後にcharacter-body.js側から別途呼び出す。
//   ・カチューシャ（頭部アクセサリー）はメイド服本体から独立しており、
//     この関数では生成しない。createHeadband()（本ファイル内、下方）を
//     character-body.js側の頭部アクセサリー選択（headAccessory）から
//     別途呼び出す。
function createMaidTop(data, targetGroup) {

    const dressColor  = data.maidColor || '#2b2b36';         // 黒〜濃紺の本体
    const ribbonColor = data.maidRibbonColor || '#1c1c24';   // 黒〜濃色の小さなリボン

    const dressMat  = new THREE.MeshLambertMaterial({ color: dressColor, side: THREE.DoubleSide });
    const whiteMat  = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide });
    const ribbonMat = new THREE.MeshLambertMaterial({ color: ribbonColor });

    const maidGroup = new THREE.Group();
    maidGroup.name = 'maidTopGroup';

    // ── 本体上部：半楕円ドーム＋首穴（createTShirt()と同じ座標系） ──
    const domeY    = 2.10;
    const domeR    = 0.68;
    const domeH    = 0.38;
    const neckHole = 0.30;
    const segments = 32;

    const domeGeo = new THREE.SphereGeometry(
        domeR, segments, 16,
        0, Math.PI * 2,
        Math.asin(neckHole / domeR),
        Math.PI / 2
    );
    const domePos = domeGeo.attributes.position;
    for (let i = 0; i < domePos.count; i++) {
        domePos.setY(i, domePos.getY(i) * (domeH / domeR));
        domePos.setZ(i, domePos.getZ(i) * 0.72);
    }
    domePos.needsUpdate = true;
    domeGeo.computeVertexNormals();

    const dome = new THREE.Mesh(domeGeo, dressMat);
    dome.name = 'maidDome';
    dome.position.y = domeY;
    maidGroup.add(dome);

    // ── 腰の高さ(waistY)を求める ──
    // ★重要：「腰から下」を担当する黒いロングスカート（createDynamicSkirt）は、
    //   常に腰の基準点(pelvisメッシュ＝character-body.js側で position.y = 1.1)の
    //   ちょうどその高さから、半径0の点として始まり、膝に向かって徐々に広がる
    //   構造になっている（腰のすぐ下ではまだ裾が細く、骨盤をほとんど覆わない）。
    //   そのため、メイド服上の下端(waistY)を骨盤の高さ(1.1)より高い位置で
    //   打ち切ってしまうと、メイド服上の裾とスカートが実際に広がり始める位置との
    //   間に「何も覆っていない隙間」ができてしまう。
    //   これを避けるため、waistYは既存スカート機構の起点と全く同じ高さ(1.1)に
    //   合わせる（＝character-body.js の `pelvis.position.y = 1.1` と同じ値）。
    //   これにより、メイド服上の裾＝スカートの最も細くなる起点、という
    //   継ぎ目のない自然な繋がりになる。
    const legacyHemY = 0.65;              // 旧本体（ワンピース）裾Y：半径テーパー計算の基準としてのみ使用
    const waistY = 1.1;                   // 骨盤(pelvis)の高さと同じ＝既存スカート機構の起点と一致させる

    // 旧本体(domeY→legacyHemY)と同じ半径テーパー（Yに対して線形）を使い、
    // 任意の高さyにおける本体半径を求めるヘルパー
    function maidBodyRadiusAtY(y) {
        const t = (domeY - y) / (domeY - legacyHemY); // 0(上端)〜1(旧裾)
        return domeR + (domeR * 0.92 - domeR) * t;
    }

    // ── 本体下部：胴体（円錐台）。ドーム底面から「腰(waistY)」までで打ち切る ──
    // ★衣装分離：以前は股下(y=0.65)まで伸びるワンピースだったが、
    //   メイド服上はここで終了。下半身はメイド服下(createMaidBottom)が担当する。
    const bodyH = domeY - waistY;
    const bodyBotR = maidBodyRadiusAtY(waistY);
    const bodyGeo = new THREE.CylinderGeometry(domeR, bodyBotR, bodyH, segments, 1, true);
    const bodyPos = bodyGeo.attributes.position;
    for (let i = 0; i < bodyPos.count; i++) {
        bodyPos.setZ(i, bodyPos.getZ(i) * 0.72);
    }
    bodyPos.needsUpdate = true;
    bodyGeo.computeVertexNormals();

    const body = new THREE.Mesh(bodyGeo, dressMat);
    body.name = 'maidBody';
    body.position.y = domeY - bodyH / 2;
    maidGroup.add(body);

    // ── 胸の膨らみカバー：bustSize連動でchestの胸球体を本体色で覆う（旧版から変更なし） ──
    if (data.bustSize > 0) {
        const b  = data.bustSize;
        const p  = data.bustProtrude;
        const cr = (0.22 * b) * 1.08;

        let chestMesh = null;
        targetGroup.traverse(obj => {
            if (obj.isMesh && Math.abs(obj.position.y - 2.0) < 0.05
                && !obj.name.startsWith('shirt') && !obj.name.startsWith('breastplate') && !obj.name.startsWith('maid')) {
                chestMesh = obj;
            }
        });

        if (chestMesh) {
            const bridgeGeo = new THREE.CylinderGeometry(cr, cr, 0.36, 20);
            bridgeGeo.rotateZ(Math.PI / 2);
            const bridge = new THREE.Mesh(bridgeGeo, dressMat);
            bridge.name = 'maidBustBridge';
            bridge.position.set(0, -0.05, p);
            chestMesh.add(bridge);

            const coverL = new THREE.Mesh(new THREE.SphereGeometry(cr, 16, 16), dressMat);
            coverL.name = 'maidBustCoverL';
            coverL.position.set(0.17, -0.05, p);
            chestMesh.add(coverL);

            const coverR = new THREE.Mesh(new THREE.SphereGeometry(cr, 16, 16), dressMat);
            coverR.name = 'maidBustCoverR';
            coverR.position.set(-0.17, -0.05, p);
            chestMesh.add(coverR);

            maidGroup.userData.bustCovers = [bridge, coverL, coverR];
        }
    }

    // ── 白い丸襟（旧版から変更なし） ──
    const collarGeo = new THREE.TorusGeometry(neckHole + 0.02, 0.045, 8, 32);
    const collar = new THREE.Mesh(collarGeo, whiteMat);
    collar.name = 'maidCollar';
    collar.rotation.x = Math.PI / 2;
    collar.position.y = domeY + domeH * 0.95;
    maidGroup.add(collar);

    // ── 胸元の小さなリボン（旧版から変更なし） ──
    const ribbonGroup = createBowAccent(ribbonMat, 1);
    ribbonGroup.name = 'maidRibbon';
    ribbonGroup.position.set(0, domeY + domeH * 0.55, domeR * 0.72 * 0.98);
    maidGroup.add(ribbonGroup);

    // ── 白い胸当て／上部エプロン（胴体前面。本体と同じ円錐台の座標系を正面の
    //    円弧だけで流用し、本体表面よりわずかに外側に浮かせて重ねる） ──
    // ★衣装分離：以前は股下近くまで伸びる一枚のエプロンだったが、腰(waistY)で
    //   打ち切り「白い胸当て／上部エプロン」としてメイド服上に含める。
    //   腰から下の白いエプロン部分・その裾フリルはメイド服下(createMaidBottom)
    //   側が新規に担当する。
    const apronMargin = 1.05;          // 本体表面からのオフセット（X方向）
    const apronZScale = 0.72 * 1.08;   // 本体のZ圧縮(0.72)＋前方マージン
    const halfSpan    = 0.95;          // 前面カバー角度（左右合わせて約109°）
    const apronTopY   = domeY + 0.04;    // 襟のすぐ下から（旧版と同じ値）
    const apronBotY   = waistY;          // 腰まで（旧デザインの股下ではなく、腰で打ち切る）
    const apronTopR   = domeR * apronMargin;
    const apronBotR   = maidBodyRadiusAtY(waistY) * apronMargin;

    const apronGeo = new THREE.CylinderGeometry(
        apronTopR, apronBotR, apronTopY - apronBotY, segments, 1, true,
        -halfSpan, halfSpan * 2 // thetaStart, thetaLength：正面(+Z)中心の円弧
    );
    const apronPos = apronGeo.attributes.position;
    for (let i = 0; i < apronPos.count; i++) {
        apronPos.setZ(i, apronPos.getZ(i) * apronZScale);
    }
    apronPos.needsUpdate = true;
    apronGeo.computeVertexNormals();

    const apron = new THREE.Mesh(apronGeo, whiteMat);
    apron.name = 'maidApron';
    apron.position.y = (apronTopY + apronBotY) / 2;
    maidGroup.add(apron);

    // ── エプロン上端の白いフリル（襟元。旧版から変更なし） ──
    const apronTopFrill = createFrillStrip(apronTopR, apronTopY, apronZScale, -halfSpan, halfSpan * 2, '#ffffff', {
        segments: 24, waveAmp: 0.045, dropAmp: 0.02, closed: false,
    });
    apronTopFrill.name = 'maidApronTopFrill';
    maidGroup.add(apronTopFrill);

    // ── 腰のタイ帯（本体を1周する白い細帯）── メイド服上の下端＝メイド服下との境目に配置
    const waistband = new THREE.Mesh(new THREE.TorusGeometry(apronBotR, 0.028, 8, segments), whiteMat);
    waistband.name = 'maidWaistband';
    waistband.rotation.x = Math.PI / 2;
    waistband.scale.set(1, apronZScale, 1); // ワールドZ方向をapronZScale分だけ圧縮（breastplateHemと同じ手法）
    waistband.position.y = waistY;
    maidGroup.add(waistband);

    targetGroup.add(maidGroup);
    return maidGroup; // 参照を返す（renderOrder設定用）
}

// ============================================================
// 後方互換：旧関数名 createMaidOutfit() のエイリアス
// ============================================================
// 「メイド服の構造分離」より前は、この関数名1つで上半身＋下半身の
// ワンピース全体を生成していた。分離後の実装は createMaidTop()
// （このファイル内、上）に統合したため、ここでは互換ラッパーとして
// createMaidTop() を呼ぶだけにしている。createMaidOutfit()を直接
// 呼び出している既存コードが万一残っていても壊れないようにするための
// 後方互換で、この関数自体は削除していない。
function createMaidOutfit(data, targetGroup) {
    return createMaidTop(data, targetGroup);
}

// ============================================================
// 頭部アクセサリー：カチューシャ
// ============================================================
// 【設計方針】
//   ・以前はメイド服(createMaidOutfit)の一部として自動生成していたが、
//     「メイド服を選ぶと自動でカチューシャが付く」仕様を廃止し、頭の
//     選択（headAccessory）から独立して選べるようにするため、この
//     共通関数として切り出した。
//   ・見た目は、添付の参照モデル（headband01.html／バンド＋左右キャップ
//     ＋波打つフリル＋中央と左右のリボン）をそのまま移植したもの。
//     参照モデルは半径10を基準に設計されているため、頭部にフィットする
//     よう縮小率0.112倍（旧カチューシャのbandR=1.12相当）で包んでいる。
//   ・マテリアルはツール全体の流儀に合わせ、参照モデルの
//     MeshStandardMaterial(roughness)からMeshLambertMaterialへ変更した
//     （色は同一）。
//   ・headMeshは半径1の単位球ベース（髪と同じローカル座標系）という
//     前提は変わらない。頭部の造形（顔・髪・目・眉・口）は一切変更せず、
//     髪の外側に被せる装飾として追加する（ヘルメットと同じ考え方）。
function createHeadband(headMesh) {
    if (!headMesh) return null;

    const headband = new THREE.Group();
    headband.name = 'maidHeadband';

    // ── 参照モデル（headband01.html）の座標系そのままで組み立てる ──
    const refGroup = new THREE.Group();
    refGroup.name = 'maidHeadbandRef';

    const radius = 10;
    const blackColor = '#181818';

    // (A) バンド本体
    const bandGeo = new THREE.TorusGeometry(radius, 0.15, 16, 64, Math.PI);
    const bandMat = new THREE.MeshLambertMaterial({ color: '#dddddd' });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.name = 'maidHeadbandBand';
    refGroup.add(band);

    // (B) 両端キャップ
    const capGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16);
    const capMat = new THREE.MeshLambertMaterial({ color: blackColor });

    const rightCap = new THREE.Mesh(capGeo, capMat);
    rightCap.name = 'maidHeadbandCapR';
    rightCap.position.set(radius, 0, 0);
    refGroup.add(rightCap);

    const leftCap = new THREE.Mesh(capGeo, capMat);
    leftCap.name = 'maidHeadbandCapL';
    leftCap.position.set(-radius, 0, 0);
    refGroup.add(leftCap);

    // (C) フリル部分（波打つ縁を頂点操作で作る）
    const frillGeo = new THREE.RingGeometry(radius - 0.2, radius + 3, 128, 8, 0, Math.PI);
    const frillMat = new THREE.MeshLambertMaterial({
        color: '#ffffff',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
    });
    const frill = new THREE.Mesh(frillGeo, frillMat);
    frill.name = 'maidHeadbandFrill';

    const fPos = frillGeo.attributes.position;
    const v = new THREE.Vector3();
    const innerR = radius - 0.2;
    const outerR = radius + 3;

    for (let i = 0; i < fPos.count; i++) {
        v.fromBufferAttribute(fPos, i);
        const angle = Math.atan2(v.y, v.x);
        const widthScale = Math.sin(angle);
        const r = Math.sqrt(v.x * v.x + v.y * v.y);

        if (r > innerR + 0.01) {
            const normalizedR = (r - innerR) / (outerR - innerR);
            const newR = innerR + (outerR - innerR) * normalizedR * (0.2 + 0.8 * widthScale);
            v.x = Math.cos(angle) * newR;
            v.y = Math.sin(angle) * newR;
        }

        const freq = 60;
        const wave = Math.sin(angle * freq);
        const newR2 = Math.sqrt(v.x * v.x + v.y * v.y);
        const factor = (newR2 - innerR) / (outerR - innerR);
        const amplitude = 1.0 * widthScale;

        v.z = wave * amplitude * factor;
        fPos.setXYZ(i, v.x, v.y, v.z);
    }
    frillGeo.computeVertexNormals();

    frill.rotation.x = -0.2;
    frill.position.z = -0.3;
    refGroup.add(frill);

    // (D) リボン生成ヘルパー（中央は房なし、左右は垂れ房つき）
    function createHeadbandBow(colorHex, hasTails) {
        const group = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({ color: colorHex });

        const knotGeo = new THREE.BoxGeometry(0.8, 1.2, 0.6);
        const knot = new THREE.Mesh(knotGeo, mat);
        group.add(knot);

        const loopGeo = new THREE.TorusGeometry(1.2, 0.6, 16, 32);

        const rightLoop = new THREE.Mesh(loopGeo, mat);
        rightLoop.position.set(1.5, 0, 0);
        rightLoop.scale.set(1, 0.6, 0.2);
        rightLoop.rotation.y = 0.2;
        group.add(rightLoop);

        const leftLoop = new THREE.Mesh(loopGeo, mat);
        leftLoop.position.set(-1.5, 0, 0);
        leftLoop.scale.set(1, 0.6, 0.2);
        leftLoop.rotation.y = -0.2;
        group.add(leftLoop);

        if (hasTails) {
            const tailGeo = new THREE.BoxGeometry(0.5, 3.5, 0.05);
            tailGeo.translate(0, -1.75, 0);

            const rightTail = new THREE.Mesh(tailGeo, mat);
            rightTail.position.set(0.2, -0.4, -0.2);
            rightTail.name = 'rightTail';
            group.add(rightTail);

            const leftTail = new THREE.Mesh(tailGeo, mat);
            leftTail.position.set(-0.2, -0.4, -0.2);
            leftTail.name = 'leftTail';
            group.add(leftTail);
        }
        return group;
    }

    const centerBow = createHeadbandBow(blackColor, false);
    centerBow.name = 'maidHeadbandBowCenter';
    centerBow.scale.set(2.0, 2.0, 2.0);
    centerBow.position.set(0, radius + 0.8, 0.8);
    centerBow.rotation.x = -0.1;
    refGroup.add(centerBow);

    const rightBow = createHeadbandBow(blackColor, true);
    rightBow.name = 'maidHeadbandBowR';
    rightBow.scale.set(0.8, 0.8, 0.8);
    const angleR = Math.PI * 0.15;
    rightBow.position.set(Math.cos(angleR) * (radius + 0.2), Math.sin(angleR) * (radius + 0.2), 0.5);
    rightBow.rotation.z = angleR - Math.PI / 2;
    const rTail1 = rightBow.getObjectByName('rightTail');
    const lTail1 = rightBow.getObjectByName('leftTail');
    if (rTail1) rTail1.rotation.z = -(angleR - Math.PI / 2) - 0.3;
    if (lTail1) lTail1.rotation.z = -(angleR - Math.PI / 2) + 0.3;
    refGroup.add(rightBow);

    const leftBow = createHeadbandBow(blackColor, true);
    leftBow.name = 'maidHeadbandBowL';
    leftBow.scale.set(0.8, 0.8, 0.8);
    const angleL = Math.PI * 0.85;
    leftBow.position.set(Math.cos(angleL) * (radius + 0.2), Math.sin(angleL) * (radius + 0.2), 0.5);
    leftBow.rotation.z = angleL - Math.PI / 2;
    const rTail2 = leftBow.getObjectByName('rightTail');
    const lTail2 = leftBow.getObjectByName('leftTail');
    if (rTail2) rTail2.rotation.z = -(angleL - Math.PI / 2) - 0.3;
    if (lTail2) lTail2.rotation.z = -(angleL - Math.PI / 2) + 0.3;
    refGroup.add(leftBow);

    // headは半径1の単位球ベース。参照モデルは半径10基準の設計のため、
    // 髪の外側（半径1.05前後）に収まるサイズへ縮小する
    // （旧カチューシャのbandR=1.12相当＝0.112倍）。
    const fitScale = 1.12 / radius;
    refGroup.scale.setScalar(fitScale);
    // 頭の中心を貫通せず額寄りに乗って見えるよう少し前方へオフセット
    // （旧カチューシャのband.position.z = 0.12を踏襲）。
    refGroup.position.z = 0.12;

    headband.add(refGroup);
    headMesh.add(headband);
    return headband;
}

// ============================================================
// メイド服：白いパフスリーブ＋白い袖口
// ============================================================
// 【設計方針】
//   ・createTShirt()内のaddSleeve()と同じ理由（腕の回転アニメーションに
//     自動追従させるため）で、肩関節(shoulder)の子として追加する。
//   ・肩関節メッシュはcreateArm()実行時点でようやく生成されるため、
//     createMaidOutfit()の中では呼ばず、character-body.js側で
//     createArm()×2の直後（軽装プレートアーマーの肩当てと同じ場所）に
//     呼び出している。
function addMaidSleeves(targetGroup) {
    const whiteMat = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide });

    function addPuffSleeve(shoulderMesh, side) {
        // ★修正（肩露出バグ）：以前はoffsetXでパフスリーブ本体を肩関節中心から
        //   横へずらして配置しており、その分だけ内側の肩関節（素体）がパフスリーブの
        //   外へ露出して見えていた。
        //   → パフスリーブ中心を肩関節中心（=shoulderMeshの原点、オフセットなし）に一致させる。
        //   半径は既存の肩関節ジオメトリ（bigJointGeo）から実際の半径を取得し、
        //   「肩関節直径×1.2」を基準値として動的に算出する（固定値の埋め込みを避ける）。
        const shoulderRadius = (shoulderMesh.geometry && shoulderMesh.geometry.parameters
            && shoulderMesh.geometry.parameters.radius) || 0.2;
        const puffRadius = shoulderRadius * 1.2;

        // パフスリーブ本体（ぷっくりした半球状。肩関節を覆う）
        const puffGeo = new THREE.SphereGeometry(puffRadius, 16, 12);
        const puff = new THREE.Mesh(puffGeo, whiteMat);
        puff.name = `maidPuff_${side}`;
        puff.scale.set(1, 0.85, 1);
        // 位置は指定しない＝shoulderMeshの原点（肩関節の中心）にそのまま一致させる
        shoulderMesh.add(puff);

        // 白い袖口（パフの少し先、腕に巻きつく細いリング）
        // ★追加修正：袖口は固定オフセット(0.36)のままだと、パフスリーブを
        //   肩関節中心に収めた分だけ半径が縮み(0.27→puffRadius)、パフと袖口の間に
        //   隙間ができて素体の腕（円柱）が浮いて見えてしまう。
        //   → 袖口の位置をパフスリーブの外周を基準に算出し、少し重ねて隙間なく繋げる。
        const cuffHalfWidth = 0.05; // CylinderGeometryのheight(0.10)の半分。回転後は腕方向の厚み
        const cuffOverlap = 0.02;   // パフスリーブ表面への食い込み量（隙間防止の余裕）
        const cuffOffsetMagnitude = puffRadius + cuffHalfWidth - cuffOverlap;
        const cuffOffsetX = (side === 'L') ? cuffOffsetMagnitude : -cuffOffsetMagnitude;
        const cuffGeo = new THREE.CylinderGeometry(0.155, 0.145, 0.10, 14);
        const cuff = new THREE.Mesh(cuffGeo, whiteMat);
        cuff.name = `maidCuff_${side}`;
        cuff.rotation.z = Math.PI / 2;
        cuff.position.set(cuffOffsetX, -0.02, 0);
        shoulderMesh.add(cuff);
    }

    // characterGroup直下のMeshを走査してshoulder(y≈2.15)を特定
    // ※createTShirt()のaddSleeve探索ロジックと同じ考え方
    targetGroup.children.forEach(child => {
        if (child.isMesh && Math.abs(child.position.y - 2.15) < 0.05) {
            if (child.position.x > 0) {
                addPuffSleeve(child, 'L');
            } else if (child.position.x < 0) {
                addPuffSleeve(child, 'R');
            }
        }
    });
}

// ============================================================
// 下半身装備：ズボン（ヒップ部）
// ============================================================
// 太もも/膝/すね/裾は createLeg() 内でボーン直下に生成（既存構造を維持）。
// ここではヒップ（pelvis）を包む部分だけを担当する。
function createPants(color, targetGroup, pelvisMesh) {
    const pantsMat = new THREE.MeshLambertMaterial({ color: color });
    // pelvis（肌）を隠す
    pelvisMesh.visible = false;
    // pelvisを包むズボンヒップ
    const pPelvisGeo = new THREE.SphereGeometry(0.52, 20, 16);
    const pPelvis = new THREE.Mesh(pPelvisGeo, pantsMat);
    pPelvis.name = 'pantsPelvis';
    pPelvis.scale.set(1.20, 0.82, 0.76);
    pPelvis.position.y = 1.1;
    targetGroup.add(pPelvis);
    return pPelvis;
}

// ============================================================
// 下半身装備：スカート（腰・左右膝ボーン追従の動的版）
// ============================================================
// 【経緯】
// v1: 円錐台1本の静的パーツ → キック等で脚が貫通して見える
// v2: 左右の脚それぞれに独立した円柱(カプセル)を追従させる方式に変更
//     → 半径を裾に向けて広げた結果、左右のカプセルの円が
//       互いの中心を追い越して重なり、裾のあたりで断面同士が
//       ねじれて交差する見た目になってしまった（左右の円は
//       単純な2本の独立した円では、半径が脚の間隔の半分を超えた
//       瞬間に必ず交差する）。
// v3(今回): 左右の膝を「開口部の円」とみなし、その2つの円を
//     直線でつなぐ＝陸上トラックのような「スタジアム(カプセル)型」
//     の輪郭を1周分だけ作る。左右それぞれの半円＋それをつなぐ
//     直線の組み合わせなので、原理的に自己交差しない。
//     この輪郭を腰(1点)〜裾(スタジアム型)まで階層状にロフトして
//     1枚のメッシュにし、毎フレーム頂点座標だけを書き換える。
//     （腰では左右の中心が一致するため、スタジアム型は自然に
//       ただの円に縮退する）
//
// ※ characterGroup（キャラ全体のルート）自体は常に原点固定・無回転だが、
//   プレビュー用の横回転ラッパー（characterRotateWrapper）が親として
//   回転することがある。そのため、取得したワールド座標は
//   _skirtWorldToLocalMatrix() で求めた逆行列でスカートGroupの
//   ローカル座標へ変換してから使う（回転0°の時は単位行列＝従来と同値）。
//
// 再利用オブジェクト（フレーム毎の new Vector3 を避けるため
// モジュールスコープで1回だけ生成し使い回す）
// スカート系Group（skirtGroup等）のローカル座標へワールド座標を変換するための逆行列。
// 呼び出しのたびに内容が上書きされる使い回し用（毎フレームのnewを避ける）。
const _skirtInvTmp = new THREE.Matrix4();
function _skirtWorldToLocalMatrix(group) {
    group.updateWorldMatrix(true, false);
    return _skirtInvTmp.copy(group.matrixWorld).invert();
}
const _dynSkirtTmp = {
    waistPos: new THREE.Vector3(),
    kneePos: [new THREE.Vector3(), new THREE.Vector3()],
    cL: new THREE.Vector3(), // その段(row)における左脚側の開口部中心
    cR: new THREE.Vector3(), // その段(row)における右脚側の開口部中心
};

function createDynamicSkirt(color, targetGroup, waistRef, legs) {
    const skirtMat = new THREE.MeshLambertMaterial({
        color: color,
        side: THREE.DoubleSide,
    });

    // ── 寸法 ──
    const waistR  = 0.58;  // 腰側の半径（1点に縮退した円）
    const hemR    = 0.80;  // 裾側の半径（左右の膝それぞれを囲む円）
    // 腰→膝の何%の位置で裾にするか。膝ボーンぴったりまで伸ばすと
    // 膝を丸ごと覆ってしまうため、手前で止めて元の膝を露出させる。
    const hemFrac = 0.80;
    const rows      = 6; // 腰(row0)〜裾(row rows-1)の輪切り段数
    const halfSegs  = 8; // 半円あたりの分割数（1周 = halfSegs*2）
    const segsPerRing = halfSegs * 2;

    const skirtGroup = new THREE.Group();
    skirtGroup.name = 'dynamicSkirtGroup';

    // ── 側面：腰〜裾をrows段の「スタジアム型リング」でロフトした1枚メッシュ ──
    const sidePositions = new Float32Array(rows * segsPerRing * 3);
    const sideGeo = new THREE.BufferGeometry();
    sideGeo.setAttribute('position', new THREE.BufferAttribute(sidePositions, 3));
    const sideIndices = [];
    for (let r = 0; r < rows - 1; r++) {
        for (let s = 0; s < segsPerRing; s++) {
            const s2 = (s + 1) % segsPerRing;
            const a = r * segsPerRing + s;
            const b = r * segsPerRing + s2;
            const c = (r + 1) * segsPerRing + s;
            const d = (r + 1) * segsPerRing + s2;
            sideIndices.push(a, c, b,  b, c, d);
        }
    }
    sideGeo.setIndex(sideIndices);
    const sideMesh = new THREE.Mesh(sideGeo, skirtMat);
    sideMesh.name = 'skirtSide';
    skirtGroup.add(sideMesh);

    // ★裾の蓋は付けない：閉じると床のような見た目になり不自然なため、
    //   スカートらしく裾は開けたまま（sideMeshのみ＝上下ともopenEnded）にする。

    targetGroup.add(skirtGroup);

    return {
        group: skirtGroup,
        waistRef,                                    // 腰の基準（pelvisメッシュ）
        kneeRefs: [legs[0].joint, legs[1].joint],     // 左膝・右膝（hip配下のknee Group）
        sideMesh,
        rows,
        segsPerRing,
        halfSegs,
        waistR,
        hemR,
        hemFrac,
    };
}

// createCharacter()のanimate()ループから毎フレーム呼び出す。
// 腰・左右膝の現在のワールド座標を取得し、各段(row)ごとに
// 「左右の開口部円をつないだスタジアム型」の頂点を計算し直す。
function updateDynamicSkirt(skirt) {
    if (!skirt) return;
    const t = _dynSkirtTmp;

    // 【重要】renderer.render()の直前に呼ぶだけだとmatrixWorldが
    // 前フレームの値のままなので、参照ボーンだけを明示的に更新する
    // （characterGroup全体をupdateMatrixWorld()するより軽い）。
    const inv = _skirtWorldToLocalMatrix(skirt.group);
    skirt.waistRef.updateWorldMatrix(true, false);
    t.waistPos.setFromMatrixPosition(skirt.waistRef.matrixWorld).applyMatrix4(inv);
    for (let i = 0; i < 2; i++) {
        skirt.kneeRefs[i].updateWorldMatrix(true, false);
        t.kneePos[i].setFromMatrixPosition(skirt.kneeRefs[i].matrixWorld).applyMatrix4(inv);
    }

    const sidePos = skirt.sideMesh.geometry.attributes.position;
    const segsPerRing = skirt.segsPerRing;
    const halfSegs = skirt.halfSegs;
    const angleStep = Math.PI / (halfSegs - 1); // 半円をhalfSegs点で「両端含めて」等分

    for (let r = 0; r < skirt.rows; r++) {
        const f = (r / (skirt.rows - 1)) * skirt.hemFrac; // 0(腰)〜hemFrac(裾)
        const radius = skirt.waistR + (skirt.hemR - skirt.waistR) * (r / (skirt.rows - 1));

        t.cL.lerpVectors(t.waistPos, t.kneePos[0], f); // 左脚側の開口部中心
        t.cR.lerpVectors(t.waistPos, t.kneePos[1], f); // 右脚側の開口部中心

        // 2つの中心を結ぶ方向(along)と、それに直交する方向(side)。
        // X-Z平面（水平面）内で計算する。腰(row0)では cL==cR になるため
        // 方向が定まらず、その場合はワールドX軸にフォールバックする
        // （その場合スタジアム型は自然にただの円へ縮退する）。
        let alongX = t.cR.x - t.cL.x, alongZ = t.cR.z - t.cL.z;
        let alen = Math.sqrt(alongX * alongX + alongZ * alongZ);
        if (alen < 1e-4) { alongX = 1; alongZ = 0; alen = 1; }
        alongX /= alen; alongZ /= alen;
        const sideX = -alongZ, sideZ = alongX; // 90度回転させた向き

        for (let s = 0; s < segsPerRing; s++) {
            const isRightArc = s < halfSegs; // 前半=右脚側の半円、後半=左脚側の半円
            const localAngle = isRightArc
                ? (-Math.PI / 2 + s * angleStep)
                : (Math.PI / 2 + (s - halfSegs) * angleStep);
            const cx = Math.cos(localAngle), sn = Math.sin(localAngle);
            const cenX = isRightArc ? t.cR.x : t.cL.x;
            const cenY = isRightArc ? t.cR.y : t.cL.y;
            const cenZ = isRightArc ? t.cR.z : t.cL.z;
            const px = cenX + radius * (cx * alongX + sn * sideX);
            const pz = cenZ + radius * (cx * alongZ + sn * sideZ);

            const idx = r * segsPerRing + s;
            sidePos.setXYZ(idx, px, cenY, pz);
        }
    }

    sidePos.needsUpdate = true;
    skirt.sideMesh.geometry.computeVertexNormals();
}

function disposeDynamicSkirt(skirt) {
    if (!skirt || !skirt.group) return;
    skirt.group.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((mat) => {
                if (mat.map) mat.map.dispose();
                mat.dispose();
            });
        }
    });
    if (skirt.group.parent) skirt.group.parent.remove(skirt.group);
}

// ============================================================
// 下半身装備：ロングスカートの裾延長パーツ
// ============================================================
// 【添付アイデアどおりの設計】
//   ・「スカート」本体（createDynamicSkirt／updateDynamicSkirt）は
//     一切変更しない。ロングスカートはその裾にこのパーツを
//     「継ぎ足す」ことで実現する。
//   ・足首の球中心から足先(つま先)までの長さを footLen とし、
//     footLen の2倍を半径とする球を左右の足首にそれぞれ置き、
//     その2球をつないだ「カプセル型」（スカート本体と同じ、
//     左右の円を直線でつなぐスタジアム型の輪郭を使うので
//     自己交差しない）を作る。
//   ・スカート本体の裾（開口部）とこのカプセル型を輪切りロフトで
//     つなぎ、カプセル型の方は足首の中心からfootLen分だけ下で
//     水平にカットして新たな開口部（＝ロングスカートの裾）とする。
//     球の断面公式 r(d) = √(R²−d²) （R=半径, d=球中心からの高さ）を使い、
//     カット面での開口部半径を求めている。
//
//   footLen の内訳（createLeg内のfoot/bareFootGroup形状より算出）：
//     ankle→foot オフセット      = (0, -0.10, +0.18)
//     foot→sole中心             = (0,  0,    +0.08)
//     sole半径0.20 × 奥行き倍率1.6 = 0.32（つま先方向への張り出し）
//     水平方向の合計 = 0.18+0.08+0.32 = 0.58 / 垂直オフセット = -0.10
//     footLen = √(0.58² + 0.10²) ≈ 0.59
const FOOT_LEN     = 0.59;
const CAPSULE_R     = FOOT_LEN * 2;                              // 「球を2倍」＝カプセル最大半径
const CAPSULE_CUT_DROP = FOOT_LEN;                                // 足首中心からこの分下でカット
const CAPSULE_CUT_R    = Math.sqrt(CAPSULE_R * CAPSULE_R - CAPSULE_CUT_DROP * CAPSULE_CUT_DROP); // カット面の開口部半径
const LONGSKIRT_T_PEAK = 0.6; // 全行の何%地点で最大膨らみ(CAPSULE_R)に達するか（0〜1）
// ★裾の長さ調整：腰位置を基準点として、腰〜裾の縦方向の長さをこの倍率にする。
//   （スカート本体の横幅・厚み・カプセル半径には一切影響しない）
const LONGSKIRT_HEM_LENGTH_RATIO = 0.8;

function _longSkirtSmoothstep(x) {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
}

// 再利用オブジェクト（毎フレームnew Vector3しないため使い回す）
const _longSkirtTmp = {
    waistPos: new THREE.Vector3(),
    kneePos: [new THREE.Vector3(), new THREE.Vector3()],
    anklePos: [new THREE.Vector3(), new THREE.Vector3()],
    hemC: [new THREE.Vector3(), new THREE.Vector3()],  // スカート本体の裾（継ぎ目）中心
    cutC: [new THREE.Vector3(), new THREE.Vector3()],  // カット面（新しい開口部）中心
    cL: new THREE.Vector3(),
    cR: new THREE.Vector3(),
};

// skirt: createDynamicSkirt()の戻り値（本体が無ければロングスカートも作らない）
// legs: animatedParts.legs（各要素に .ankle が必要）
function createLongSkirtExtension(color, targetGroup, skirt, legs) {
    if (!skirt) return null;

    const mat = new THREE.MeshLambertMaterial({
        color: color,
        side: THREE.DoubleSide,
    });

    const rows = 6; // 継ぎ目(row0)〜カット面(row rows-1)の輪切り段数
    // スカート本体と同じ分割数を使うことで、継ぎ目の頂点数がぴったり一致し
    // 隙間なくつながる。
    const segsPerRing = skirt.segsPerRing;
    const halfSegs     = skirt.halfSegs;

    const group = new THREE.Group();
    group.name = 'longSkirtExtGroup';

    const positions = new Float32Array(rows * segsPerRing * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const indices = [];
    for (let r = 0; r < rows - 1; r++) {
        for (let s = 0; s < segsPerRing; s++) {
            const s2 = (s + 1) % segsPerRing;
            const a = r * segsPerRing + s;
            const b = r * segsPerRing + s2;
            const c = (r + 1) * segsPerRing + s;
            const d = (r + 1) * segsPerRing + s2;
            indices.push(a, c, b,  b, c, d);
        }
    }
    geo.setIndex(indices);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'longSkirtSide';
    group.add(mesh);

    // ★裾（カット面）の蓋も付けない：スカート本体と同じく開けたままにする。
    targetGroup.add(group);

    return {
        group,
        mesh,
        waistRef: skirt.waistRef,                              // 腰の基準（スカート本体と共有）
        kneeRefs: skirt.kneeRefs,                               // 左右膝（スカート本体と共有）
        ankleRefs: [legs[0].ankle, legs[1].ankle],              // 左右足首
        rows, segsPerRing, halfSegs,
        hemR: skirt.hemR, hemFrac: skirt.hemFrac,               // スカート本体の裾と完全一致させる継ぎ目情報
    };
}

// createCharacter()のanimate()ループから毎フレーム呼び出す。
// スカート本体の裾（継ぎ目）〜足首下のカット面までを輪切りロフトし直す。
function updateLongSkirtExtension(ext) {
    if (!ext) return;
    const t = _longSkirtTmp;

    const inv = _skirtWorldToLocalMatrix(ext.group);
    ext.waistRef.updateWorldMatrix(true, false);
    t.waistPos.setFromMatrixPosition(ext.waistRef.matrixWorld).applyMatrix4(inv);
    for (let i = 0; i < 2; i++) {
        ext.kneeRefs[i].updateWorldMatrix(true, false);
        t.kneePos[i].setFromMatrixPosition(ext.kneeRefs[i].matrixWorld).applyMatrix4(inv);
        ext.ankleRefs[i].updateWorldMatrix(true, false);
        t.anklePos[i].setFromMatrixPosition(ext.ankleRefs[i].matrixWorld).applyMatrix4(inv);

        // 継ぎ目＝スカート本体の裾中心（本体のupdateDynamicSkirtと同じ式）
        t.hemC[i].lerpVectors(t.waistPos, t.kneePos[i], ext.hemFrac);
        // カット面＝足首中心からfootLen分だけ真下
        t.cutC[i].copy(t.anklePos[i]);
        t.cutC[i].y -= CAPSULE_CUT_DROP;
        // ★裾を80%化：腰位置(waistPos.y)を基準点として固定し、
        //   「腰から裾までの縦方向の長さ」だけをLONGSKIRT_HEM_LENGTH_RATIO倍にする
        //   （単純なカット面の縮小ではなく、腰基準の縦方向のみの調整）。
        t.cutC[i].y = t.waistPos.y - (t.waistPos.y - t.cutC[i].y) * LONGSKIRT_HEM_LENGTH_RATIO;
    }

    const sidePos = ext.mesh.geometry.attributes.position;
    const segsPerRing = ext.segsPerRing;
    const halfSegs = ext.halfSegs;
    const angleStep = Math.PI / (halfSegs - 1);

    for (let r = 0; r < ext.rows; r++) {
        const rf = r / (ext.rows - 1); // 0(継ぎ目)〜1(カット面)

        // 半径：継ぎ目(hemR)→最大膨らみ(CAPSULE_R)→カット面(CAPSULE_CUT_R)
        // の2段階smoothstepで、球をfootLen分下でカットした形の裾広がりを作る。
        let radius;
        if (rf <= LONGSKIRT_T_PEAK) {
            radius = ext.hemR + (CAPSULE_R - ext.hemR) * _longSkirtSmoothstep(rf / LONGSKIRT_T_PEAK);
        } else {
            radius = CAPSULE_R + (CAPSULE_CUT_R - CAPSULE_R) * _longSkirtSmoothstep((rf - LONGSKIRT_T_PEAK) / (1 - LONGSKIRT_T_PEAK));
        }

        t.cL.lerpVectors(t.hemC[0], t.cutC[0], rf);
        t.cR.lerpVectors(t.hemC[1], t.cutC[1], rf);

        let alongX = t.cR.x - t.cL.x, alongZ = t.cR.z - t.cL.z;
        let alen = Math.sqrt(alongX * alongX + alongZ * alongZ);
        if (alen < 1e-4) { alongX = 1; alongZ = 0; alen = 1; }
        alongX /= alen; alongZ /= alen;
        const sideX = -alongZ, sideZ = alongX;

        for (let s = 0; s < segsPerRing; s++) {
            const isRightArc = s < halfSegs;
            const localAngle = isRightArc
                ? (-Math.PI / 2 + s * angleStep)
                : (Math.PI / 2 + (s - halfSegs) * angleStep);
            const cx = Math.cos(localAngle), sn = Math.sin(localAngle);
            const cenX = isRightArc ? t.cR.x : t.cL.x;
            const cenY = isRightArc ? t.cR.y : t.cL.y;
            const cenZ = isRightArc ? t.cR.z : t.cL.z;
            const px = cenX + radius * (cx * alongX + sn * sideX);
            const pz = cenZ + radius * (cx * alongZ + sn * sideZ);

            const idx = r * segsPerRing + s;
            sidePos.setXYZ(idx, px, cenY, pz);
        }
    }

    sidePos.needsUpdate = true;
    ext.mesh.geometry.computeVertexNormals();
}

function disposeLongSkirtExtension(ext) {
    if (!ext || !ext.group) return;
    ext.group.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((mat) => {
                if (mat.map) mat.map.dispose();
                mat.dispose();
            });
        }
    });
    if (ext.group.parent) ext.group.parent.remove(ext.group);
}

// ============================================================
// 下半身装備：メイド服下（黒いロングスカート＋前面の白いエプロン＋裾フリル）
// ============================================================
// 【設計方針】
//   ・黒いロングスカート本体は、既存の createDynamicSkirt() と
//     createLongSkirtExtension() を「一切変更せず」そのまま呼び出して
//     作る（呼び出し時の色に maidColor を渡すだけ）。これにより、
//     腰・左右の膝・足首へのポーズ追従は通常の「ロングスカート」と
//     全く同じ仕組みがそのまま使われる。
//   ・白いエプロンは、スカート本体（createDynamicSkirt）と同じ
//     「腰・左右膝を結ぶスタジアム型ロフト」の計算式を、前面だけの
//     列に絞って複製したもの。スカート本体の半径よりわずかに外側
//     （apronMargin倍）に浮かせることで、重なって見えつつZファイト
//     しないようにしている。スカートの裾延長（createLongSkirtExtension）
//     までは伸ばさず、スカート本体の範囲（腰〜膝ヒダ）だけをカバーする。
//   ・裾フリル（エプロン先端／スカート裾）は、毎フレーム計算し直される
//     エプロン最終段・スカート裾延長の最終段の頂点をその都度読み取り、
//     そこから外向きにジグザグへ押し出して作る。フリル自体も動的に
//     追従するため、脚を動かしてもエプロンやスカートから浮いたり
//     置き去りになったりしない。
// ============================================================

// エプロン前面ストリップの再利用オブジェクト（毎フレームnew Vector3しないため使い回す）
const _maidBottomTmp = {
    waistPos: new THREE.Vector3(),
    kneePos: [new THREE.Vector3(), new THREE.Vector3()],
    cL: new THREE.Vector3(),
    cR: new THREE.Vector3(),
};

// count個の頂点列から、内側(そのまま)＋外側(ジグザグに押し出した)の
// 2段リボン状メッシュを作る（createFrillStrip()と同じ考え方だが、
// 円弧の数式ではなく「毎フレーム渡される実座標の配列」から生成する版）。
// closed=true: 列の始点と終点をつないで輪にする（スカート裾用）
// closed=false: 開いたストリップのまま（エプロン先端用）
function createMaidFrillMesh(color, count, closed) {
    const mat = new THREE.MeshLambertMaterial({ color: color, side: THREE.DoubleSide });
    const positions = new Float32Array(2 * count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const indices = [];
    const segCount = closed ? count : count - 1;
    for (let i = 0; i < segCount; i++) {
        const i2 = closed ? (i + 1) % count : i + 1;
        indices.push(i, count + i, i2,  i2, count + i, count + i2);
    }
    geo.setIndex(indices);
    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
}

// points（THREE.Vector3の配列、1段ぶんの頂点）から、frillMeshの頂点を
// 毎フレーム更新する。外向き方向は、そのリング／ストリップ自身の
// 重心から各点へのXZ方向で近似する（山＝偶数番目をより外側・下向きに）。
function updateMaidFrillMesh(frillMesh, points, waveAmp, dropAmp) {
    const n = points.length;
    let cx = 0, cz = 0;
    for (let i = 0; i < n; i++) { cx += points[i].x; cz += points[i].z; }
    cx /= n; cz /= n;

    const pos = frillMesh.geometry.attributes.position;
    for (let i = 0; i < n; i++) {
        const p = points[i];
        pos.setXYZ(i, p.x, p.y, p.z);

        let dx = p.x - cx, dz = p.z - cz;
        const dl = Math.sqrt(dx * dx + dz * dz) || 1;
        dx /= dl; dz /= dl;

        const peak = (i % 2 === 0);
        const extra = peak ? waveAmp : waveAmp * 0.3;
        const drop  = peak ? dropAmp : dropAmp * 0.3;
        pos.setXYZ(n + i, p.x + dx * extra, p.y - drop, p.z + dz * extra);
    }
    pos.needsUpdate = true;
    frillMesh.geometry.computeVertexNormals();
}

// skirt: createDynamicSkirt()の戻り値／legs: animatedParts.legs
function createMaidBottom(data, targetGroup, waistRef, legs) {
    const dressColor = data.maidColor || '#2b2b36';
    const whiteColor = '#ffffff';

    // ① 黒いロングスカート本体：既存の動的スカート機構を無改造のまま再利用
    const skirt = createDynamicSkirt(dressColor, targetGroup, waistRef, legs);
    const ext   = createLongSkirtExtension(dressColor, targetGroup, skirt, legs);

    // ② 白いエプロン（前面のみ）：スカート本体と同じロフト式を前寄りの列だけ複製
    const apronMargin = 1.06; // スカート表面よりわずかに外側へ浮かせ、Zファイトを防ぐ
    const halfSegs = skirt.halfSegs;
    const segsPerRing = skirt.segsPerRing;
    const frontHalf = Math.min(3, halfSegs - 1); // 前面ストリップの片側の列数
    const apronCols = frontHalf * 2;
    const apronRows = skirt.rows; // スカート本体（腰〜膝ヒダ）と同じ範囲。裾延長までは伸ばさない

    // ★前面(+Z)の位置：updateDynamicSkirt()と同じ角度基準では、
    //   s列の「中央」(s=halfSegs-1〜halfSegs、右アーチと左アーチの境目)ではなく、
    //   「両端」(s=segsPerRing-1〜0、輪の繋ぎ目)が前面(+Z)に当たる
    //   （中央は逆に背面(-Z)）。そのため前面ストリップはs=0側とs=segsPerRing-1側の
    //   両端をまたいで選ぶ。
    const sList = [];
    for (let i = 0; i < frontHalf; i++) sList.push((segsPerRing - frontHalf + i) % segsPerRing); // 左アーチ側の終端寄り（前面）
    for (let i = 0; i < frontHalf; i++) sList.push(i);                                            // 右アーチ側の始端寄り（前面）

    const apronMat = new THREE.MeshLambertMaterial({ color: whiteColor, side: THREE.DoubleSide });
    const apronPositions = new Float32Array(apronRows * apronCols * 3);
    const apronGeo = new THREE.BufferGeometry();
    apronGeo.setAttribute('position', new THREE.BufferAttribute(apronPositions, 3));
    const apronIndices = [];
    for (let r = 0; r < apronRows - 1; r++) {
        for (let c = 0; c < apronCols - 1; c++) {
            const a = r * apronCols + c;
            const b = r * apronCols + c + 1;
            const cc = (r + 1) * apronCols + c;
            const d = (r + 1) * apronCols + c + 1;
            apronIndices.push(a, cc, b,  b, cc, d);
        }
    }
    apronGeo.setIndex(apronIndices);
    const apronMesh = new THREE.Mesh(apronGeo, apronMat);
    apronMesh.name = 'maidBottomApron';
    targetGroup.add(apronMesh);

    // ③ 裾フリル：エプロン先端（開いたストリップ）／スカート裾延長の最終段（輪）
    const apronFrillMesh = createMaidFrillMesh(whiteColor, apronCols, false);
    apronFrillMesh.name = 'maidBottomApronFrill';
    targetGroup.add(apronFrillMesh);

    const skirtFrillMesh = createMaidFrillMesh(whiteColor, ext.segsPerRing, true);
    skirtFrillMesh.name = 'maidBottomSkirtFrill';
    targetGroup.add(skirtFrillMesh);

    // フリル計算用の再利用Vector3プール（毎フレームnew Vector3しないため使い回す）
    const apronPtsPool = [];
    for (let i = 0; i < apronCols; i++) apronPtsPool.push(new THREE.Vector3());
    const skirtPtsPool = [];
    for (let i = 0; i < ext.segsPerRing; i++) skirtPtsPool.push(new THREE.Vector3());

    return {
        skirt, ext,
        apronMesh, apronFrillMesh, skirtFrillMesh,
        apronRows, apronCols, sList,
        apronPtsPool, skirtPtsPool,
        waistRef, kneeRefs: skirt.kneeRefs,
        waistR: skirt.waistR, hemR: skirt.hemR, hemFrac: skirt.hemFrac, halfSegs: skirt.halfSegs,
        apronMargin,
    };
}

// createCharacter()のanimate()ループから毎フレーム呼び出す。
function updateMaidBottom(mb) {
    if (!mb) return;

    // ① 黒いロングスカート本体：既存の更新関数をそのまま呼ぶ（無改造）
    updateDynamicSkirt(mb.skirt);
    updateLongSkirtExtension(mb.ext);

    // ② 白いエプロン（前面）：スカート本体と同じ腰・左右膝を参照し、
    //    同じロフト式を前寄りの列だけ計算してわずかに外側へオフセットする
    const t = _maidBottomTmp;
    const inv = _skirtWorldToLocalMatrix(mb.apronMesh);
    mb.waistRef.updateWorldMatrix(true, false);
    t.waistPos.setFromMatrixPosition(mb.waistRef.matrixWorld).applyMatrix4(inv);
    for (let i = 0; i < 2; i++) {
        mb.kneeRefs[i].updateWorldMatrix(true, false);
        t.kneePos[i].setFromMatrixPosition(mb.kneeRefs[i].matrixWorld).applyMatrix4(inv);
    }

    const apronPos = mb.apronMesh.geometry.attributes.position;
    const halfSegs = mb.halfSegs;
    const angleStep = Math.PI / (halfSegs - 1);

    // ★along/side（左右の脚を結ぶ方向とその直交方向）は、本来
    //   cR-cL = f*(kneePos[1]-kneePos[0]) であり、fの値に関わらず
    //   方向自体は常に同じ（f=0の腰の行だけが0ベクトルに縮退し、
    //   向きが不定になる）。そのため行ループの中で毎回計算し直すのではなく、
    //   ここで一度だけ「脚同士の位置関係」から直接求めて全行で使い回す。
    //   こうすることで、腰の行（row0）だけ向きが不定になって前面ストリップが
    //   ねじれてしまう問題を避けられる。
    let alongX = t.kneePos[1].x - t.kneePos[0].x, alongZ = t.kneePos[1].z - t.kneePos[0].z;
    let alen = Math.sqrt(alongX * alongX + alongZ * alongZ);
    if (alen < 1e-4) { alongX = 1; alongZ = 0; alen = 1; }
    alongX /= alen; alongZ /= alen;
    const sideX = -alongZ, sideZ = alongX;

    for (let r = 0; r < mb.apronRows; r++) {
        const f = (r / (mb.apronRows - 1)) * mb.hemFrac;
        const radius = (mb.waistR + (mb.hemR - mb.waistR) * (r / (mb.apronRows - 1))) * mb.apronMargin;

        t.cL.lerpVectors(t.waistPos, t.kneePos[0], f);
        t.cR.lerpVectors(t.waistPos, t.kneePos[1], f);

        for (let c = 0; c < mb.apronCols; c++) {
            const s = mb.sList[c];
            const isRightArc = s < halfSegs;
            const localAngle = isRightArc
                ? (-Math.PI / 2 + s * angleStep)
                : (Math.PI / 2 + (s - halfSegs) * angleStep);
            const cx = Math.cos(localAngle), sn = Math.sin(localAngle);
            const cenX = isRightArc ? t.cR.x : t.cL.x;
            const cenY = isRightArc ? t.cR.y : t.cL.y;
            const cenZ = isRightArc ? t.cR.z : t.cL.z;
            const px = cenX + radius * (cx * alongX + sn * sideX);
            const pz = cenZ + radius * (cx * alongZ + sn * sideZ);
            apronPos.setXYZ(r * mb.apronCols + c, px, cenY, pz);
        }
    }
    apronPos.needsUpdate = true;
    mb.apronMesh.geometry.computeVertexNormals();

    // ③ 裾フリル：エプロン先端の段／スカート裾延長の最終段から、その都度動的に生成
    const apronLastRowStart = (mb.apronRows - 1) * mb.apronCols;
    for (let c = 0; c < mb.apronCols; c++) {
        mb.apronPtsPool[c].fromBufferAttribute(apronPos, apronLastRowStart + c);
    }
    updateMaidFrillMesh(mb.apronFrillMesh, mb.apronPtsPool, 0.05, 0.03);

    const extPos = mb.ext.mesh.geometry.attributes.position;
    const extLastRowStart = (mb.ext.rows - 1) * mb.ext.segsPerRing;
    for (let s = 0; s < mb.ext.segsPerRing; s++) {
        mb.skirtPtsPool[s].fromBufferAttribute(extPos, extLastRowStart + s);
    }
    updateMaidFrillMesh(mb.skirtFrillMesh, mb.skirtPtsPool, 0.06, 0.035);
}

function disposeMaidBottom(mb) {
    if (!mb) return;
    disposeLongSkirtExtension(mb.ext);
    disposeDynamicSkirt(mb.skirt);
    [mb.apronMesh, mb.apronFrillMesh, mb.skirtFrillMesh].forEach((mesh) => {
        if (!mesh) return;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat) => mat.dispose());
        }
        if (mesh.parent) mesh.parent.remove(mesh);
    });
}

// ============================================================
// 初期キャラクター生成
// ============================================================
// ★ファイル分割の都合上、この呼び出しは元々 character-body.js 内の
//   createCharacter() 定義直後にあったが、createCharacter() が
//   createTShirt() 等（このファイルの関数）を呼び出すため、
//   それらの読み込み完了後であるこの位置に移動した。
createCharacter(characterData);
