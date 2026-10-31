# 味方兵・相棒の救助表示と再気絶防止

- 制圧の味方兵、相棒を接触救助した瞬間、頭上に白縁の赤十字を1つ表示する。約0.8秒で約26px上昇しながら消える。
- 接触・時間経過のどちらで気絶から復帰しても、5秒間は再気絶しない。相棒のHP0からの接触救助にも適用する。
- 爆風着地時、相棒の設置爆弾被弾・車両大破・敵爆撃でも保護時間を確認する。HPダメージ、死亡判定、敵兵の気絶処理は従来どおり。
- 赤十字は既存の上限付きパーティクル配列・画面外カリング・更新処理を共用する。画像読み込みや独立タイマーは増やさない。

検証: `node --test tests/ally-rescue.test.cjs tests/frontline.test.cjs tests/infiltration-partner.test.cjs tests/tank-combat-bridge.test.cjs tests/enemy-bomber.test.cjs`（146件成功）。接触時のみの表示、消滅、5秒前後の再気絶判定、相棒救助、既存戦闘を確認。スマートフォン実機での見た目は未確認。

## スキルの味方への表示拡張

- 増援は制圧以外のステージでも、徒歩・非潜伏・視線が通る距離22px未満の接触で気絶解除でき、赤十字を表示する。
- 相棒は従来の接触救助時の赤十字表示を維持。猟犬も既存の接触解除時に同じ赤十字を表示する。
- 自然復帰時や復帰後の接触では赤十字を追加しない。猟犬の気絶時間・接触範囲は変更しない。

追加検証: `node --test tests/ally-rescue.test.cjs tests/frontline.test.cjs tests/infiltration-partner.test.cjs tests/enemy-bomber.test.cjs`（142件成功）。スマートフォン実機表示は未確認。

## 3スキル共通の接触救助後保護

増援・相棒に加え、猟犬にも接触救助後5秒間の再気絶防止を適用する。猟犬の気絶入口 `stunHound` で判定し、弾・爆風・爆撃からの再気絶を防ぐ。時間はゲーム更新のdtで減らし、停止中は進めない。猟犬の自然復帰時の挙動は維持する。

検証: `node --test tests/ally-rescue.test.cjs tests/frontline.test.cjs tests/infiltration-partner.test.cjs tests/enemy-bomber.test.cjs tests/tank-combat-bridge.test.cjs`（151件成功）。3スキルすべてで救助直後・4.9秒・5秒超過後を確認。実機での操作は未確認。
