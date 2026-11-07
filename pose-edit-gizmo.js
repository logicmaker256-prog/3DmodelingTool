// ============================================================
// ポーズ編集パネル（腕・脚 両対応）＋ドラッグ式ギズモ
// 腕: arms[0]=左, arms[1]=右 / root=肩甲骨, joint=ひじ, wrist=手首
// 脚: legs[0]=左, legs[1]=右 / root=股関節, joint=膝関節, ankle=足首
// ============================================================
(function () {
    // 選択中: 肢（'arm'|'leg'）, 左右（0=左,1=右）, パーツ
    let selLimb = 'arm';
    let selSide = 1;       // 初期=右
    let selPart = 'shoulder';

    // 角度テーブル（腕・脚それぞれ左右×パーツ、首は左右なし）
    const deg = {
        arm: {
            0: { shoulder:{x:0,y:0,z:0}, elbow:{x:0,y:0,z:0}, wrist:{x:0,y:0,z:0} },
            1: { shoulder:{x:0,y:0,z:0}, elbow:{x:0,y:0,z:0}, wrist:{x:0,y:0,z:0} },
        },
        leg: {
            0: { hip:{x:0,y:0,z:0}, knee:{x:0,y:0,z:0}, ankle:{x:0,y:0,z:0} },
            1: { hip:{x:0,y:0,z:0}, knee:{x:0,y:0,z:0}, ankle:{x:0,y:0,z:0} },
        },
        neck: {
            0: { neck:{x:0,y:0,z:0}, head:{x:0,y:0,z:0} },
        },
    };

    // パーツ名リスト（肢ごと）
    const PARTS = {
        arm:  ['shoulder','elbow','wrist'],
        leg:  ['hip','knee','ankle'],
        neck: ['neck','head'],
    };

    // 右上スライダーパネルのタイトル表示用（アイコン付きパーツ名）
    const PART_TITLE_LABELS = {
        shoulder:'🦴 肩甲骨', elbow:'💪 ひじ', wrist:'✋ 手首',
        hip:'🦴 股関節', knee:'🦵 膝関節', ankle:'🦶 足首',
        neck:'🦒 首', head:'👤 頭',
    };

    // ボーン取得
    function getBone(limb, side, part) {
        if (limb === 'neck') {
            if (part === 'neck') return animatedParts.neck || null;
            if (part === 'head') return animatedParts.head || null;
            return null;
        }
        if (limb === 'arm') {
            if (!animatedParts.arms || !animatedParts.arms[side]) return null;
            const a = animatedParts.arms[side];
            return part === 'shoulder' ? a.root
                 : part === 'elbow'    ? a.joint
                 : part === 'wrist'    ? a.wrist : null;
        } else {
            if (!animatedParts.legs || !animatedParts.legs[side]) return null;
            const l = animatedParts.legs[side];
            if (part === 'hip')   return l.root;
            if (part === 'knee')  return l.joint;
            if (part === 'ankle') {
                // ankle は knee の子Meshなので子から探す
                const knee = l.joint;
                if (!knee) return null;
                for (let i = 0; i < knee.children.length; i++) {
                    const c = knee.children[i];
                    if (c.isMesh && c.geometry &&
                        c.geometry.type === 'SphereGeometry') return c;
                }
                return null;
            }
        }
        return null;
    }

    // deg[limb][side][part] の x=前後(Pitch)/y=左右(Yaw)/z=ひねり(Roll) [度] を
    // Quaternionに合成してボーンへ適用する（bone.rotation.x/y/zの個別代入はしない）。
    function applyBone(limb, side, part) {
        const bone = getBone(limb, side, part);
        if (!bone) return;
        const d = deg[limb][side][part], r = Math.PI / 180;
        setBoneAnglesAsQuaternion(bone, d.x * r, d.y * r, d.z * r);
    }

    window._poseEditApplyAll = function () {
        ['arm','leg'].forEach(limb =>
            [0,1].forEach(side =>
                PARTS[limb].forEach(part => applyBone(limb, side, part))
            )
        );
        PARTS.neck.forEach(part => applyBone('neck', 0, part));
    };
    window._poseEditApplyAfterPose = function () {
        ['arm','leg'].forEach(limb =>
            [0,1].forEach(side =>
                PARTS[limb].forEach(part => applyBone(limb, side, part))
            )
        );
        PARTS.neck.forEach(part => applyBone('neck', 0, part));
    };

    // スナップショットの値をdegテーブルに同期する（保存ポーズ適用時に呼ぶ）
    // snapshotはsnapshotCurrentRotationsの形式: arms[i].root.rx など（ラジアン）
    window._poseEditSyncDeg = function (snapshot) {
        if (!snapshot) return;
        const R = 180 / Math.PI;
        // 腕
        (snapshot.arms || []).forEach((a, i) => {
            if (!deg.arm[i]) return;
            deg.arm[i].shoulder = { x: (a.root?.rx  ?? 0)*R, y: (a.root?.ry  ?? 0)*R, z: (a.root?.rz  ?? 0)*R };
            deg.arm[i].elbow    = { x: (a.joint?.rx ?? 0)*R, y: 0,                      z: (a.joint?.rz ?? 0)*R };
            deg.arm[i].wrist    = { x: (a.wrist?.rx ?? 0)*R, y: (a.wrist?.ry ?? 0)*R, z: (a.wrist?.rz ?? 0)*R };
        });
        // 脚
        (snapshot.legs || []).forEach((l, i) => {
            if (!deg.leg[i]) return;
            deg.leg[i].hip   = { x: (l.root?.rx  ?? 0)*R, y: 0, z: (l.root?.rz  ?? 0)*R };
            deg.leg[i].knee  = { x: (l.joint?.rx ?? 0)*R, y: 0, z: 0 };
            deg.leg[i].ankle = { x: 0, y: 0, z: 0 };
        });
        syncInputs(); // 入力欄も更新
    };

    function syncInputs() {
        const side = selLimb === 'neck' ? 0 : selSide;
        const d = deg[selLimb][side][selPart];
        const rx = Math.round(d.x), ry = Math.round(d.y), rz = Math.round(d.z);
        document.getElementById('input-rx').value = rx;
        document.getElementById('input-ry').value = ry;
        document.getElementById('input-rz').value = rz;

        // ★キャラ表示画面・右上の独立スライダーパネルも同期する
        document.getElementById('slider-rx').value = rx;
        document.getElementById('slider-ry').value = ry;
        document.getElementById('slider-rz').value = rz;
        document.getElementById('slider-rx-val').textContent = rx + '°';
        document.getElementById('slider-ry-val').textContent = ry + '°';
        document.getElementById('slider-rz-val').textContent = rz + '°';

        const sideLabel = selLimb === 'neck' ? '' : (side === 1 ? '👉右 ' : '👈左 ');
        document.getElementById('joint-slider-title').textContent =
            sideLabel + PART_TITLE_LABELS[selPart];
    }

    // ── ギズモ構築 ─────────────────────────────────────────────
    const AXIS_DEF = [
        { key:'x', colorNormal:0xe53935, colorHL:0xff6d6d, rz:0,         ry:0          },
        { key:'y', colorNormal:0x43a047, colorHL:0x76ff7a, rz:Math.PI/2, ry:0          },
        { key:'z', colorNormal:0x1e88e5, colorHL:0x64b5f6, rz:0,         ry:-Math.PI/2 },
    ];
    const ARROW_LEN  = 0.55;
    const HEAD_LEN   = 0.13;
    const T_NORMAL   = 0.013;
    const T_HL       = 0.026;
    const HIT_RAD    = 0.18;

    function makeShaftPts(t) {
        return [
            0,0,0,  ARROW_LEN-HEAD_LEN,0,0,
            0,t,0,  ARROW_LEN-HEAD_LEN,t,0,
            0,-t,0, ARROW_LEN-HEAD_LEN,-t,0,
            0,0,t,  ARROW_LEN-HEAD_LEN,0,t,
            0,0,-t, ARROW_LEN-HEAD_LEN,0,-t,
        ];
    }

    function buildAxisGroup(axDef) {
        const g = new THREE.Group();
        g.renderOrder = 999;

        // 通常
        const ng = new THREE.Group(); ng.renderOrder = 999;
        const sgN = new THREE.BufferGeometry();
        sgN.setAttribute('position', new THREE.Float32BufferAttribute(makeShaftPts(T_NORMAL),3));
        const smN = new THREE.LineBasicMaterial({ color:axDef.colorNormal, depthTest:false, depthWrite:false, transparent:true, opacity:0.8 });
        const slN = new THREE.LineSegments(sgN, smN); slN.renderOrder=999; ng.add(slN);
        const hgN = new THREE.ConeGeometry(0.055, HEAD_LEN, 10);
        const hmN = new THREE.MeshBasicMaterial({ color:axDef.colorNormal, depthTest:false, depthWrite:false, transparent:true, opacity:0.8 });
        const hN  = new THREE.Mesh(hgN, hmN); hN.rotation.z=-Math.PI/2; hN.position.x=ARROW_LEN-HEAD_LEN/2; hN.renderOrder=999; ng.add(hN);
        g.add(ng);

        // ハイライト
        const hg = new THREE.Group(); hg.renderOrder=999; hg.visible=false;
        const sgH = new THREE.BufferGeometry();
        sgH.setAttribute('position', new THREE.Float32BufferAttribute(makeShaftPts(T_HL),3));
        const smH = new THREE.LineBasicMaterial({ color:axDef.colorHL, depthTest:false, depthWrite:false, transparent:true, opacity:1.0 });
        const slH = new THREE.LineSegments(sgH, smH); slH.renderOrder=999; hg.add(slH);
        const hgH = new THREE.ConeGeometry(0.075, HEAD_LEN*1.25, 10);
        const hmH = new THREE.MeshBasicMaterial({ color:axDef.colorHL, depthTest:false, depthWrite:false, transparent:true, opacity:1.0 });
        const hH  = new THREE.Mesh(hgH, hmH); hH.rotation.z=-Math.PI/2; hH.position.x=ARROW_LEN-HEAD_LEN*1.25/2; hH.renderOrder=999; hg.add(hH);
        g.add(hg);

        // hit球
        const hit = new THREE.Mesh(
            new THREE.SphereGeometry(HIT_RAD,8,8),
            new THREE.MeshBasicMaterial({ visible:false })
        );
        hit.position.x = ARROW_LEN;
        hit.userData.axisKey = axDef.key;
        g.add(hit);

        g.rotation.z = axDef.rz;
        g.rotation.y = axDef.ry;
        return { g, hlGroup:hg, hitMesh:hit };
    }

    const gizmoRoot = new THREE.Group();
    gizmoRoot.renderOrder=999; gizmoRoot.visible=false;
    scene.add(gizmoRoot);

    // ── 選択中の関節を「赤く」ハイライトする球 ──────────────────
    // 関節メッシュ自体の素材(skinMat)は全身のパーツで共有されているため、
    // 直接色を変えると全身が赤くなってしまう。代わりに選択中の関節の位置
    // （gizmoRootの原点＝ボーンの位置）に半透明の赤い球を重ねて表示し、
    // 「今どの関節を操作しているか」が一目でわかるようにする。
    const highlightMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 20, 16),
        new THREE.MeshBasicMaterial({
            color: 0xff1744, transparent: true, opacity: 0.55,
            depthTest: false, depthWrite: false,
        })
    );
    highlightMesh.renderOrder = 998; // 矢印(999)より下、キャラより上
    gizmoRoot.add(highlightMesh);

    const hitMeshes=[], hlGroups={};
    AXIS_DEF.forEach(axDef => {
        const { g, hlGroup, hitMesh } = buildAxisGroup(axDef);
        gizmoRoot.add(g);
        hitMeshes.push(hitMesh);
        hlGroups[axDef.key] = hlGroup;
    });

    function setHighlight(k)  { Object.keys(hlGroups).forEach(key => { hlGroups[key].visible=(key===k); }); }
    function clearHighlight() { Object.values(hlGroups).forEach(g=>{ g.visible=false; }); }

    const _wPos=new THREE.Vector3(), _wQuat=new THREE.Quaternion(), _wScl=new THREE.Vector3();

    window._poseEditGizmoUpdate = function () {
        if (!gizmoRoot.visible) return;
        const side = selLimb === 'neck' ? 0 : selSide;
        const bone = getBone(selLimb, side, selPart);
        if (!bone) return;
        bone.updateWorldMatrix(true, false);
        bone.matrixWorld.decompose(_wPos, _wQuat, _wScl);
        gizmoRoot.position.copy(_wPos);
        gizmoRoot.quaternion.copy(_wQuat);
    };

    // ── ドラッグ ──────────────────────────────────────────────
    const raycaster=new THREE.Raycaster(), canvas=renderer.domElement;
    let dragging=false, dragAxisKey=null, dragStartXY={x:0,y:0}, dragStartDeg=0;

    function toNDC(cx,cy) {
        const r=canvas.getBoundingClientRect();
        return new THREE.Vector2(((cx-r.left)/r.width)*2-1, -((cy-r.top)/r.height)*2+1);
    }
    function stopIdle() {
        idleEnabled=false;
        syncIdleSelect(false);
        poseT=1.0;
    }

    function onPointerDown(e) {
        if (!gizmoRoot.visible) return;
        const pt=e.touches?e.touches[0]:e;
        raycaster.setFromCamera(toNDC(pt.clientX,pt.clientY),camera);
        const hits=raycaster.intersectObjects(hitMeshes);
        if (!hits.length) return;
        dragAxisKey=hits[0].object.userData.axisKey;
        dragStartXY={x:pt.clientX,y:pt.clientY};
        const side = selLimb === 'neck' ? 0 : selSide;
        dragStartDeg=deg[selLimb][side][selPart][dragAxisKey];
        dragging=true; controls.enabled=false;
        setHighlight(dragAxisKey);
        e.preventDefault(); e.stopPropagation();
    }
    function onPointerMove(e) {
        if (!dragging) return;
        const pt=e.touches?e.touches[0]:e;
        const r=canvas.getBoundingClientRect();
        const fullPx=Math.min(r.width,r.height);
        const delta=dragAxisKey==='y'
            ? (pt.clientX-dragStartXY.x)/fullPx*360
            :-(pt.clientY-dragStartXY.y)/fullPx*360;
        const v=Math.max(-180,Math.min(180,dragStartDeg+delta));
        const side = selLimb === 'neck' ? 0 : selSide;
        deg[selLimb][side][selPart][dragAxisKey]=v;
        stopIdle(); applyBone(selLimb,side,selPart); syncInputs();
        e.preventDefault();
    }
    function onPointerUp() {
        if (!dragging) return;
        dragging=false; controls.enabled=true; clearHighlight();
        autoSaveActiveSlot();
    }

    canvas.addEventListener('touchstart', onPointerDown, {passive:false});
    canvas.addEventListener('touchmove',  onPointerMove, {passive:false});
    canvas.addEventListener('touchend',   onPointerUp);
    canvas.addEventListener('mousedown',  onPointerDown);
    canvas.addEventListener('mousemove',  onPointerMove);
    canvas.addEventListener('mouseup',    onPointerUp);

    // ── UIパーツボタンの更新 ─────────────────────────────────
    function updatePartButtons() {
        const container = document.getElementById('part-buttons-container');
        container.innerHTML = '';
        // 首モードは左右タブを隠す
        const sideTabButtons = document.getElementById('side-tab-buttons');
        sideTabButtons.style.display = selLimb === 'neck' ? 'none' : '';

        PARTS[selLimb].forEach((part, i) => {
            const labels = {
                shoulder:'🦴 肩甲骨', elbow:'💪 ひじ', wrist:'✋ 手首',
                hip:'🦴 股関節', knee:'🦵 膝関節', ankle:'🦶 足首',
                neck:'🦒 首', head:'👤 頭',
            };
            const btn = document.createElement('button');
            btn.className = 'arm-part-btn' + (part===selPart?' active':'');
            btn.dataset.part = part;
            btn.textContent = labels[part];
            btn.addEventListener('click', () => {
                selPart = part;
                container.querySelectorAll('.arm-part-btn').forEach(b=>b.classList.remove('active'));
                btn.classList.add('active');
                syncInputs(); showGizmo(); clearHighlight();
            });
            container.appendChild(btn);
        });
    }

    function showGizmo() {
        gizmoRoot.visible=true;
        const panel = document.getElementById('joint-slider-panel');
        if (panel) panel.style.display = 'block';
    }
    function hideGizmo() {
        gizmoRoot.visible=false;
        const panel = document.getElementById('joint-slider-panel');
        if (panel) panel.style.display = 'none';
    }

    // 肢タブ（腕/脚/首）
    document.querySelectorAll('.limb-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selLimb = btn.dataset.limb;
            // 切り替え時の初期パーツ
            if      (selLimb === 'arm')  selPart = 'shoulder';
            else if (selLimb === 'leg')  selPart = 'hip';
            else if (selLimb === 'neck') selPart = 'neck';
            document.querySelectorAll('.limb-tab-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            updatePartButtons(); syncInputs(); showGizmo(); clearHighlight();
        });
    });

    // 左右タブ
    document.querySelectorAll('.side-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selSide=parseInt(btn.dataset.side);
            document.querySelectorAll('.side-tab-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            syncInputs(); showGizmo(); clearHighlight();
        });
    });

    // 角度をまとめて反映するヘルパー（数値入力・右上スライダーの両方から呼ぶ）
    function setAngle(axis, v) {
        v = Math.max(-180, Math.min(180, v));
        const side = selLimb === 'neck' ? 0 : selSide;
        deg[selLimb][side][selPart][axis] = v;
        stopIdle();
        applyBone(selLimb, side, selPart);
        syncInputs();
    }

    // 角度入力（数値欄）
    [['input-rx','x'],['input-ry','y'],['input-rz','z']].forEach(([id,axis])=>{
        const el=document.getElementById(id);
        function onInput(){
            let v=parseFloat(el.value); if(isNaN(v)) return;
            setAngle(axis, v);
            autoSaveActiveSlot();
        }
        el.addEventListener('input', onInput);
        el.addEventListener('change', onInput);
    });

    // 角度スライダー（キャラ表示画面・右上の独立パネル）
    // -180°〜180°の範囲。ドラッグ中はリアルタイムにポーズへ反映し、
    // 指を離した瞬間（changeイベント）にだけ自動保存する。
    [['slider-rx','x'],['slider-ry','y'],['slider-rz','z']].forEach(([id,axis])=>{
        const el=document.getElementById(id);
        el.addEventListener('input', ()=>{
            let v=parseFloat(el.value); if(isNaN(v)) return;
            setAngle(axis, v);
        });
        el.addEventListener('change', ()=> autoSaveActiveSlot());
    });

    // リセット
    document.getElementById('arm-reset-btn').addEventListener('click',()=>{
        const side = selLimb === 'neck' ? 0 : selSide;
        deg[selLimb][side][selPart]={x:0,y:0,z:0};
        syncInputs(); applyBone(selLimb,side,selPart); clearHighlight();
        autoSaveActiveSlot();
    });

    // ポージングタブの表示/非表示に連動してドラッグギズモを表示/非表示にする。
    // （統合メニューのタブ切り替えJSから呼び出される）
    window.__setPosingActive = function(active) {
        if (active) showGizmo(); else hideGizmo();
    };

    // 初期化（初期表示タブは「キャラ」なのでギズモは隠しておく）
    updatePartButtons();
    hideGizmo();
})();
