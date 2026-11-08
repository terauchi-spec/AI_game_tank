"""Compile conservative 128x128 visual alpha masks for setup-only placement.
Keep collision masks independent. Preserve transparent holes; never fill outlines.
"""
import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
paths={p.stem:p for p in (root/'assets/jungle').glob('*.webp')}
paths.update({name:root/'assets/cover'/f'{name}.webp' for name in ['tree','tree_v2']})
masks={}
for name,path in sorted(paths.items()):
    alpha=Image.open(path).convert('RGBA').getchannel('A')
    data=bytearray(128*16)
    for y in range(128):
        for x in range(128):
            box=(x*alpha.width//128,y*alpha.height//128,max(x*alpha.width//128+1,(x+1)*alpha.width//128),max(y*alpha.height//128+1,(y+1)*alpha.height//128))
            if alpha.crop(box).getextrema()[1]>=16:
                data[y*16+x//8]|=1<<(x%8)
    masks[name]=data.hex()
(root/'js/jungle-placement-masks.js').write_text('// Generated visual-alpha bitsets; decode only during jungle setup.\nconst JUNGLE_PLACEMENT_MASKS='+json.dumps(masks,separators=(',',':'))+';\n')
print(f'{len(masks)} visual masks compiled; no image assets modified')
