// ============================================================
// セーブ / ロード（JSON）
// ============================================================
function buildSaveData() {
    return {
        version: 1,
        characterName: currentCharacterKey, // このセーブがどのキャラのものか（ポーズ格納庫・動画シーケンスの保存先の分け目に使う）
        characterData: characterData,
        poseSnapshot: captureFullPoseSnapshot(),
        mySlots: mySlots,
        videoSequences: videoSequences, // 🎬 動画編集：名前を付けて保存したシーケンス
        bowPosesAdded: true, // 🏹 弓ポーズ追加後に保存したファイルの印（読込時、無ければ末尾に弓ポーズ3種を補う）
        fishingPosesAdded: true, // 🎣 釣りポーズ追加後に保存したファイルの印（読込時、無ければ末尾に釣りポーズ7種を補う）
        axePosesAdded: true, // 🪓 斧ポーズ追加後に保存したファイルの印（読込時、無ければ末尾に斧ポーズ3種を補う）
        hoeTillPoseAdded: true, // 🌾 鍬で土をほぐすポーズ追加後に保存したファイルの印（読込時、無ければ末尾に1種を補う）
        harvestPosesAdded: true, // 🔪🎒 収穫ポーズ3種の補完対応後に保存したファイルの印（読込時、無ければ末尾に不足分を補う）
        farmToolPosesAdded: true, // 🌾💧 鍬2種＋ジョウロ3種の補完対応後に保存したファイルの印（読込時、無ければ末尾に不足分を補う）
    };
}

// ファイル名入力欄：初期値は「3dmaker_save」、自由に打ち替え可能。
// 打ち替えて欄からフォーカスを外す（Enter／タップで他へ移動）と、
// その名前のキャラ専用のポーズ格納庫に自動で切り替わる。
const saveFileNameInput = document.getElementById('saveFileNameInput');
if (saveFileNameInput) {
    saveFileNameInput.value = currentCharacterKey;
    saveFileNameInput.addEventListener('change', () => {
        switchCharacterByName(saveFileNameInput.value);
        saveFileNameInput.value = currentCharacterKey; // サニタイズ後の名前を表示に反映
    });
}

document.getElementById('saveDataBtn').addEventListener('click', () => {
    // 欄の名前をキャラのキーとして確定させてから保存する（打ち替え直後でも取りこぼさない）
    if (saveFileNameInput) {
        switchCharacterByName(saveFileNameInput.value);
        saveFileNameInput.value = currentCharacterKey;
    }
    const fileBaseName = currentCharacterKey || DEFAULT_CHARACTER_KEY;
    const data = buildSaveData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = URL.createObjectURL(blob);
    a.download = fileBaseName + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showSlotStatus(`💾「${fileBaseName}.json」として保存しました`);
});

document.getElementById('loadDataBtn').addEventListener('click', () => {
    document.getElementById('loadFileInput').click();
});

document.getElementById('loadFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (!data.version || !data.characterData) throw new Error('不正なファイル');

            // キャラクターカスタマイズを復元
            const hadTopWear = data.characterData.topWear !== undefined;
            const hadBottomWear = data.characterData.bottomWear !== undefined; // ★メイド服上下分離の後方互換判定に使用
            const wasLegacyMaid = data.characterData.topWear === 'maid';        // ★変換前（生データ）の時点で判定しておく
            const hadSwordType = data.characterData.swordType !== undefined;
            const hadLeftPropType = data.characterData.leftPropType !== undefined;
            const hadFishingRodBend = data.characterData.fishingRodBend !== undefined; // 釣り竿追加前の保存データには無い
            const hadBowState = data.characterData.bowState !== undefined; // 弓追加前の保存データには無い
            const hadHeadAccessory = data.characterData.headAccessory !== undefined;
            Object.assign(characterData, data.characterData);
            if (!hadTopWear) {
                // 古い保存ファイル：shirtColorから衣装タイプを推定する
                characterData.topWear = (characterData.shirtColor && characterData.shirtColor !== 'none') ? 'shirt' : 'none';
            }
            if (wasLegacyMaid) {
                // ★後方互換：旧メイド服（topWear==='maid'、股下まで伸びるワンピース）を
                //   新仕様（topWear='maidTop' ＋ bottomWear='maidBottom'）へ変換する。
                //   ただし、旧セーブデータに bottomWear が明示的に存在していた場合は、
                //   その既存値を勝手に上書きしない（他の下半身装備と併用していた
                //   可能性を尊重する）。
                characterData.topWear = 'maidTop';
                if (!hadBottomWear) {
                    characterData.bottomWear = 'maidBottom';
                }
            }
            if (!hadSwordType) {
                // 古い保存ファイル：hasSword(true/false)からswordTypeを推定する
                characterData.swordType = characterData.hasSword ? 'sword' : 'none';
            }
            if (!hadLeftPropType) {
                // 古い保存ファイル：hasShield(true/false)からleftPropTypeを推定する
                characterData.leftPropType = characterData.hasShield ? 'shield' : 'none';
            }
            if (!hadFishingRodBend) {
                // 釣り竿追加前の保存ファイル：曲がり状態の情報が無いので「まっすぐ」にする
                // （直前に画面で選んでいた値が残って混ざらないようにする）
                characterData.fishingRodBend = 'straight';
            } else {
                characterData.fishingRodBend = normalizeFishingRodBend(characterData.fishingRodBend);
            }
            // 弓追加前の保存ファイルは状態の情報が無いので「矢をつがえた状態」にする（直前の画面の値を混ぜない）
            characterData.bowState = hadBowState ? normalizeBowState(characterData.bowState) : 'nocked';
            if (!hadHeadAccessory) {
                // 古い保存ファイル：hasHelmet(true/false)からheadAccessoryを推定する
                characterData.headAccessory = characterData.hasHelmet ? 'helmet' : 'none';
            }
            createCharacter(characterData);
            restoreCustomizeUI(characterData);

            // ポーズを復元
            if (data.poseSnapshot) {
                setTimeout(() => applyPoseSnapshot(data.poseSnapshot), 100);
            }
            activeSlotIndex = -1; // 読込直後はどのプリセットにも自動保存しない

            // ★キャラ別保存：このファイルが「誰のものか」を、ファイル内のcharacterName
            //   （古いファイルには無いので、その場合はアップロードしたファイル名）から決め、
            //   そのキャラ専用の保存領域へポーズ格納庫・動画シーケンスを確定保存する。
            //   これにより、他のキャラを編集していた分を上書きして消してしまうことがない。
            const rawKeyName = (typeof data.characterName === 'string' && data.characterName.trim())
                ? data.characterName
                : file.name.replace(/\.json$/i, '');
            adoptCharacterFromLoadedFile(rawKeyName, data.mySlots, data.videoSequences, data.fishingPosesAdded === true, data.bowPosesAdded === true, data.axePosesAdded === true, data.hoeTillPoseAdded === true, data.farmToolPosesAdded === true, data.harvestPosesAdded === true);
            if (saveFileNameInput) saveFileNameInput.value = currentCharacterKey;

            showSlotStatus('📂 読み込み完了！');
        } catch(err) {
            showSlotStatus('⚠️ 読み込み失敗: ' + err.message);
        }
        e.target.value = '';
    };
    reader.readAsText(file);
});

// カスタマイズUIをデータから復元する
function restoreCustomizeUI(data) {
    // スライダー
    const sliderMap = {
        headScaleX: data.headScaleX,
        headScaleY: data.headScaleY,
        jawWidth:   data.jawWidth,
        bustSize:   data.bustSize,
        bustProtrude: data.bustProtrude,
    };
    Object.entries(sliderMap).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.value = val;
    });

    // セレクト（★表情システム改修：eyeType/mouthType/eyebrowTypeは
    //   キャラ固有の項目ではなくなったため復元対象から除外）
    ['hairType','earType'].forEach(id => {
        const el = document.getElementById(id);
        if (el && data[id]) el.value = data[id];
    });

    // 肌色
    const bodyColorVal = data.bodyColor || '#ffe0c0';
    document.getElementById('bodyColor').value = bodyColorVal;
    const skinPresetSet = ['#ffe0c0', '#d9a066', '#fff1e6'];
    document.getElementById('skinColorSelect').value = skinPresetSet.includes(bodyColorVal.toLowerCase()) ? bodyColorVal.toLowerCase() : 'custom';

    // 目の色
    const eyeColorVal = data.eyeColor || '#000000';
    document.getElementById('eyeColor').value = eyeColorVal;
    const eyePresetSet = ['#000000', '#7a4a2b', '#3f7fd9', '#3f9d6b', '#8a5cc4', '#c23b3b', '#d1a44e', '#e07fb0'];
    document.getElementById('eyeColorSelect').value = eyePresetSet.includes(eyeColorVal.toLowerCase()) ? eyeColorVal.toLowerCase() : 'custom';

    // 髪色
    const hairColorVal = data.hairColor || '#333333';
    document.getElementById('hairColor').value = hairColorVal;
    const hairPresetSet = ['#333333', '#6b4226', '#e6c477', '#d8d8e0', '#a33a2c', '#f2a6c6', '#3f6fb0', '#7a5ca8'];
    document.getElementById('hairColorSelect').value = hairPresetSet.includes(hairColorVal.toLowerCase()) ? hairColorVal.toLowerCase() : 'custom';

    // 衣装（上半身）：なし / Tシャツ / 軽装プレートアーマー / メイド服上
    // 衣装（下半身）：なし / ズボン / スカート / キュロット / ロングスカート / メイド服下
    // ★メイド服上/下は独立して選択できるため、maidColorGroup（本体色）は
    //   どちらか一方でも選ばれていれば表示する。
    const topWear = data.topWear || ((data.shirtColor && data.shirtColor !== 'none') ? 'shirt' : 'none');
    const bottomWear = data.bottomWear || 'none';
    document.getElementById('topWearSelect').value = topWear;
    document.getElementById('shirtColorGroup').style.display = (topWear === 'shirt') ? '' : 'none';
    if (data.shirtColor && data.shirtColor !== 'none') document.getElementById('shirtColor').value = data.shirtColor;
    document.getElementById('maidColorGroup').style.display = (topWear === 'maidTop' || bottomWear === 'maidBottom') ? '' : 'none';
    if (data.maidColor) document.getElementById('maidColor').value = data.maidColor;
    const showPlate = (topWear === 'armor') || (data.headAccessory === 'helmet');
    document.getElementById('plateColorGroup').style.display = showPlate ? '' : 'none';
    document.getElementById('plateTrimColorGroup').style.display = showPlate ? '' : 'none';
    if (data.plateColor) document.getElementById('plateColor').value = data.plateColor;
    if (data.plateTrimColor) document.getElementById('plateTrimColor').value = data.plateTrimColor;

    document.getElementById('bottomWearSelect').value = bottomWear;
    document.getElementById('pantsColorGroup').style.display = (bottomWear === 'pants') ? '' : 'none';
    document.getElementById('skirtColorGroup').style.display = (bottomWear === 'skirt' || bottomWear === 'culotte' || bottomWear === 'longskirt') ? '' : 'none';
    if (data.pantsColor && data.pantsColor !== 'none') document.getElementById('pantsColor').value = data.pantsColor;
    if (data.skirtColor && data.skirtColor !== 'none') document.getElementById('skirtColor').value = data.skirtColor;

    // 履き物（長靴）
    const wearBoots = data.bootsColor && data.bootsColor !== 'none';
    document.getElementById('bootsSelect').value = wearBoots ? 'true' : 'false';
    document.getElementById('bootsColorGroup').style.display = wearBoots ? '' : 'none';
    if (wearBoots) document.getElementById('bootsColor').value = data.bootsColor;

    // 右手（剣）（後方互換：旧hasSwordしか無い保存データはsword扱いにする）
    const swordTypeUI = data.swordType || (data.hasSword ? 'sword' : 'none');
    document.getElementById('swordSelect').value = swordTypeUI;

    // 釣り竿の状態（保存データに無ければ「まっすぐ」）。選択欄は右手が釣り竿の時だけ表示する
    const rodBendSel = document.getElementById('fishingRodBendSelect');
    if (rodBendSel) rodBendSel.value = normalizeFishingRodBend(data.fishingRodBend);
    const rodBendGroup = document.getElementById('fishingRodBendGroup');
    if (rodBendGroup) rodBendGroup.style.display = (swordTypeUI === 'fishingRod') ? '' : 'none';

    // 左手（持たない／盾／収穫袋）（後方互換：旧hasShieldしか無い保存データも resolveLeftPropType で解決する）
    document.getElementById('shieldSelect').value = resolveLeftPropType(data);

    // 弓の状態（保存データに無ければ「矢をつがえた状態」）。選択欄は左手が弓の時だけ表示する
    const bowStateSel = document.getElementById('bowStateSelect');
    if (bowStateSel) bowStateSel.value = normalizeBowState(data.bowState);
    const bowStateGroup = document.getElementById('bowStateGroup');
    if (bowStateGroup) bowStateGroup.style.display = (resolveLeftPropType(data) === 'bow') ? '' : 'none';

    // 頭部アクセサリー（なし／ヘルメット／カチューシャ）
    document.getElementById('helmetSelect').value = data.headAccessory || 'none';
}

// ============================================================
// ポーズボタンを動的生成
// ============================================================
// buildPoseButtons は buildSlotButtons に統合されました。
// コマンドボタン（COMMANDS）は廃止し、🎬 動画編集（video-edit.js）に置き換えました。
buildSlotButtons();

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    
    const dt = clock.getDelta ? 0.016 : 0.016; // getDeltaは上で使用済みのため固定値

    // 頭のふわふわ（headPivotの子headのY位置を微動）
    if (animatedParts.head) {
        const headMesh = animatedParts.head.children[0]; // headPivotの子 = headメッシュ
        if (headMesh) {
            headMesh.position.y = Math.sin(time * 2) * 0.03; // headPivot相対でY微動
        }
    }

    // ポニーテールの揺れ（常時・ポーズや首の動きに関わらず自然に追従）
    if (animatedParts.ponyTail) {
        animatedParts.ponyTail.rotation.x = Math.sin(time * 3) * 0.05;
        animatedParts.ponyTail.rotation.z = Math.sin(time * 2) * 0.03;
    }

    if (idleEnabled) {
        // ── アイドルアニメ（完全優先） ──
        if (animatedParts.chest && animatedParts.belly) {
            animatedParts.chest.rotation.x = Math.sin(time * 2) * 0.05;
            animatedParts.belly.rotation.x = Math.sin(time * 2) * 0.02;
        }
        animatedParts.arms.forEach((arm, index) => {
            const sign = index === 0 ? 1 : -1;
            arm.root.rotation.x = Math.sin(time * 1.5) * 0.2 * sign;
            arm.root.rotation.y = 0;
            arm.root.rotation.z = 0.1 * sign;
            arm.joint.rotation.x = -0.1 + Math.sin(time * 1.5 + 1.0) * 0.1;
            arm.joint.rotation.z = 0;
        });
        animatedParts.legs.forEach((leg) => {
            leg.root.rotation.x = -0.05 + Math.sin(time * 2) * 0.02;
            leg.root.rotation.z = 0;
            leg.joint.rotation.x = 0.1 - Math.sin(time * 2) * 0.04;
        });
    } else {
        // ── シーケンス進行 & ポーズ補間 ──
        tickSequence(0.016);
        tickPoseLerp(0.016);
    }
    // プレビュー専用の横回転（characterRotateWrapperのみ）。ギズモ・スカート追従より前に更新する
    if (window._charRotateTick) window._charRotateTick();
    controls.update();
    if (window._poseEditGizmoUpdate) window._poseEditGizmoUpdate();
    // スカート追従はこのフレームの脚の回転が確定した最後（render直前）に行う
    if (animatedParts.skirt) updateDynamicSkirt(animatedParts.skirt);
    if (animatedParts.longSkirtExt) updateLongSkirtExtension(animatedParts.longSkirtExt);
    if (animatedParts.maidBottom) updateMaidBottom(animatedParts.maidBottom);
    renderer.render(scene, camera);
}
animate();
