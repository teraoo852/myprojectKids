/* 46字と単語（spec §5・草案の ROWS をもとに。ち の ちょうちょ は拗音なので ちくわ に替えた） */
var KIDS = window.KIDS || (window.KIDS = {});

/* 1つ＝1つの行（ぎょう）。chars は あ段〜お段の5つ（欠けは null）。
 * 各字: [字, キー, [[単語, 絵のキー], …]]（キーは URL の #ka と記録に使う） */
KIDS.ROWS = [
  { gyou: 'あ行', row: 1, chars: [['あ','a',[['あり','ari'],['あひる','ahiru']]], ['い','i',[['いぬ','inu'],['いちご','ichigo']]], ['う','u',[['うさぎ','usagi'],['うし','ushi']]], ['え','e',[['えんぴつ','enpitsu'],['えび','ebi']]], ['お','o',[['おにぎり','onigiri'],['おばけ','obake']]]] },
  { gyou: 'か行', row: 2, chars: [['か','ka',[['かさ','kasa'],['かめ','kame']]], ['き','ki',[['きりん','kirin'],['きのこ','kinoko']]], ['く','ku',[['くま','kuma'],['くつ','kutsu']]], ['け','ke',[['けむし','kemushi'],['けしごむ','keshigomu']]], ['こ','ko',[['こま','koma'],['こおり','koori']]]] },
  { gyou: 'さ行', row: 3, chars: [['さ','sa',[['さかな','sakana'],['さくら','sakura']]], ['し','shi',[['しまうま','shimauma'],['しんごう','shingou']]], ['す','su',[['すいか','suika'],['すべりだい','suberidai']]], ['せ','se',[['せみ','semi'],['せんぷうき','senpuuki']]], ['そ','so',[['そら','sora'],['そり','sori']]]] },
  { gyou: 'た行', row: 4, chars: [['た','ta',[['たまご','tamago'],['たいこ','taiko']]], ['ち','chi',[['ちくわ','chikuwa'],['ちず','chizu']]], ['つ','tsu',[['つき','tsuki'],['つみき','tsumiki']]], ['て','te',[['て','te'],['てぶくろ','tebukuro']]], ['と','to',[['とけい','tokei'],['とり','tori']]]] },
  { gyou: 'な行', row: 5, chars: [['な','na',[['なす','nasu'],['なべ','nabe']]], ['に','ni',[['にじ','niji'],['にわとり','niwatori']]], ['ぬ','nu',[['ぬいぐるみ','nuigurumi'],['ぬりえ','nurie']]], ['ね','ne',[['ねこ','neko'],['ねぎ','negi']]], ['の','no',[['のり','nori'],['のこぎり','nokogiri']]]] },
  { gyou: 'は行', row: 6, chars: [['は','ha',[['はな','hana'],['はさみ','hasami']]], ['ひ','hi',[['ひこうき','hikouki'],['ひまわり','himawari']]], ['ふ','fu',[['ふね','fune'],['ふうせん','fuusen']]], ['へ','he',[['へび','hebi'],['へや','heya']]], ['ほ','ho',[['ほし','hoshi'],['ほん','hon']]]] },
  { gyou: 'ま行', row: 7, chars: [['ま','ma',[['まくら','makura'],['まめ','mame']]], ['み','mi',[['みかん','mikan'],['みみ','mimi']]], ['む','mu',[['むし','mushi'],['むしめがね','mushimegane']]], ['め','me',[['め','me'],['めがね','megane']]], ['も','mo',[['もも','momo'],['もり','mori']]]] },
  { gyou: 'や行', row: 8, chars: [['や','ya',[['やま','yama'],['やさい','yasai']]], null, ['ゆ','yu',[['ゆき','yuki'],['ゆびわ','yubiwa']]], null, ['よ','yo',[['よる','yoru'],['よつば','yotsuba']]]] },
  { gyou: 'ら行', row: 9, chars: [['ら','ra',[['らくだ','rakuda'],['らっぱ','rappa']]], ['り','ri',[['りんご','ringo'],['りす','risu']]], ['る','ru',[['るすばん','rusuban'],['るびー','rubii']]], ['れ','re',[['れいぞうこ','reizouko'],['れもん','remon']]], ['ろ','ro',[['ろうそく','rousoku'],['ろぼっと','robotto']]]] },
  { gyou: 'わ行', row: 10, chars: [['わ','wa',[['わに','wani'],['わたあめ','wataame']]], null, ['を','wo',[]], null, ['ん','n',[['ぱん','pan'],['りぼん','ribon']]]] },
];

/* 1字だけ読むときの よみ（spec §8）。既定は字そのもの。実機で読み違えた字だけ書く（例: ha: 'ハ'） */
KIDS.YOMI = {};

/* を・ん の説明（spec §5）。strong は太字にする部分、example は を の例文カード */
KIDS.NOTE = {
  wo: { text: '「を」は ことばの あいだで つかう もじだよ', strong: '', example: ['ほんを よむ', 'hon'] },
  n:  { text: '「ん」で はじまる ことばは ないよ。「ん」で おわる ことばを みてみよう', strong: 'おわる' }
};
