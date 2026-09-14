"""フォントを site/ で使う字だけに小さくする（spec §8）。

使い方（リポジトリの直下で）:
    .venv/bin/python tools/fonts.py

- 元の TTF は fonts-src/（.gitignore）。Google Fonts の google/fonts リポジトリの ofl/zenmarugothic から取る。
- 残す字: ひらがな全部・英数字・site/ の中で使っている かな と記号・「行」（か行 などに使う）。
  漢字は「行」だけ。ほかの漢字は画面5（おとな向け・iPad 内蔵のフォント）にしか出ないので入れない。
- 子ども向けの画面に字を足したら、これを走らせ直す。フォントに無い字は下に出す（その字は iPad 内蔵のフォントになる）。
"""
import pathlib
import shutil
import unicodedata

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "fonts-src"
OUT = ROOT / "site" / "fonts"
WEIGHTS = ((700, "Bold"), (900, "Black"))
KANJI = set("行")


def is_kanji(c: str) -> bool:
    return unicodedata.name(c, "").startswith("CJK UNIFIED IDEOGRAPH")


def wanted_chars() -> set:
    text = "".join(
        p.read_text(encoding="utf-8")
        for p in (ROOT / "site").rglob("*")
        if p.suffix in {".html", ".js", ".css", ".webmanifest"}
    )
    chars = {c for c in text if ord(c) > 0x7F and not is_kanji(c)}
    chars |= {chr(c) for c in range(0x20, 0x7F)}      # 英数字・記号
    chars |= {chr(c) for c in range(0x3041, 0x3097)}  # ひらがな全部（あとで字を足しても困らない）
    chars |= KANJI
    return {c for c in chars if not c.isspace() or c == " "}


def main() -> None:
    chars = wanted_chars()
    OUT.mkdir(parents=True, exist_ok=True)
    for weight, name in WEIGHTS:
        font = TTFont(SRC / f"ZenMaruGothic-{name}.ttf")
        cmap = font.getBestCmap()
        missing = sorted(c for c in chars if ord(c) not in cmap)
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]          # 著作権とライセンスの記載を残す
        opts.notdef_outline = True
        sub = subset.Subsetter(opts)
        sub.populate(text="".join(sorted(chars)))
        sub.subset(font)
        dest = OUT / f"zen-maru-gothic-{weight}.woff2"
        font.save(dest)
        print(f"{dest.relative_to(ROOT)}: {dest.stat().st_size // 1024} KB・{len(chars) - len(missing)} 字")
        if missing:
            print("  フォントに無い字（iPad 内蔵のフォントになる）:", " ".join(missing))
    shutil.copyfile(SRC / "OFL.txt", OUT / "OFL.txt")
    print("site/fonts/OFL.txt: ライセンス文を置いた")


if __name__ == "__main__":
    main()
