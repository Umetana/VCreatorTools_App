// Initial user settings shipped with OBS Screen Effect V2.
// Saving from config.html replaces this object with the user's settings.
window.OBS_EFFECT_USER_SETTINGS = {
  "schemaVersion": 1,
  "masterVolume": 0.5,
  "resolution": { "width": 1920, "height": 1080 },
  "gridConfig": { "cols": 3, "rows": 4 },
  "buttons": [
    {
      "id": "starter_crown", "label": "王冠", "effectId": "crown_effect", "gridIndex": 0,
      "params": {
        "mainText": "LEGENDARY!", "mainColor": "#ffd700", "fontFamily": "sans-serif", "fontSize": "120px",
        "duration": 3000, "volume": 0.5, "bgOpacity": 0.4,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "particleCount": 100, "sparkle": true }
      }
    },
    {
      "id": "starter_cyberpunk", "label": "サイバーパンク", "effectId": "cyberpunk_effect", "gridIndex": 1,
      "params": {
        "mainText": "SYSTEM ONLINE", "mainColor": "#ffffff", "fontFamily": "sans-serif", "fontSize": "100px",
        "duration": 3000, "volume": 0.5, "bgOpacity": 0.4,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "neonColor": "#ff00ff", "glitchIntensity": 1, "showScanlines": true }
      }
    },
    {
      "id": "starter_feather", "label": "天使の羽根", "effectId": "feather_effect", "gridIndex": 2,
      "params": {
        "mainText": "CONGRATULATIONS!", "mainColor": "#ffffff", "fontFamily": "sans-serif", "fontSize": "100px",
        "duration": 5000, "volume": 0.5, "bgOpacity": 0.25,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "count": 25, "minSize": 30, "maxSize": 60, "speed": 1, "useColorTint": true }
      }
    },
    {
      "id": "starter_newcomer", "label": "初見歓迎", "effectId": "newcomer_surround_effect", "gridIndex": 3,
      "params": {
        "mainText": "初見さん、いらっしゃい！", "mainColor": "#ffd700", "fontFamily": "sans-serif", "fontSize": "100px",
        "duration": 5500, "volume": 0.5, "bgOpacity": 0.3,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": {
          "mode": "A", "assetFile": "newcomer.png", "maxListeners": 12, "speechSet": "welcome", "speechDensity": 0.45, "speechDurationMs": 1200,
          "safeAreaBottomPx": 140, "safeMarginPx": 40, "noGoMarginPx": 28, "ringRadiusStart": 520, "ringRadiusEnd": 240, "orbitDegrees": 90,
          "centerSizePx": 512, "centerBoxSize": 560, "bounceAmpPx": 26, "bouncePeriodMs": 900,
          "listenerScaleMin": 0.65, "listenerScaleMax": 0.95
        }
      }
    },
    {
      "id": "starter_mahjong", "label": "麻雀演出", "effectId": "mohjong_draw_effect", "gridIndex": 4,
      "params": {
        "mainText": "ツモ！", "mainColor": "#ffffff", "fontFamily": "sans-serif", "fontSize": "100px",
        "duration": 7000, "volume": 0.5, "bgOpacity": 0.4,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "roleType": "random", "waitDuration": 1500, "resultDuration": 4000 }
      }
    },
    {
      "id": "starter_particle", "label": "ハートが浮かぶ", "effectId": "particle_effect", "gridIndex": 5,
      "params": {
        "mainText": "THANK YOU!", "mainColor": "#ff5f8f", "fontFamily": "sans-serif", "fontSize": "100px",
        "duration": 4500, "volume": 0.5, "bgOpacity": 0,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "shape": "heart", "motion": "rise", "emission": "continuous", "spawnArea": "screen", "count": 40, "minSize": 24, "maxSize": 54, "travelTimeMs": 3500, "swayPx": 60, "rotation": 180, "useMainColor": false }
      }
    },
    {
      "id": "starter_confetti", "label": "紙吹雪", "effectId": "confetti_effect", "gridIndex": 6,
      "params": {
        "mainText": "CONGRATULATIONS!", "mainColor": "#ffffff", "fontFamily": "sans-serif", "fontSize": "100px",
        "duration": 5200, "volume": 0.5, "bgOpacity": 0,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "count": 120, "emission": "burst", "fallTimeMs": 4500, "windPx": 140, "swayPx": 70, "minSize": 8, "maxSize": 18, "palette": "party" }
      }
    },
    {
      "id": "starter_impact", "label": "インパクト", "effectId": "impact_effect", "gridIndex": 7,
      "params": {
        "mainText": "IMPACT!", "mainColor": "#ffd84d", "fontFamily": "sans-serif", "fontSize": "140px",
        "duration": 1800, "volume": 0.5, "bgOpacity": 0.15,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "showRays": true, "showShockwave": true, "showFlash": true, "rayCount": 32, "shockwaveCount": 3, "intensity": 1 }
      }
    },
    {
      "id": "starter_alert", "label": "警報", "effectId": "alert_effect", "gridIndex": 8,
      "params": {
        "mainText": "WARNING!", "mainColor": "#ff3030", "fontFamily": "sans-serif", "fontSize": "120px",
        "duration": 3500, "volume": 0.5, "bgOpacity": 0.1,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "showBands": true, "showFlash": true, "beaconPlacement": "top", "rotationTimeMs": 1200, "pulseTimeMs": 650, "intensity": 1 }
      }
    },
    {
      "id": "starter_spotlight", "label": "スポットライト", "effectId": "spotlight_effect", "gridIndex": 9,
      "params": {
        "mainText": "YOU ARE THE STAR!", "mainColor": "#fff3b0", "fontFamily": "sans-serif", "fontSize": "110px",
        "duration": 4200, "volume": 0.5, "bgOpacity": 0,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "mode": "focus", "position": "center", "targetX": 50, "targetY": 50, "shape": "ellipse", "spotSize": 28, "darkness": 0.72, "textPosition": "spot", "showDust": true, "dustCount": 24 }
      }
    },
    {
      "id": "starter_image_performance", "label": "画像パフォーマンス", "effectId": "image_performance_effect", "gridIndex": 10,
      "params": {
        "mainText": "", "mainColor": "#ffffff", "fontFamily": "sans-serif", "fontSize": "100px",
        "duration": 3500, "volume": 0.5, "bgOpacity": 0,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "assetId": "", "motion": "cutin", "position": "center", "targetX": 50, "targetY": 50, "imageSize": 45, "direction": "left", "cutinExit": "fade", "shakePx": 16, "count": 28, "minSize": 50, "maxSize": 130, "fallTimeMs": 3800 }
      }
    },
    {
      "id": "starter_money_shower", "label": "Money Shower", "effectId": "money_shower_effect", "gridIndex": 11,
      "params": {
        "mainText": "", "mainColor": "#ffffff", "fontFamily": "sans-serif", "fontSize": "100px",
        "duration": 5200, "volume": 0.5, "bgOpacity": 0,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "material": "mixed", "usePortrait": false, "portraitAssetId": "", "portraitTone": "auto", "count": 42, "minSize": 80, "maxSize": 170, "fallTimeMs": 4300, "swayPx": 130, "rotationTurns": 3, "coinBounce": true, "billBounce": false }
      }
    }
  ]
};
