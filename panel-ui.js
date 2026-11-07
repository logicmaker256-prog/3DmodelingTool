        // ドロップダウンのプリセット色を選んだ時の処理（肌・目・髪）
        // カスタムカラーピッカーの値も同時に同期する
        function setSkinPreset(hexColor) {
            if (hexColor === 'custom') return; // disabled optionなので実際には来ない
            document.getElementById('bodyColor').value = hexColor;
            characterData.bodyColor = hexColor;
            createCharacter(characterData);
        }

        function setEyePreset(hexColor) {
            if (hexColor === 'custom') return;
            document.getElementById('eyeColor').value = hexColor;
            characterData.eyeColor = hexColor;
            createCharacter(characterData);
        }

        function setHairPreset(hexColor) {
            if (hexColor === 'custom') return;
            document.getElementById('hairColor').value = hexColor;
            characterData.hairColor = hexColor;
            createCharacter(characterData);
        }

        function setSwordType(type) {
            characterData.swordType = type;
            updateFishingRodBendUI();
            createCharacter(characterData);
        }

        // 釣り竿の状態選択欄は、右手が「釣り竿」の時だけ表示する
        function updateFishingRodBendUI() {
            const group = document.getElementById('fishingRodBendGroup');
            if (group) group.style.display = (characterData.swordType === 'fishingRod') ? '' : 'none';
        }

        // 釣り竿の状態（まっすぐ／少し曲がる／大きく曲がる）。
        // 右手小道具の切替（setSwordType）と同じ再構築経路を通すので、ポーズ中の小道具の傾きなども
        // 従来の小道具切替と同じ扱いになる。
        function setFishingRodBend(bend) {
            characterData.fishingRodBend = normalizeFishingRodBend(bend);
            createCharacter(characterData);
        }

        // 左手小道具（持たない／盾／収穫袋）
        function setLeftPropType(type) {
            characterData.leftPropType = type;
            updateBowStateUI();
            createCharacter(characterData);
        }

        // 弓の状態選択欄は、左手が「弓」の時だけ表示する（弓以外の時は非表示）
        function updateBowStateUI() {
            const group = document.getElementById('bowStateGroup');
            if (group) group.style.display = (characterData.leftPropType === 'bow') ? '' : 'none';
            const sel = document.getElementById('bowStateSelect');
            if (sel) sel.value = normalizeBowState(characterData.bowState);
        }
        window.syncBowStateUI = updateBowStateUI;

        // 弓の状態（矢をつがえた／引き絞った／放った直後）。
        // 完成済みの3モデルのうち左手の弓だけを差し替える。キャラ全体は作り直さないので、
        // ポーズ・右手の小道具・服などには影響しない。
        function setBowState(state) {
            characterData.bowState = normalizeBowState(state);
            if (window._reapplyCurrentLeftProp) window._reapplyCurrentLeftProp();
        }

        // 後方互換：古い呼び出し（boolean版）が残っていても壊れないようにする
        function setHasShield(wear) {
            setLeftPropType(wear ? 'shield' : 'none');
        }

        // 頭部アクセサリー（なし／軽装プレートアーマーのヘルメット／カチューシャ）
        // ★服（メイド服など）の選択とは独立した状態として管理する。
        function setHeadAccessory(type) {
            const showPlate = (type === 'helmet') || characterData.topWear === 'armor';
            document.getElementById('plateColorGroup').style.display = showPlate ? '' : 'none';
            document.getElementById('plateTrimColorGroup').style.display = showPlate ? '' : 'none';
            characterData.headAccessory = type;
            createCharacter(characterData);
        }

        // 後方互換：古い呼び出し（boolean版）が残っていても壊れないようにする
        function setHasHelmet(wear) {
            setHeadAccessory(wear ? 'helmet' : 'none');
        }

        function setWearBoots(wear) {
            document.getElementById('bootsColorGroup').style.display = wear ? '' : 'none';
            const color = document.getElementById('bootsColor').value;
            characterData.bootsColor = wear ? color : 'none';
            createCharacter(characterData);
        }

        // 下半身装備切替（なし / ズボン / スカート / キュロット / ロングスカート / メイド服下）── 同時装備は禁止
        function setBottomWear(type) {
            // 色UI表示切替
            document.getElementById('pantsColorGroup').style.display = (type === 'pants') ? '' : 'none';
            // ロングスカートは既存の「スカート」本体をそのまま使う（色ピッカーも共用）
            document.getElementById('skirtColorGroup').style.display = (type === 'skirt' || type === 'culotte' || type === 'longskirt') ? '' : 'none';
            // ★メイド服上/下は独立して選択できるため、maidColorGroup（本体色）は
            //   どちらか一方でも選ばれていれば表示する。
            document.getElementById('maidColorGroup').style.display = (type === 'maidBottom' || characterData.topWear === 'maidTop') ? '' : 'none';
            characterData.bottomWear = type;
            createCharacter(characterData);
        }

        function setTopWear(type) {
            // 色ピッカーの表示切替
            document.getElementById('shirtColorGroup').style.display = (type === 'shirt') ? '' : 'none';
            // ★メイド服上/下は独立して選択できるため、maidColorGroup（本体色）は
            //   どちらか一方でも選ばれていれば表示する。
            document.getElementById('maidColorGroup').style.display = (type === 'maidTop' || characterData.bottomWear === 'maidBottom') ? '' : 'none';
            const showPlate = (type === 'armor') || (characterData.headAccessory === 'helmet');
            document.getElementById('plateColorGroup').style.display = showPlate ? '' : 'none';
            document.getElementById('plateTrimColorGroup').style.display = showPlate ? '' : 'none';
            characterData.topWear = type;
            createCharacter(characterData);
        }

        // ============================================================
        // 統合メニューパネル：開閉／メインタブ／カテゴリ アコーディオン
        // ============================================================
        const appHeader  = document.getElementById('appPanelHeader');
        const appContent = document.getElementById('appPanelContent');
        const appIcon    = document.getElementById('appToggleIcon');
        let appPanelOpen = true;
        let activeMainTab = 'chara';

        // ポージングタブの表示状態が変わった時にドラッグギズモ／右上スライダーパネルの
        // 表示を連動させるためのフック。ポーズ編集パネルのIIFE内で
        // window.__setPosingActiveとして実体が定義される。
        // ★メニュー全体（アコーディオン）を閉じてキャラを確認したい場合でも、
        //   ギズモとスライダーはポーズを確認・調整するために表示し続けたいので、
        //   appPanelOpen（メニューの開閉）ではなく activeMainTab のみで判定する。
        function notifyPosingVisibility() {
            const posingVisible = activeMainTab === 'posing';
            if (typeof window.__setPosingActive === 'function') {
                window.__setPosingActive(posingVisible);
            }
        }

        // ヘッダータップでパネル全体を開閉
        appHeader.addEventListener('click', () => {
            appContent.classList.toggle('is-closed');
            appPanelOpen = !appContent.classList.contains('is-closed');
            appIcon.style.transform = appPanelOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
            notifyPosingVisibility();
        });

        // メインタブ（キャラ／ポージング／ポーズ格納庫／ファイル）切り替え
        document.querySelectorAll('.main-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activeMainTab = btn.dataset.tab;
                document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                document.getElementById('tab-' + activeMainTab).classList.add('active');
                notifyPosingVisibility();
                // ポージングタブに来たとき、体の編集対象と表情・小道具エディタの表示を最新状態に同期する
                if (activeMainTab === 'posing' && window.syncAllExpressionEditors) window.syncAllExpressionEditors();
                if (activeMainTab === 'posing' && window.syncAllPropsEditors) window.syncAllPropsEditors();
            });
        });

        // キャラタブ内のカテゴリ（体型／顔形／髪／衣装／小道具）アコーディオン
        document.querySelectorAll('.menu-category-header').forEach(hdr => {
            hdr.addEventListener('click', () => {
                const body = hdr.nextElementSibling;
                body.classList.toggle('is-closed');
                hdr.classList.toggle('open', !body.classList.contains('is-closed'));
            });
        });

        // 初期状態：ポージングタブは非表示なのでギズモも隠す
        notifyPosingVisibility();

        // 終了
        document.getElementById('exitBtn').addEventListener('click', () => {
            if (!confirm('作業を終了しますか？\n保存していない変更は失われます。')) return;
            window.close();
            setTimeout(() => {
                alert('ブラウザの仕様上、タブを自動で閉じることができませんでした。\nこのままタブを閉じて終了してください。');
            }, 300);
        });
