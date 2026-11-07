// ============================================================
// ポーズ → glTFアニメーションクリップ変換
// ============================================================
// 角度(rx=Pitch, ry=Yaw, rz=Roll)をglTFが扱える四元数配列[x,y,z,w]に変換。
// ポーズ編集パネルと同じ anglesToQuaternion（Yaw→Pitch→Rollの合成順）を使うことで、
// 画面上の見た目とGLBエクスポート結果が一致するようにしている。
function eulerToQuatArray(rx = 0, ry = 0, rz = 0) {
    const q = anglesToQuaternion(rx, ry, rz);
    return [q.x, q.y, q.z, q.w];
}

// ポーズで動かす11部品（頭 / 左右の肩・肘・手首 / 左右の股関節・膝）と
// POSESデータ内の対応する回転値を取得する
function getAnimatedJoints() {
    const p = animatedParts;
    return [
        { obj: p.head,          get: pose => pose.head },
        { obj: p.arms[0].root,  get: pose => pose.arms[0].root },
        { obj: p.arms[0].joint, get: pose => pose.arms[0].joint },
        { obj: p.arms[0].wrist, get: pose => pose.arms[0].wrist },
        { obj: p.arms[1].root,  get: pose => pose.arms[1].root },
        { obj: p.arms[1].joint, get: pose => pose.arms[1].joint },
        { obj: p.arms[1].wrist, get: pose => pose.arms[1].wrist },
        { obj: p.legs[0].root,  get: pose => pose.legs[0].root },
        { obj: p.legs[0].joint, get: pose => pose.legs[0].joint },
        { obj: p.legs[1].root,  get: pose => pose.legs[1].root },
        { obj: p.legs[1].joint, get: pose => pose.legs[1].joint },
    ];
}

// ============================================================
// ポーズごとの表情をGLBへ焼き込む仕組み
// ------------------------------------------------------------
// 【重大バグの原因（今回の修正対象）】
// 「表情OFFのポーズで表示するデフォルト顔」を、animatedParts.faceの
// eyesMesh/mouthMesh/eyebrowMeshという“今エディタ画面に表示中のメッシュ”を
// そのまま使い回して実装していた。ところがこれらのメッシュのmaterial.mapは
// applyFaceExpression()によってポーズ切替のたびに直接書き換えられる
// （＝「今表示中の表情」を保持しているだけで、キャラの「本来のデフォルト
// 表情」を表している保証が無い）。そのため、GLB出力の直前にどれかの
// ポーズ（表情ON）を表示・編集していると、その表情がそのまま「デフォルト
// 表情」としてGLB内の全OFFポーズに焼き込まれてしまうバグがあった。
//
// 【解決策】
// 「現在表示中の表情」と「GLBのデフォルト表情」を完全に分離する。
//   ・GLBのデフォルト表情専用メッシュは、characterDataではなく
//     DEFAULT_EXPRESSION定数（キャラタブの固定表情）から都度新規生成する。
//     animatedParts.faceの現在のメッシュ／テクスチャは一切参照しない。
//   ・ライブ表示用のeyesMesh/mouthMesh/eyebrowMeshは、エクスポートの間
//     scaleを0にして完全に除外し、GLBの内容に「今の画面状態」が
//     一切混ざらないようにする（出力後は元のscaleに戻す）。
//   ・表情を使うポーズごとにも、同様に独立した専用メッシュ（バリアント）を
//     都度新規生成する（CanvasTexture／Materialは一切共有しない）。
//   ・各ポーズのクリップは「そのポーズのバリアントだけscale=1で表示、
//     他は全部scale=0で非表示」というscaleトラックを持つ。
//     OFFのポーズは「デフォルト表情専用メッシュ」をscale=1にする。
// 出力が終わったら、この一時メッシュ群は破棄し、ライブ表示メッシュは
// 元のscaleに戻して、エディタ画面には一切影響を残さない。
// ============================================================

// GLB出力専用の「デフォルト表情」メッシュ＋表情ONポーズごとの専用メッシュ（バリアント）を生成する。
// ★必須ルール：
//   ・デフォルト表情は必ずDEFAULT_EXPRESSION（characterDataではなく、
//     キャラタブの固定表情定数）から生成する。animatedParts.faceの
//     現在のメッシュ／テクスチャ／マテリアルは絶対に参照・流用しない。
//   ・各スロットのexpressionから毎回ディープコピー＋新規CanvasTextureを
//     作るため、スロット間・デフォルト・エディタ表示中の現在の顔との間で
//     オブジェクト参照が一切重複しない。
function buildExpressionVariantsForExport() {
    const face = animatedParts.face;
    if (!face) return null;
    const headObj = face.eyesMesh.parent; // headメッシュ
    const variants = [];      // { slotIndex, eyes, mouth, eyebrow }（Meshオブジェクト）
    const disposables = [];   // 出力後に破棄するMaterial/Texture

    // ── ライブ表示メッシュ（今画面に表示中の表情）は、GLBの内容から完全に除外する ──
    // 出力後に元へ戻せるよう、現在のscaleを退避してから0にする
    const liveScales = {
        eyes:    face.eyesMesh.scale.clone(),
        mouth:   face.mouthMesh.scale.clone(),
        eyebrow: face.eyebrowMesh.scale.clone(),
    };
    face.eyesMesh.scale.set(0, 0, 0);
    face.mouthMesh.scale.set(0, 0, 0);
    face.eyebrowMesh.scale.set(0, 0, 0);

    // ── 「本来のデフォルト表情」を、DEFAULT_EXPRESSION定数から独立生成する ──
    // ★禁止パターン：`face.eyesMesh` や `face.eyesMesh.material.map` を
    //   デフォルト表情として使い回すこと。ここでは絶対にそれをしない。
    const defaultEyesMat = new THREE.MeshBasicMaterial({ map: createEyeTexture(DEFAULT_EXPRESSION.eyeType, characterData.eyeColor), transparent: true });
    const defaultEyesMesh = new THREE.Mesh(face.eyesMesh.geometry, defaultEyesMat); // ジオメトリ（形状）のみ共有。テクスチャ/マテリアルは独立
    defaultEyesMesh.position.copy(face.eyesMesh.position);
    headObj.add(defaultEyesMesh);

    const defaultMouthMat = new THREE.MeshBasicMaterial({ map: createMouthTexture(DEFAULT_EXPRESSION.mouthType), transparent: true });
    const defaultMouthMesh = new THREE.Mesh(face.mouthMesh.geometry, defaultMouthMat);
    defaultMouthMesh.position.copy(face.mouthMesh.position);
    headObj.add(defaultMouthMesh);

    const defaultBrowMat = new THREE.MeshBasicMaterial({ map: createEyebrowTexture(DEFAULT_EXPRESSION.eyebrowType), transparent: true });
    const defaultBrowMesh = new THREE.Mesh(face.eyebrowMesh.geometry, defaultBrowMat);
    defaultBrowMesh.position.copy(face.eyebrowMesh.position);
    headObj.add(defaultBrowMesh);

    disposables.push(defaultEyesMat, defaultEyesMat.map, defaultMouthMat, defaultMouthMat.map, defaultBrowMat, defaultBrowMat.map);

    // ── 表情を使うポーズごとに、専用メッシュ（バリアント）を生成する ──
    mySlots.forEach((slot, i) => {
        if (!slot.expressionEnabled) return;
        const expr = cloneExpression(slot.expression);

        const eyesMat = new THREE.MeshBasicMaterial({ map: createEyeTexture(expr.eyeType, characterData.eyeColor), transparent: true });
        const eyesMesh = new THREE.Mesh(face.eyesMesh.geometry, eyesMat); // ジオメトリは元メッシュと共有（形状は同一のため）
        eyesMesh.position.copy(face.eyesMesh.position);
        eyesMesh.scale.set(0, 0, 0); // 既定は非表示。該当ポーズのクリップだけがscale=1にする
        headObj.add(eyesMesh);

        const mouthMat = new THREE.MeshBasicMaterial({ map: createMouthTexture(expr.mouthType), transparent: true });
        const mouthMesh = new THREE.Mesh(face.mouthMesh.geometry, mouthMat);
        mouthMesh.position.copy(face.mouthMesh.position);
        mouthMesh.scale.set(0, 0, 0);
        headObj.add(mouthMesh);

        const browMat = new THREE.MeshBasicMaterial({ map: createEyebrowTexture(expr.eyebrowType), transparent: true });
        const browMesh = new THREE.Mesh(face.eyebrowMesh.geometry, browMat);
        browMesh.position.copy(face.eyebrowMesh.position);
        browMesh.scale.set(0, 0, 0);
        headObj.add(browMesh);

        variants.push({ slotIndex: i, eyes: eyesMesh, mouth: mouthMesh, eyebrow: browMesh });
        disposables.push(eyesMat, eyesMat.map, mouthMat, mouthMat.map, browMat, browMat.map);
    });

    return {
        headObj,
        variants,
        disposables,
        // OFFのポーズが可視トグルの対象にする「本来のデフォルト表情」専用メッシュ
        defaultFace: { eyes: defaultEyesMesh, mouth: defaultMouthMesh, eyebrow: defaultBrowMesh },
        // 出力後に元のscaleへ復元するための情報（ライブ表示メッシュ自体は変更・破棄しない）
        liveFace: { eyesMesh: face.eyesMesh, mouthMesh: face.mouthMesh, eyebrowMesh: face.eyebrowMesh },
        liveScales,
    };
}

// エクスポート用に生成した一時メッシュ群をシーンから取り除き、GPUメモリを解放する。
// ライブ表示メッシュ（エディタ画面用）は破棄せず、退避しておいたscaleに戻すだけにする。
function removeExpressionVariants(ctx) {
    if (!ctx) return;
    ctx.liveFace.eyesMesh.scale.copy(ctx.liveScales.eyes);
    ctx.liveFace.mouthMesh.scale.copy(ctx.liveScales.mouth);
    ctx.liveFace.eyebrowMesh.scale.copy(ctx.liveScales.eyebrow);

    ctx.headObj.remove(ctx.defaultFace.eyes, ctx.defaultFace.mouth, ctx.defaultFace.eyebrow);
    ctx.variants.forEach(v => {
        ctx.headObj.remove(v.eyes, v.mouth, v.eyebrow);
    });
    ctx.disposables.forEach(obj => { if (obj && obj.dispose) obj.dispose(); });
}

// ============================================================
// ポーズごとの小道具（右手武器・左手小道具）をGLBへ焼き込む仕組み
// ------------------------------------------------------------
// 表情バリアント方式（buildExpressionVariantsForExport）と全く同じ考え方：
//   ・今画面に装備中の小道具（ライブ表示用のanimatedParts.sword/shield/harvestBag）は、
//     出力中だけscaleを0にしてGLBの内容から完全に除外し、出力後に元へ戻す。
//   ・実際に必要になる「武器の種類」（キャラのデフォルト＋各ポーズの上書き分。
//     'none'は不要）ごとに専用メッシュ（バリアント）を1つずつ新規生成し、
//     右手首(wrist)の子として追加する。
//   ・左手小道具（'shield'/'harvestBag'）も同じ考え方で、実際に必要になる
//     種類（resolveLeftPropTypeで解決した、キャラのデフォルト＋各ポーズの
//     上書き分。'none'は不要）ごとに1つずつバリアントを生成し、左手首の子にする
//     （★盾専用の1個だけを想定していた旧実装から、武器と同じdict方式に一般化した）。
//   ・各バリアントは「表示切替用の外側Group（wrapper）」でラップする。
//     大剣は内側のcreateSword(2)自体が2倍スケールを持つため、表示切替の
//     scale(0または1)と混ざらないよう、必ずこのwrapperの方をトグルする。
//   ・各ポーズのクリップ（buildPoseClip）で、そのポーズの実効小道具
//     （スロットの上書きがONならその内容、OFFならキャラの現在のデフォルト）に
//     一致するバリアントのwrapperだけscale=1にし、他は全部scale=0にする。
//     右手武器は、表示するバリアントにそのバリアント自身の基準回転（剣と鍬とでは
//     基準姿勢が異なる）＋そのポーズのswordTiltXを反映した回転トラックも足す
//     （左手小道具はポーズによる追加チルトが無いため、可視トグルのみで済ませる）。
// ============================================================
function buildPropVariantsForExport() {
    const p = animatedParts;
    if (!p.arms || p.arms.length < 2) return null;
    const rightWrist = p.arms[1].wrist;
    const leftWrist  = p.arms[0].wrist;

    // ── ライブ表示中の小道具は、GLBの内容から完全に除外する ──
    // 出力後に元へ戻せるよう、現在のscaleを退避してから0にする
    const liveSword      = p.sword      || null;
    const liveShield     = p.shield     || null;
    const liveHarvestBag = p.harvestBag || null;
    const liveBow        = p.bow        || null;
    const liveSwordScale      = liveSword      ? liveSword.scale.clone()      : null;
    const liveShieldScale     = liveShield     ? liveShield.scale.clone()     : null;
    const liveHarvestBagScale = liveHarvestBag ? liveHarvestBag.scale.clone() : null;
    const liveBowScale        = liveBow        ? liveBow.scale.clone()        : null;
    if (liveSword)      liveSword.scale.set(0, 0, 0);
    if (liveShield)     liveShield.scale.set(0, 0, 0);
    if (liveHarvestBag) liveHarvestBag.scale.set(0, 0, 0);
    if (liveBow)        liveBow.scale.set(0, 0, 0); // 編集画面用の弓はGLBから除外（必要な状態の弓だけ下で新規生成する）

    // ── 必要な武器タイプの洗い出し（'none'を除く。デフォルト＋各スロットの上書き） ──
    const neededSwordTypes = new Set();
    const addType = (t) => { if (t && t !== 'none') neededSwordTypes.add(t); };
    // ★釣り竿は曲がり状態ごとに別モデルなので、getPropVariantKey()で 'fishingRod:big' のような
    //   キーに変換して区別する（剣・大剣・鍬・ジョウロは従来どおりswordTypeそのまま）。
    addType(getPropVariantKey(cloneProps(characterData)));
    mySlots.forEach(slot => { if (slot.propsEnabled && slot.props) addType(getPropVariantKey(cloneProps(slot.props))); });

    // ── 必要な左手小道具タイプの洗い出し（'shield'/'harvestBag'。'none'を除く） ──
    // ★武器と同じ考え方：デフォルト＋各スロットの上書きぶんを全部洗い出し、
    //   type毎に1つずつバリアントを作る（resolveLeftPropTypeで旧hasShield形式も解決する）
    const neededLeftTypes = new Set();
    const addLeftType = (t) => { if (t && t !== 'none') neededLeftTypes.add(t); };
    // ★弓は状態ごとに別モデルなので、getLeftPropVariantKey()で 'bow:drawn' のようなキーにして区別する。
    //   弓ポーズ（slot.bowState）の状態も反映するため、各ポーズの実効設定（getExportProps）から洗い出す。
    addLeftType(getLeftPropVariantKey(cloneProps(characterData)));
    mySlots.forEach(slot => addLeftType(getLeftPropVariantKey(getExportProps(slot))));

    // ── 武器バリアントを生成：type -> { wrapper, baseRotation } ──
    const swordVariants = {};
    neededSwordTypes.forEach(type => {
        const wrapper = new THREE.Group();
        wrapper.name = 'propVariant_' + type;
        let inner, baseRotation;
        if (type === 'hoe') {
            inner = createHoe();
            baseRotation = HOE_BASE_ROTATION;
        } else if (type === 'wateringCan') {
            inner = createWateringCan();
            baseRotation = WATERING_CAN_BASE_ROTATION;
        } else if (type.startsWith('fishingRod:')) {
            inner = createFishingRod(type.slice('fishingRod:'.length)); // 'fishingRod:slight' → 'slight'
            baseRotation = FISHING_ROD_BASE_ROTATION;
        } else if (type === 'axe') {
            inner = createAxe();
            baseRotation = AXE_BASE_ROTATION;
        } else {
            inner = createSword(type === 'greatsword' ? 2 : 1); // 大剣スケールは内側のcreateSword自身が持つ
            baseRotation = SWORD_BASE_ROTATION;
        }
        wrapper.add(inner);
        wrapper.scale.set(0, 0, 0); // 既定は非表示。各クリップのトラックで必要な時だけ表示する
        rightWrist.add(wrapper);
        swordVariants[type] = { wrapper, baseRotation };
    });

    // ── 釣り竿だけは「静止状態」でも表示しておく ──
    // アニメーションクリップを再生しないGLBビューアでも、釣り竿がキャラクターと一緒に
    // 見えるようにするため。今画面に出している小道具（アクティブなポーズの上書き、
    // 無ければキャラのデフォルト）が釣り竿なら、その曲がり状態の変種だけを初期表示にし、
    // 向きも画面に出している竿（liveSword）と同じにする。クリップ再生中は従来どおり、
    // 各クリップのscale/quaternionトラックが上書きするので、アニメーションの内容は変わらない。
    // ★剣・大剣・鍬・ジョウロの扱い（クリップ再生時のみ表示）は従来のままで、ここでは変更しない。
    {
        const slotNow = (typeof activeSlotIndex !== 'undefined' && activeSlotIndex >= 0) ? mySlots[activeSlotIndex] : null;
        const liveKey = getPropVariantKey(getEffectiveProps(slotNow));
        const v = swordVariants[liveKey];
        // 斧も、アニメを再生しないGLBビューアで見えるよう釣り竿と同じく静止状態で表示する
        if (v && (liveKey.startsWith('fishingRod:') || liveKey === 'axe')) {
            v.wrapper.scale.set(1, 1, 1);
            if (liveSword) v.wrapper.rotation.copy(liveSword.rotation);
            else v.wrapper.rotation.set(v.baseRotation.x, v.baseRotation.y, v.baseRotation.z);
        }
    }

    // ── 左手小道具バリアントを生成：type -> { wrapper } ──
    // ★盾・収穫袋とも、体の姿勢に合わせた回転（swordTiltXのような追加チルト）は不要なので、
    //   武器バリアントと違いbaseRotationは持たせず、可視トグルのみで済ませる。
    const leftPropVariants = {};
    neededLeftTypes.forEach(type => {
        const wrapper = new THREE.Group();
        wrapper.name = 'propVariant_' + type;
        let inner;
        if (type === 'harvestBag') {
            inner = createHarvestBag();
            inner.position.set(0.06, 0, 0.02);
        } else if (type.startsWith('bow:')) {
            inner = createBow(type.slice('bow:'.length)); // 'bow:drawn' → 'drawn'（released は矢を含まない）
        } else { // 'shield'
            inner = createShield();
            inner.position.set(0.20, -0.02, 0.02);
            inner.rotation.set(0, Math.PI / 2, 0);
        }
        wrapper.add(inner);
        wrapper.scale.set(0, 0, 0);
        leftWrist.add(wrapper);
        leftPropVariants[type] = { wrapper };
    });

    // ── 弓だけは「静止状態」でも表示しておく（釣り竿・斧と同じ理由：アニメを再生しないビューアでも見えるように）。
    //   今画面に出している弓の状態（getEffectiveProps）の変種だけを初期表示にする。
    //   クリップ再生中は各クリップのscaleトラックが上書きするので、アニメの内容は変わらない。
    {
        const slotNow = (typeof activeSlotIndex !== 'undefined' && activeSlotIndex >= 0) ? mySlots[activeSlotIndex] : null;
        const liveLeftKey = getLeftPropVariantKey(getEffectiveProps(slotNow));
        const lv = leftPropVariants[liveLeftKey];
        if (lv && liveLeftKey.startsWith('bow:')) lv.wrapper.scale.set(1, 1, 1);
    }

    return { rightWrist, leftWrist, swordVariants, leftPropVariants, liveSword, liveShield, liveHarvestBag, liveBow, liveSwordScale, liveShieldScale, liveHarvestBagScale, liveBowScale };
}

// エクスポート用に生成した一時オブジェクト群をシーンから取り除き、GPUメモリを解放する。
// ライブ表示中の小道具（エディタ画面用）は破棄せず、退避しておいたscaleに戻すだけにする。
function removePropVariants(ctx) {
    if (!ctx) return;
    if (ctx.liveSword)      ctx.liveSword.scale.copy(ctx.liveSwordScale);
    if (ctx.liveShield)     ctx.liveShield.scale.copy(ctx.liveShieldScale);
    if (ctx.liveHarvestBag) ctx.liveHarvestBag.scale.copy(ctx.liveHarvestBagScale);
    if (ctx.liveBow)        ctx.liveBow.scale.copy(ctx.liveBowScale);

    Object.values(ctx.swordVariants).forEach(v => {
        ctx.rightWrist.remove(v.wrapper);
        disposeObject3D(v.wrapper);
    });
    Object.values(ctx.leftPropVariants).forEach(v => {
        ctx.leftWrist.remove(v.wrapper);
        disposeObject3D(v.wrapper);
    });
}

// obj.scaleを[0,duration]の2キーフレームで固定値に保持するトラックを作る（可視/非表示の切替に使用）
// ★表情の目・口・眉バリアントだけでなく、小道具（武器・盾）バリアントの
//   表示切替にも共通して使う汎用ヘルパーなので、汎用名にしてある。
function buildVisibilityTrack(obj, visible, duration) {
    const s = visible ? 1 : 0;
    return new THREE.VectorKeyframeTrack(
        `${obj.uuid}.scale`,
        [0, duration],
        [s, s, s, s, s, s]
    );
}

// 角度(rx,ry,rz)を、THREE.Object3Dのデフォルト回転順序('XYZ')でQuaternion配列[x,y,z,w]に変換。
// ★重要：剣(sword)は eulerToQuatArray / anglesToQuaternion のような 'YXZ' 順ではなく、
//   character-body.js / pose-data.js / pose-slots.js のいずれでも
//   `sword.rotation.set(x,y,z)` または `sword.rotation.x = ...` という
//   「.rotationへの直接代入」で回転が決まっている。この場合のEuler順序は
//   THREE.Object3Dのデフォルトである 'XYZ' になる。
//   剣のY軸回転(SWORD_BASE_ROTATION.y)が90°もあるため、'YXZ'で計算すると
//   ライブエディタの見た目と全く異なる方向になってしまう
//  （実機で「アプリとGLBで剣の向きが逆になる」不具合の原因はこれだった）。
//   そのためエクスポート時も、剣だけはこの専用ヘルパーで 'XYZ' 順に統一する。
const _swordWorkEuler = new THREE.Euler(0, 0, 0, 'XYZ');
const _swordWorkQuat   = new THREE.Quaternion();
function swordEulerToQuatArray(rx = 0, ry = 0, rz = 0) {
    _swordWorkEuler.set(rx, ry, rz, 'XYZ');
    _swordWorkQuat.setFromEuler(_swordWorkEuler);
    return [_swordWorkQuat.x, _swordWorkQuat.y, _swordWorkQuat.z, _swordWorkQuat.w];
}

// 1つのポーズを「保持」するクリップに変換（開始・終了とも同じ姿勢）
// slot/slotIndex/exprCtxは、このクリップに「そのポーズ専用の表情」の
// 可視トグルトラックを焼き込むために使う（省略時＝表情トラック無しの通常クリップ）。
// propsCtxは、同様に「そのポーズ専用の小道具」の可視トグル＋回転トラックを
// 焼き込むために使う（省略時＝小道具トラック無しの通常クリップ）。
function buildPoseClip(pose, name, duration = 1.0, slot = null, slotIndex = -1, exprCtx = null, propsCtx = null) {
    const tracks = getAnimatedJoints().map(({ obj, get }) => {
        const r = get(pose) || {};
        const q = eulerToQuatArray(r.rx || 0, r.ry || 0, r.rz || 0);
        return new THREE.QuaternionKeyframeTrack(
            `${obj.uuid}.quaternion`,
            [0, duration],
            [...q, ...q]
        );
    });

    // ── このポーズ専用の表情を可視トグルとして焼き込む ──
    // ★必須ルール：ここでは必ずslot（＝そのポーズ自身の保存データ）だけを見て
    //   判定する。「現在エディタに表示中の表情」は一切参照しない。
    // ★禁止パターン：animatedParts.face（ライブ表示メッシュ）をデフォルト表情
    //   として使わない。必ずexprCtx.defaultFace（DEFAULT_EXPRESSIONから
    //   独立生成したメッシュ）を使う。
    if (exprCtx && slot) {
        const d = exprCtx.defaultFace;
        const useDefaultFace = !slot.expressionEnabled; // OFFならデフォルト表情メッシュを表示
        tracks.push(buildVisibilityTrack(d.eyes,    useDefaultFace, duration));
        tracks.push(buildVisibilityTrack(d.mouth,   useDefaultFace, duration));
        tracks.push(buildVisibilityTrack(d.eyebrow, useDefaultFace, duration));

        exprCtx.variants.forEach(v => {
            const visible = (v.slotIndex === slotIndex); // 自分のポーズのバリアントだけ表示
            tracks.push(buildVisibilityTrack(v.eyes,    visible, duration));
            tracks.push(buildVisibilityTrack(v.mouth,   visible, duration));
            tracks.push(buildVisibilityTrack(v.eyebrow, visible, duration));
        });
    }

    // ── このポーズ専用の小道具（右手武器・左手盾）を可視トグル＋回転として焼き込む ──
    // ★必須ルール：ここでは必ずgetEffectiveProps(slot)（＝そのポーズ自身の
    //   保存データ。OFFならキャラの現在のデフォルト）だけを見て判定する。
    //   「今画面に装備中の小道具」（animatedParts.sword/shield）は一切参照しない
    //   （表情と同じく、画面の状態がGLBに混ざるバグを防ぐため）。
    if (propsCtx) {
        const effProps = getExportProps(slot); // 弓ポーズの弓の状態も反映した、そのポーズ自身の実効小道具
        Object.entries(propsCtx.swordVariants).forEach(([type, v]) => {
            const visible = (getPropVariantKey(effProps) === type); // 釣り竿は曲がり状態込みのキーで比較
            tracks.push(buildVisibilityTrack(v.wrapper, visible, duration));
            if (visible) {
                // ★上記の理由により、腕・脚とは別のswordEulerToQuatArray（'XYZ'順）を使う。
                //   基準回転はバリアント自身のbaseRotation（剣/鍬で異なる）を使う。
                const tilt = pose.swordTiltX ?? 0;
                const q = swordEulerToQuatArray(v.baseRotation.x + tilt, v.baseRotation.y, v.baseRotation.z);
                tracks.push(new THREE.QuaternionKeyframeTrack(`${v.wrapper.uuid}.quaternion`, [0, duration], [...q, ...q]));
            }
        });
        Object.entries(propsCtx.leftPropVariants).forEach(([type, v]) => {
            const visible = (getLeftPropVariantKey(effProps) === type);
            tracks.push(buildVisibilityTrack(v.wrapper, visible, duration));
        });
    }

    return new THREE.AnimationClip(name, duration, tracks);
}

// 自分のプリセット（mySlots＝編集・自動保存された最新の内容）をクリップ化
// （GLBに埋め込み、Blender等のアニメ一覧から名前を選んで姿勢を切り替えられるようにする）
// ※以前はここで固定値の POSES を参照していたため、ポーズ編集パネルで
//   調整した内容がGLBに反映されないバグがあった。mySlots を見るように修正。
function buildPoseClips(exprCtx, propsCtx) {
    // ── デバッグ：GLB出力直前に、デフォルト表情/小道具と各ポーズの上書き設定が
    //    独立した値を保持しているかをコンソールに表示して確認できるようにする ──
    console.log('=== GLB Export Expression ===');
    console.log(`Default : eye=${DEFAULT_EXPRESSION.eyeType}, mouth=${DEFAULT_EXPRESSION.mouthType}, brow=${DEFAULT_EXPRESSION.eyebrowType}`);
    mySlots.forEach((slot, i) => {
        const e = slot.expressionEnabled ? slot.expression : DEFAULT_EXPRESSION;
        console.log(`Pose${i + 1}[${slot.name}] : ON=${slot.expressionEnabled}, eye=${e.eyeType}, mouth=${e.mouthType}, brow=${e.eyebrowType}`);
    });
    console.log('=== GLB Export Props ===');
    const defP = cloneProps(characterData);
    console.log(`Default : sword=${getPropVariantKey(defP)}, left=${getLeftPropVariantKey(defP)}`);
    mySlots.forEach((slot, i) => {
        const p = getExportProps(slot);
        console.log(`Pose${i + 1}[${slot.name}] : ON=${slot.propsEnabled}, sword=${getPropVariantKey(p)}, left=${getLeftPropVariantKey(p)}`);
    });

    return mySlots.map((slot, i) => {
        // ラベルの絵文字部分を除いた名前をクリップ名にする（例:「😊 待機」→「待機」）
        const clipName = slot.name.split(' ').slice(1).join(' ') || slot.name;
        return buildPoseClip(slot.poseSnapshot, clipName, 1.0, slot, i, exprCtx, propsCtx);
    });
}

// 5. GLB生成（ダウンロードボタンと、🎬 動画編集のzip書き出しの両方から使う）
//    完成したGLBのArrayBufferを onDone(buffer) で返す。
function exportGlbBuffer(onDone) {
    const exporter = new THREE.GLTFExporter();
    // 表情・小道具それぞれについて、ポーズごとに専用メッシュを一時生成してから、それを踏まえてクリップを作る
    const exprCtx  = buildExpressionVariantsForExport();
    const propsCtx = buildPropVariantsForExport();
    const animations = buildPoseClips(exprCtx, propsCtx);

    // 【重要】metalness:0/roughness:1のMeshStandardMaterialに変換しても、
    // ビューワによっては曲面のフレネル反射でうっすら「テカり」が残ることがある。
    // これを確実に無くすため、目・口と同じ「アンリット(ライティング計算なし)」の
    // MeshBasicMaterialに変換してエクスポートする。反射計算そのものが
    // 行われなくなるため、どのビューワでも金属的な照り返しは発生しない。
    // （編集画面のような陰影は無くなり、全体がベタ塗りの質感になる）
    const savedMaterials = [];
    characterGroup.traverse(obj => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        const replaced = mats.map(m => {
            if (m.isMeshBasicMaterial) return m;
            return new THREE.MeshBasicMaterial({
                color: m.color ? m.color.clone() : 0xffffff,
                map: m.map || null,
                transparent: !!m.transparent,
                opacity: m.opacity !== undefined ? m.opacity : 1,
                alphaTest: m.alphaTest || 0,
                side: m.side
            });
        });
        savedMaterials.push({ obj, material: obj.material });
        obj.material = Array.isArray(obj.material) ? replaced : replaced[0];
    });

    exporter.parse(characterGroup, function (result) {
        // マテリアルを元に戻す（編集画面の見た目には影響させない）
        savedMaterials.forEach(({ obj, material }) => { obj.material = material; });
        // 表情・小道具バリアント用の一時メッシュ／マテリアル／テクスチャを破棄する
        // （エディタ画面には一切残さない）
        removeExpressionVariants(exprCtx);
        removePropVariants(propsCtx);

        onDone(result);
    }, { binary: true, animations: animations });
}
window.exportGlbBuffer = exportGlbBuffer;

// GLB単独ダウンロード
document.getElementById('downloadBtn').addEventListener('click', () => {
    exportGlbBuffer((result) => {
        const blob = new Blob([result], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = URL.createObjectURL(blob);
        link.download = (currentCharacterKey || DEFAULT_CHARACTER_KEY) + '.glb'; // セーブファイル名（キャラ名）と揃える
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });
});
