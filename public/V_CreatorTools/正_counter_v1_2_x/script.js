// script.js ver1.2.1

document.addEventListener('DOMContentLoaded', () => {
    let currentCount = 0;
    const maxCountPerShou = 5;

    const DEFAULT_RGB_COLOR_STR = "255,255,255";
    const DEFAULT_ALPHA = 1.0;

    const LS_KEY_COUNT = 'shouCounter_count';
    const LS_KEY_COLOR_R = 'shouCounter_colorR';
    const LS_KEY_COLOR_G = 'shouCounter_colorG';
    const LS_KEY_COLOR_B = 'shouCounter_colorB';
    const LS_KEY_ALPHA = 'shouCounter_alpha';
    const LS_KEY_COLOR_MODE = 'shouCounter_colorMode';

    const SHOU_IMAGE_PATHS = [
        '', // 0番目は使わない
        'shou_1.png',
        'shou_2.png',
        'shou_3.png',
        'shou_4.png',
        'shou_5.png'
    ];

    const incrementBtn = document.getElementById('increment-btn');
    const decrementBtn = document.getElementById('decrement-btn');
    const counterDisplay = document.getElementById('counter-display');

    const colorInput = document.getElementById('color-input');
    const alphaSlider = document.getElementById('alpha-slider');
    const alphaValueSpan = document.getElementById('alpha-value');
    const applyColorBtn = document.getElementById('apply-color-btn');
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    const actualCountSpan = document.getElementById('actual-count'); 

    const modeCssRadio = document.getElementById('mode-css');
    const modeImageRadio = document.getElementById('mode-image');
    const cssColorControls = document.getElementById('css-color-controls'); 

    let shouGroups = [];

    let currentR = 255;
    let currentG = 255;
    let currentB = 255;
    let currentAlpha = DEFAULT_ALPHA;
    let currentColorMode = 'css'; 

    // --- ローカルストレージからの読み込みと保存関数 ---

    function saveSettings() {
        localStorage.setItem(LS_KEY_COUNT, currentCount);
        localStorage.setItem(LS_KEY_COLOR_R, currentR);
        localStorage.setItem(LS_KEY_COLOR_G, currentG);
        localStorage.setItem(LS_KEY_COLOR_B, currentB);
        localStorage.setItem(LS_KEY_ALPHA, currentAlpha);
        localStorage.setItem(LS_KEY_COLOR_MODE, currentColorMode);
    }

    function loadSettings() {
        const storedCount = localStorage.getItem(LS_KEY_COUNT);
        const storedR = localStorage.getItem(LS_KEY_COLOR_R);
        const storedG = localStorage.getItem(LS_KEY_COLOR_G);
        const storedB = localStorage.getItem(LS_KEY_COLOR_B);
        const storedAlpha = localStorage.getItem(LS_KEY_ALPHA);
        const storedColorMode = localStorage.getItem(LS_KEY_COLOR_MODE);

        if (storedCount !== null) {
            currentCount = parseInt(storedCount, 10);
        }

        if (storedR !== null && storedG !== null && storedB !== null) {
            currentR = parseInt(storedR, 10);
            currentG = parseInt(storedG, 10);
            currentB = parseInt(storedB, 10);
            colorInput.value = `${currentR},${currentG},${currentB}`;
        }

        if (storedAlpha !== null) {
            currentAlpha = parseFloat(storedAlpha);
            alphaSlider.value = currentAlpha;
            alphaValueSpan.textContent = currentAlpha.toFixed(2);
        }

        if (storedColorMode !== null) {
            currentColorMode = storedColorMode;
        }
    }

    // 全ての画の色または画像を更新する関数
    function applyStrokeStyle() {
        shouGroups.forEach(group => {
            applyStrokeStyleToGroup(group); 
        });
        saveSettings(); 
    }

    // RGB/RGBA文字列を解析して色を更新する関数
    function parseColorInput(inputString) {
        const parts = inputString.split(',').map(s => s.trim());
        
        let newR, newG, newB;
        let newAlpha = currentAlpha;

        if (parts.length >= 3) {
            newR = parseInt(parts[0], 10);
            newG = parseInt(parts[1], 10);
            newB = parseInt(parts[2], 10);

            if (isNaN(newR) || newR < 0 || newR > 255 ||
                isNaN(newG) || newG < 0 || newG > 255 ||
                isNaN(newB) || newB < 0 || newB > 255) {
                console.warn("Invalid RGB values. Please use 0-255 for R, G, B. Keeping current color.");
                return false;
            }

            if (parts.length === 4) {
                const parsedAlpha = parseFloat(parts[3]);
                if (!isNaN(parsedAlpha) && parsedAlpha >= 0 && parsedAlpha <= 1) {
                    newAlpha = parsedAlpha;
                } else {
                    console.warn("Invalid Alpha value in input. Please use 0.0-1.0 for Alpha. Keeping current alpha.");
                }
            }
            
            currentR = newR;
            currentG = newG;
            currentB = newB;
            currentAlpha = newAlpha;

            alphaSlider.value = currentAlpha;
            alphaValueSpan.textContent = currentAlpha.toFixed(2);
            
            return true;
        } else {
            console.warn("Invalid color input. Please use R,G,B or R,G,B,A format (e.g., 255,255,255 or 0,0,0,0.5).");
            return false;
        }
    }

    // 新しい「正」の字グループを作成し、ランダムな位置に配置する関数
    function createShouGroup() {
        const group = document.createElement('div');
        group.className = 'shou-group'; 

        if (currentColorMode === 'css') {
            group.classList.add('css-mode');
        } else {
            group.classList.add('image-mode');
        }
        
        for (let i = 1; i <= maxCountPerShou; i++) {
            const stroke = document.createElement('span');
            stroke.className = `stroke stroke-${i}`; 
            group.appendChild(stroke);
        }

        applyStrokeStyleToGroup(group); 

        const parentWidth = counterDisplay.offsetWidth;
        const parentHeight = counterDisplay.offsetHeight;
        
        // groupWidthとgroupHeightは、CSSで定義された実際の描画サイズ
        let actualRenderedWidth;
        let actualRenderedHeight;

        if (currentColorMode === 'css') {
            actualRenderedWidth = 100; // css-modeのwidth
            actualRenderedHeight = 100; // css-modeのheight
        } else { // image-mode
            // ★ここを変更！ CSSで設定した実際の描画サイズと合わせる
            actualRenderedWidth = 71; 
            actualRenderedHeight = 71; 
        }
        
        // 要素の中心が配置される範囲を計算
        const minCenterX = actualRenderedWidth / 2;
        const maxCenterX = parentWidth - actualRenderedWidth / 2;
        const minCenterY = actualRenderedHeight / 2;
        const maxCenterY = parentHeight - actualRenderedHeight / 2;

        // 計算結果が負にならないように0でクリップ (画面が要素より小さい場合)
        const effectiveMaxX = Math.max(0, maxCenterX - minCenterX);
        const effectiveMaxY = Math.max(0, maxCenterY - minCenterY);


        // ランダムな中心座標を計算
        let randomCenterX = Math.random() * effectiveMaxX + minCenterX;
        let randomCenterY = Math.random() * effectiveMaxY + minCenterY;

        // 要素の左上隅の座標に変換 (CSSのtop/leftは左上隅基準のため)
        let randomLeft = randomCenterX - actualRenderedWidth / 2;
        let randomTop = randomCenterY - actualRenderedHeight / 2;
        
        const randomRotate = (Math.random() - 0.5) * 2 * 10;

        group.style.top = `${randomTop}px`;
        group.style.left = `${randomLeft}px`;
        // ★ここを変更！ scaleFactorが不要になるため transform に scale を含めない
        group.style.transform = `rotate(${randomRotate}deg)`; 
        group.style.transformOrigin = 'center center'; 

        counterDisplay.appendChild(group);
        shouGroups.push(group);
    }

    // 特定のグループにスタイルを適用するヘルパー関数
    function applyStrokeStyleToGroup(group) {
        group.classList.remove('css-mode', 'image-mode');
        
        // ★scaleFactor は不要になる
        // let scaleFactor = 1; 

        if (currentColorMode === 'css') {
            group.classList.add('css-mode');
            // scaleFactor = 1;
        } else { 
            group.classList.add('image-mode');
            // scaleFactor = 0.1; 
        }

        const currentRotate = group.style.transform.includes('rotate') ? group.style.transform.match(/rotate\(([^)]+)\)/)?.[0] || 'rotate(0deg)' : 'rotate(0deg)';
        // ★ここも変更！ scaleFactorが不要になるため transform に scale を含めない
        group.style.transform = `${currentRotate}`;
        group.style.transformOrigin = 'center center';


        Array.from(group.querySelectorAll('.stroke')).forEach((stroke, index) => {
            stroke.style.backgroundColor = ''; 
            stroke.style.backgroundImage = ''; 
            stroke.style.opacity = 1; 

            if (currentColorMode === 'css') {

              const rgba = (r,g,b,a) => `rgba(${r},${g},${b},${a})`;
              stroke.style.backgroundColor = rgba(currentR, currentG, currentB, currentAlpha);

            } else { 
                const strokeNum = index + 1; 
                if (SHOU_IMAGE_PATHS[strokeNum]) {
                    stroke.style.backgroundImage = `url(${SHOU_IMAGE_PATHS[strokeNum]})`;
                    stroke.style.opacity = currentAlpha; 
                }
            }
        });
    }

    // カウンターの表示を更新する関数
    function updateDisplay() {
        shouGroups.forEach(group => {
            Array.from(group.querySelectorAll('.stroke')).forEach(stroke => {
                stroke.style.display = 'none';
            });
        });

        const requiredGroups = Math.ceil(currentCount / maxCountPerShou) || 1;
        while (shouGroups.length < requiredGroups) {
            createShouGroup(); 
        }

        shouGroups.forEach(group => {
            // ★ここも変更！ scaleFactor は不要
            // let scaleFactor = 1; 
            if (currentColorMode === 'css') {
                group.classList.remove('image-mode');
                group.classList.add('css-mode');
                // scaleFactor = 1;
            } else {
                group.classList.remove('css-mode');
                group.classList.add('image-mode');
                // scaleFactor = 0.1; 
            }
            const currentRotate = group.style.transform.includes('rotate') ? group.style.transform.match(/rotate\(([^)]+)\)/)?.[0] || 'rotate(0deg)' : 'rotate(0deg)';
            // ★ここも変更！ scaleFactorが不要になるため transform に scale を含めない
            group.style.transform = `${currentRotate}`;
            group.style.transformOrigin = 'center center';
        });

        let remainingCount = currentCount;

        shouGroups.forEach((group, groupIndex) => {
            if (remainingCount === 0) {
                return;
            }

            const strokes = Array.from(group.querySelectorAll('.stroke'));
            const strokesToShow = Math.min(remainingCount, maxCountPerShou);

            for (let i = 0; i < strokesToShow; i++) {
                strokes[i].style.display = 'block';
            }
            remainingCount -= strokesToShow;
        });
        
        actualCountSpan.textContent = currentCount; 
        saveSettings();
    }

    // --- イベントリスナー ---
    incrementBtn.addEventListener('click', () => {
        currentCount++;
        updateDisplay();
    });

    decrementBtn.addEventListener('click', () => {
        if (currentCount > 0) {
            currentCount--;
            updateDisplay();
        }
    });

    applyColorBtn.addEventListener('click', () => {
        if (parseColorInput(colorInput.value)) {
            applyStrokeStyle(); 
        }
    });

    alphaSlider.addEventListener('input', (event) => {
        currentAlpha = parseFloat(event.target.value);
        alphaValueSpan.textContent = currentAlpha.toFixed(2);
        applyStrokeStyle(); 
    });

    // カラーモードラジオボタンの変更イベント
    modeCssRadio.addEventListener('change', () => {
        currentColorMode = 'css';
        cssColorControls.style.display = 'flex'; 
        // 既存のshouGroupsの表示をクリアして再描画することで、CSSスタイルを完全に適用
        shouGroups = []; // 全グループを破棄
        counterDisplay.innerHTML = ''; // HTMLからも削除
        updateDisplay(); // 新しいモードで全て再作成
        applyStrokeStyle(); 
        saveSettings(); 
    });

    modeImageRadio.addEventListener('change', () => {
        currentColorMode = 'image';
        cssColorControls.style.display = 'none'; 
        // 既存のshouGroupsの表示をクリアして再描画することで、CSSスタイルを完全に適用
        shouGroups = []; // 全グループを破棄
        counterDisplay.innerHTML = ''; // HTMLからも削除
        updateDisplay(); // 新しいモードで全て再作成
        applyStrokeStyle(); 
        saveSettings(); 
    });

    resetSettingsBtn.addEventListener('click', () => {
        currentCount = 0;
        shouGroups = [];
        counterDisplay.innerHTML = '';
        actualCountSpan.textContent = currentCount;

        currentR = 255;
        currentG = 255;
        currentB = 255;
        currentAlpha = DEFAULT_ALPHA;
        currentColorMode = 'css'; 

        colorInput.value = DEFAULT_RGB_COLOR_STR;
        alphaSlider.value = DEFAULT_ALPHA;
        alphaValueSpan.textContent = DEFAULT_ALPHA.toFixed(2);
        modeCssRadio.checked = true; 
        cssColorControls.style.display = 'flex'; 

        localStorage.removeItem(LS_KEY_COUNT);
        localStorage.removeItem(LS_KEY_COLOR_R);
        localStorage.removeItem(LS_KEY_COLOR_G);
        localStorage.removeItem(LS_KEY_COLOR_B);
        localStorage.removeItem(LS_KEY_ALPHA);
        localStorage.removeItem(LS_KEY_COLOR_MODE);

        updateDisplay(); // 初期化後、再描画
        applyStrokeStyle(); // 初期化後、スタイルを適用
    });

    // --- 初期化処理 ---
    loadSettings();
    
    if (currentColorMode === 'css') {
        modeCssRadio.checked = true;
        cssColorControls.style.display = 'flex';
    } else {
        modeImageRadio.checked = true;
        cssColorControls.style.display = 'none';
    }

    updateDisplay();
    applyStrokeStyle();
});