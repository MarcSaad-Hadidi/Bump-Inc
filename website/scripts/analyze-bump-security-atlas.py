"""Read atlas landmarks/contours for native UV registration; never repaint pixels."""
import json
from PIL import Image
old = Image.open('src/bump/chapters/textures/conditioned/security-0.webp').convert('RGBA')
new = Image.open('src/bump/security/assets/security-team-v18.png').convert('RGB').transpose(Image.Transpose.FLIP_TOP_BOTTOM).resize(old.size)
heads = [
 {'name':'eyes-m-01','bounds':[320,580,375,890],'knots':[[375,375],[585,611],[820,837],[890,890]],'center':465,'eyes':[[489,611,19,9,0.02],[543,615,13,8,0.02]]},
 {'name':'eyes-m-02','bounds':[575,865,380,855],'knots':[[380,380],[592,607],[780,794],[855,855]],'center':720,'eyes':[[722,595,18,11,.35],[773,621,12,10,.35]]},
 {'name':'eyes-m-03','bounds':[865,1130,345,870],'knots':[[345,345],[585,610],[795,819],[870,870]],'center':1010,'eyes':[[1008,611,18,9,-.03],[1064,608,15,9,-.03]]},
 {'name':'eyes-w-01','bounds':[1150,1510,395,880],'knots':[[395,399],[605,620],[795,813],[880,880]],'center':1340,'eyes':[[1317,622,14,10,-.08],[1368,619,18,11,-.08]]},
 {'name':'eyes-w-02','bounds':[1490,1740,410,955],'knots':[[410,410],[685,701],[855,867],[955,955]],'center':1600,'eyes':[[1545,699,16,11,.07],[1604,704,21,12,.07]]},
]

def span(im,y,bounds,is_old):
 x0,x1,_,_=bounds
 xs=[x for x in range(x0,x1+1) if (im.getpixel((x,y))[3]>145 if is_old else max(im.getpixel((x,y)))>10)]
 if not xs:return None
 # Consecutive painted run; gaps of a few pixels are only antialiasing.
 runs=[];start=last=xs[0]
 for x in xs[1:]:
  if x-last>5:runs.append((start,last));start=x
  last=x
 runs.append((start,last))
 return list(max(runs,key=lambda r:r[1]-r[0]))
for h in heads:
 x0,x1,y0,y1=h['bounds']
 h['paintedRows']=[span(new,y,h['bounds'],False) for y in range(y0,y1+1)]
print(json.dumps({'size':old.size[0],'heads':heads},separators=(',',':')))
