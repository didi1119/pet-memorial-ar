import sys
from PIL import Image
files=sys.argv[2:]; out=sys.argv[1]
ims=[Image.open(f).resize((360,640)) for f in files]
cols=min(6,len(ims)); rows=(len(ims)+cols-1)//cols
s=Image.new('RGB',(360*cols,640*rows),'white')
for i,im in enumerate(ims): s.paste(im,((i%cols)*360,(i//cols)*640))
s.save(out)
