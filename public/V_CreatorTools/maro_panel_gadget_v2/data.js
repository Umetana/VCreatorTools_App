// マロデータ V2

const MARO_01 = {
    title: "AIが自ら考え行動！「エージェンティックAI」が本格始動！",
    phrase: "こんまろ〜！",
    content: `こんまろ！いつも配信楽しく見ています。
最近ぐっと寒くなってきましたが、体調など崩されていませんか？
温かい飲み物でも飲んで、ゆっくり休んでくださいね。`
};

const MARO_02 = {
    title: "食のこだわり",
    phrase: "目玉焼きにはソース派",
    content: `目玉焼きには何をかけますか？
私は断然「中濃ソース」派です！
白米との相性が抜群なので、ぜひ一度試してみてください。`
};

const MARO_03 = {
    title: "配信の感想",
    phrase: "昨日の歌枠最高でした！",
    content: `昨日の歌枠、新曲のカバーがすごく良かったです！
特にサビの高音の伸びが綺麗で、何度もアーカイブを再生しています。
また次回の歌枠も楽しみにしています！`
};

const MARO_04 = {
    title: "お悩み相談",
    phrase: "早起きが苦手です…",
    content: `どうしても朝起きるのが苦手なのですが、
何かスッと起きられるコツや、ルーティンはありますか？
配信者さんは夜型の方が多いイメージですが、どうされていますか？`
};

const MARO_05 = {
    title: "マシュマロの試作",
    phrase: "長文テスト用",
    content: `ここにはかなり長い文章を入れることができます。
1000文字程度のマシュマロでも、自動的にスクロールバーが表示されるので安心です。

【箇条書きテスト】
・一行目
・二行目
・三行目

このように、改行を多用してもレイアウトが崩れにくい設計になっています。`
};

const MARO_DATA = [
    MARO_01,
    MARO_02,
    MARO_03,
    MARO_04,
    MARO_05,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
];

if (typeof module !== 'undefined' && module.exports) module.exports = MARO_DATA;
