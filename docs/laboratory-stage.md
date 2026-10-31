# 潜入（中級）・先進科学研究所 追加テスト

開発者モードのステージ選択に `TEST 潜入（中級）／先進科学研究所` を追加。
通常の7ステージの解放順は維持し、このテストのスコア・称号・戦績・解放・ランキングは保存しない。

潜入（上級）のマップ生成、当たり判定、2階構成、敵兵・軍用犬・巡回・警報・増援、重要資料3か所（各8秒）、脱出5秒を共有する。
2000年代初頭の研究施設をイメージした薄い汚れ・擦れ跡のあるアイボリー／薄灰色のタイル床・オフホワイトの塗装壁と、クリアシアンの研究設備へ描画だけを切り替える。館内の暗い描画マスクは35%の濃さとするが、敵の視認判定に使う照明計算は上級と同一。

## 素材

`assets/indoor/laboratory/` に透過PNG原本12点と、それらから変換したWebP12点を格納。
壁（横・縦）、床、実験机、保管棚、分析装置、培養装置、スキャナーベッド、試料箱、自動ドア、階段、研究所外観。
PNGは長辺384〜768pxへ縮小（壁・設備は透過余白をトリミングし、床は外周の透過を保持）。WebPは長辺384px（縦壁のみ768px）、品質85で出力。WebP12点の転送量は合計260,658バイト（約255KiB）。
ゲームはWebPだけを使用し、PNGはCloudflareの静的配信対象から除外。
研究所選択時に読み込み、既存の静的描画キャッシュを共有する。床は初回だけ2×2の鏡面配置タイルを作り、以後パターンを再利用する。
研究所の1階の建物外は既存の草原テクスチャ・色調・拡大率を再利用する。2階の建物外は従来どおり暗い非歩行領域で、初級・上級の屋外背景は変更しない。草原画像の読み込み完了時は床キャッシュを更新する。
家具の当たり判定は上級の既存寸法を維持し、その範囲に専用絵を収める。

## 画像生成

内蔵ImageGen、透過背景モード。設備9点は初回の新規生成を維持し、床・横壁・縦壁3点は元画像を編集して2000年代初頭風に変更。床はさらに薄い汚れ・擦れ跡を加える編集を実施。各アセット固有の指示は `laboratory-art-prompts.json` に記録。
初回の設備生成共通指示：isolated raster game sprite for a bright advanced science laboratory; cute polished 3D top-down stealth game; clean white ceramic, brushed silver, transparent pale cyan glass/acrylic, luminous cyan accents, rounded detailed toy-like render, soft even bright lighting. Orthographic top-down view with a small visible south/front face, matching indoor furniture sprites. No scene, floor plane, people, military equipment, text, labels, logos or cast shadow outside silhouette. One complete centered object, tight transparent margin, genuinely transparent background. Floor is a flat directly overhead material tile; building is an isometric thumbnail.

## 検証

`node --test tests/laboratory.test.cjs` で複数シードの上級との生成一致、選択・通常ステージへ戻る際の切り替え、素材・床キャッシュ、テスト結果の保存抑止を確認する。
ブラウザ／実機の画質・FPSとCloudflareデプロイ後の画面は別途確認が必要。
