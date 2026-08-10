// Product defaults. Keep this file unchanged when saving user settings.
window.OBS_EFFECT_DEFAULT_SETTINGS = {
  "schemaVersion": 1,
  "masterVolume": 0.5,
  "resolution": { "width": 1920, "height": 1080 },
  "gridConfig": { "cols": 3, "rows": 2 },
  "buttons": [
    {
      "id": "starter_crown",
      "label": "王冠",
      "effectId": "crown_effect",
      "gridIndex": 0,
      "params": {
        "mainText": "LEGENDARY!", "mainColor": "#ffd700", "fontFamily": "sans-serif", "fontSize": "120px",
        "duration": 3000, "volume": 0.5, "bgOpacity": 0.4,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "particleCount": 100, "sparkle": true }
      }
    },
    {
      "id": "starter_cyberpunk",
      "label": "サイバーパンク",
      "effectId": "cyberpunk_effect",
      "gridIndex": 1,
      "params": {
        "mainText": "SYSTEM ONLINE", "mainColor": "#ffffff", "fontFamily": "sans-serif", "fontSize": "100px",
        "duration": 3000, "volume": 0.5, "bgOpacity": 0.4,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "neonColor": "#ff00ff", "glitchIntensity": 1, "showScanlines": true }
      }
    },
    {
      "id": "starter_feather",
      "label": "天使の羽根",
      "effectId": "feather_effect",
      "gridIndex": 2,
      "params": {
        "mainText": "CONGRATULATIONS!", "mainColor": "#ffffff", "fontFamily": "sans-serif", "fontSize": "100px",
        "duration": 5000, "volume": 0.5, "bgOpacity": 0.25,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "count": 25, "minSize": 30, "maxSize": 60, "speed": 1, "useColorTint": true }
      }
    },
    {
      "id": "starter_newcomer",
      "label": "初見歓迎",
      "effectId": "newcomer_surround_effect",
      "gridIndex": 3,
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
      "id": "starter_mahjong",
      "label": "麻雀演出",
      "effectId": "mohjong_draw_effect",
      "gridIndex": 4,
      "params": {
        "mainText": "ツモ！", "mainColor": "#ffffff", "fontFamily": "sans-serif", "fontSize": "100px",
        "duration": 7000, "volume": 0.5, "bgOpacity": 0.4,
        "trigger": { "type": "none", "linkedId": "counter1", "value": 1 },
        "options": { "roleType": "random", "waitDuration": 1500, "resultDuration": 4000 }
      }
    }
  ]
};

const DEFAULT_SETTINGS = window.OBS_EFFECT_DEFAULT_SETTINGS;
