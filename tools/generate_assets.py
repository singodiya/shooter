from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math, random, os

OUT = Path('/mnt/data/ai_2d_shooter_complete/assets/images')
OUT.mkdir(parents=True, exist_ok=True)

# Palette
NAVY = (8, 14, 28, 255)
DARK = (12, 18, 34, 255)
CYAN = (0, 217, 255, 255)
CYAN2 = (80, 245, 255, 255)
ORANGE = (255, 113, 34, 255)
RED = (255, 63, 78, 255)
GREEN = (70, 255, 133, 255)
YELLOW = (255, 224, 90, 255)
WHITE = (235, 248, 255, 255)
PURPLE = (147, 82, 255, 255)
GRAY = (92, 105, 132, 255)
METAL = (75, 88, 112, 255)
SHADOW = (0, 0, 0, 95)


def glow_circle(size, color, radius=None, blur=18):
    w,h=size
    img=Image.new('RGBA', size, (0,0,0,0))
    d=ImageDraw.Draw(img)
    if radius is None: radius=min(w,h)//4
    cx,cy=w//2,h//2
    d.ellipse((cx-radius,cy-radius,cx+radius,cy+radius), fill=color)
    return img.filter(ImageFilter.GaussianBlur(blur))


def save(img, name):
    img.save(OUT/name)
    print('saved', name)


def add_neon_line(draw, pts, color, width=4):
    draw.line(pts, fill=(0,0,0,160), width=width+4, joint='curve')
    draw.line(pts, fill=color, width=width, joint='curve')


def player_sprite(name, pose='idle'):
    W,H=256,256
    img=Image.new('RGBA',(W,H),(0,0,0,0))
    d=ImageDraw.Draw(img)
    # shadow
    d.ellipse((70,218,190,238), fill=SHADOW)
    # pose params
    if pose=='run':
        body_angle=0
        leg1=((120,163),(86,212)); leg2=((128,164),(164,212))
        arm1=((133,105),(185,120)); arm2=((114,106),(82,126))
        gun=(178,105,230,122)
    elif pose=='jump':
        leg1=((119,163),(97,198)); leg2=((132,164),(160,192))
        arm1=((134,103),(190,92)); arm2=((113,104),(80,82))
        gun=(184,78,238,96)
    elif pose=='shoot':
        leg1=((118,164),(98,218)); leg2=((131,164),(150,218))
        arm1=((133,105),(194,108)); arm2=((114,105),(84,125))
        gun=(188,95,242,116)
    else:
        leg1=((118,163),(104,218)); leg2=((132,164),(148,218))
        arm1=((133,105),(175,122)); arm2=((114,105),(85,128))
        gun=(170,110,220,128)
    # legs
    for start,end in [leg1, leg2]:
        add_neon_line(d, [start,end], METAL, 17)
        add_neon_line(d, [(start[0],start[1]),((start[0]+end[0])//2,(start[1]+end[1])//2), end], CYAN, 3)
        d.ellipse((end[0]-14,end[1]-8,end[0]+20,end[1]+8), fill=(18,24,42,255), outline=CYAN)
    # body armor
    d.rounded_rectangle((91,76,158,166), radius=24, fill=(20,30,55,255), outline=CYAN, width=3)
    d.polygon([(99,86),(150,78),(159,126),(142,160),(102,153),(85,118)], fill=(28,39,68,255))
    d.line((102,94,148,150), fill=CYAN2, width=3)
    d.polygon([(119,108),(142,112),(135,142),(112,138)], fill=(255,113,34,210), outline=ORANGE)
    # neck/head/helmet
    d.rounded_rectangle((114,60,136,82), radius=6, fill=(158,102,76,255))
    d.ellipse((91,22,159,82), fill=(27,35,58,255), outline=CYAN, width=3)
    d.pieslice((100,31,153,76), 185, 18, fill=(38,50,80,255))
    d.rounded_rectangle((118,43,152,59), radius=7, fill=(6,13,24,255), outline=CYAN2, width=2)
    d.line((124,52,148,52), fill=CYAN2, width=2)
    # arms
    for start,end in [arm2, arm1]:
        add_neon_line(d, [start,end], (65,77,103,255), 13)
        d.ellipse((end[0]-7,end[1]-7,end[0]+7,end[1]+7), fill=(70,90,120,255), outline=CYAN)
    # gun
    x1,y1,x2,y2=gun
    d.rounded_rectangle((x1,y1,x2,y2), radius=5, fill=(28,35,52,255), outline=ORANGE, width=3)
    d.rectangle((x2-2,y1+5,x2+13,y2-5), fill=ORANGE)
    d.ellipse((x2+8,y1+2,x2+26,y2+2), fill=(255,150,65,125))
    # small outline/glow
    glow=img.filter(ImageFilter.GaussianBlur(2))
    base=Image.new('RGBA',(W,H),(0,0,0,0))
    base.alpha_composite(glow)
    base.alpha_composite(img)
    save(base, name)

for pose in ['idle','run','jump','shoot']:
    player_sprite(f'player_{pose}.png', pose)


def drone():
    W,H=192,192
    img=Image.new('RGBA',(W,H),(0,0,0,0))
    d=ImageDraw.Draw(img)
    d.ellipse((28,125,164,146), fill=SHADOW)
    # glow
    img.alpha_composite(glow_circle((W,H),(255,63,78,80),50,16))
    d.rounded_rectangle((48,65,144,113), radius=22, fill=(34,39,58,255), outline=RED, width=3)
    d.ellipse((79,72,113,106), fill=(12,12,18,255), outline=(255,100,100,255), width=3)
    d.ellipse((88,81,104,97), fill=RED)
    d.line((96,68,96,110), fill=(255,120,120,210), width=2)
    # wings
    d.polygon([(48,76),(10,58),(19,101),(49,96)], fill=(44,54,78,255), outline=CYAN)
    d.polygon([(144,76),(182,58),(173,101),(143,96)], fill=(44,54,78,255), outline=CYAN)
    # guns
    d.rectangle((60,110,75,128), fill=(24,30,44,255), outline=ORANGE)
    d.rectangle((118,110,133,128), fill=(24,30,44,255), outline=ORANGE)
    save(img, 'enemy_drone.png')

drone()


def enemy_soldier():
    W,H=256,256
    img=Image.new('RGBA',(W,H),(0,0,0,0))
    d=ImageDraw.Draw(img)
    d.ellipse((70,220,188,239), fill=SHADOW)
    # legs
    for sx,ex in [(112,96),(139,156)]:
        d.line((sx,160,ex,220), fill=(30,38,55,255), width=18)
        d.line((sx,160,ex,220), fill=RED, width=3)
        d.ellipse((ex-14,213,ex+20,229), fill=(17,20,32,255), outline=RED)
    # body
    d.rounded_rectangle((83,82,158,166), radius=22, fill=(38,42,56,255), outline=RED, width=3)
    d.polygon([(98,98),(151,112),(138,154),(87,139)], fill=(48,54,74,255))
    d.ellipse((108,108,135,135), fill=(10,8,14,255), outline=RED, width=2)
    d.ellipse((116,116,127,127), fill=RED)
    # head
    d.rounded_rectangle((92,35,153,86), radius=18, fill=(36,40,54,255), outline=RED, width=3)
    d.rounded_rectangle((105,49,143,63), radius=5, fill=(13,9,16,255), outline=RED, width=2)
    # arms and gun
    d.line((156,112,198,108), fill=(45,50,68,255), width=14)
    d.line((198,108,232,117), fill=(40,44,60,255), width=11)
    d.rounded_rectangle((198,99,242,119), radius=4, fill=(22,24,36,255), outline=RED, width=2)
    d.rectangle((238,105,252,114), fill=RED)
    d.line((82,112,60,140), fill=(45,50,68,255), width=14)
    save(img, 'enemy_soldier.png')

enemy_soldier()


def boss():
    W,H=384,384
    img=Image.new('RGBA',(W,H),(0,0,0,0))
    d=ImageDraw.Draw(img)
    d.ellipse((74,333,306,361), fill=SHADOW)
    img.alpha_composite(glow_circle((W,H),(255,113,34,80),80,30))
    # legs
    for sx,ex in [(160,120),(220,266)]:
        d.line((sx,234,ex,335), fill=(44,52,73,255), width=36)
        d.line((sx,234,ex,335), fill=CYAN, width=5)
        d.rounded_rectangle((ex-38,322,ex+42,354), radius=12, fill=(25,30,46,255), outline=ORANGE, width=3)
    # body
    d.rounded_rectangle((94,91,278,250), radius=36, fill=(34,40,60,255), outline=ORANGE, width=5)
    d.polygon([(126,115),(254,102),(269,185),(222,238),(112,222),(84,164)], fill=(50,60,83,255))
    d.ellipse((154,136,222,204), fill=(12,12,20,255), outline=ORANGE, width=5)
    d.ellipse((171,153,205,187), fill=ORANGE)
    # head
    d.rounded_rectangle((125,45,245,112), radius=25, fill=(39,45,65,255), outline=CYAN, width=4)
    d.rounded_rectangle((151,67,220,87), radius=8, fill=(5,8,17,255), outline=CYAN2, width=2)
    d.line((160,77,212,77), fill=CYAN2, width=3)
    # arms
    d.line((93,139,36,206), fill=(44,52,73,255), width=35)
    d.rounded_rectangle((2,191,64,245), radius=16, fill=(35,42,61,255), outline=ORANGE, width=4)
    d.line((280,139,340,180), fill=(44,52,73,255), width=35)
    d.rounded_rectangle((316,162,380,204), radius=14, fill=(35,42,61,255), outline=RED, width=4)
    d.rectangle((373,174,389,193), fill=RED)
    # vents/details
    for x in [122,142,242,262]:
        d.line((x,128,x+18,170), fill=(0,220,255,170), width=3)
    save(img, 'boss_mech.png')

boss()


def bullet(name, color, w=96,h=32):
    img=Image.new('RGBA',(w,h),(0,0,0,0))
    d=ImageDraw.Draw(img)
    img.alpha_composite(glow_circle((w,h), color[:3]+(100,), 18, 10))
    d.rounded_rectangle((20,10,76,22), radius=7, fill=color, outline=(255,255,255,180), width=1)
    d.polygon([(8,16),(25,7),(25,25)], fill=color[:3]+(130,))
    d.polygon([(75,7),(94,16),(75,25)], fill=(255,255,255,220))
    save(img,name)

bullet('bullet_player.png', CYAN)
bullet('bullet_enemy.png', RED)


def explosion_frames():
    colors=[YELLOW, ORANGE, RED]
    for i in range(6):
        W=H=192
        img=Image.new('RGBA',(W,H),(0,0,0,0))
        d=ImageDraw.Draw(img)
        r=18+i*13
        img.alpha_composite(glow_circle((W,H),(255,100,20,110),r,18))
        random.seed(i)
        cx=cy=W//2
        pts=[]
        for a in range(0,360,18):
            rr=r + random.randint(-8,26)
            x=cx+math.cos(math.radians(a))*rr
            y=cy+math.sin(math.radians(a))*rr
            pts.append((x,y))
        d.polygon(pts, fill=colors[min(i//2,2)], outline=(255,255,180,180))
        d.ellipse((cx-r//2,cy-r//2,cx+r//2,cy+r//2), fill=(255,245,180,210))
        # smoke fade in later frames
        if i>2:
            for _ in range(12):
                x=random.randint(50,140); y=random.randint(45,135); rr=random.randint(8,18)
                d.ellipse((x-rr,y-rr,x+rr,y+rr), fill=(90,95,105,80))
        save(img, f'explosion_{i}.png')

explosion_frames()


def health_pack():
    W=H=96
    img=Image.new('RGBA',(W,H),(0,0,0,0))
    d=ImageDraw.Draw(img)
    img.alpha_composite(glow_circle((W,H),(70,255,133,80),32,12))
    d.rounded_rectangle((18,24,78,76), radius=12, fill=(28,45,45,255), outline=GREEN, width=3)
    d.rectangle((42,34,54,66), fill=GREEN)
    d.rectangle((30,46,66,58), fill=GREEN)
    d.line((22,30,73,70), fill=(255,255,255,70), width=2)
    save(img,'health_pack.png')

health_pack()


def coin():
    W=H=64
    img=Image.new('RGBA',(W,H),(0,0,0,0))
    d=ImageDraw.Draw(img)
    img.alpha_composite(glow_circle((W,H),(255,224,90,95),18,8))
    d.ellipse((14,10,50,54), fill=YELLOW, outline=ORANGE, width=3)
    d.line((32,18,32,47), fill=(170,100,20,255), width=4)
    save(img,'coin.png')
coin()


def obstacle():
    W,H=128,96
    img=Image.new('RGBA',(W,H),(0,0,0,0))
    d=ImageDraw.Draw(img)
    d.rounded_rectangle((8,18,120,88), radius=10, fill=(33,39,55,255), outline=(90,110,140,255), width=3)
    for x in range(18,110,22):
        d.line((x,24,x+10,84), fill=(55,67,94,255), width=5)
    d.rectangle((22,35,106,48), fill=(255,113,34,120))
    d.line((22,42,106,42), fill=ORANGE, width=2)
    save(img,'obstacle_crate.png')
obstacle()


def make_background(name, variant):
    W,H=1280,720
    img=Image.new('RGB',(W,H),(7,12,28))
    d=ImageDraw.Draw(img)
    # vertical gradient
    pix=img.load()
    for y in range(H):
        t=y/H
        r=int(7 + 12*t)
        g=int(12 + 10*t)
        b=int(28 + 22*t)
        for x in range(W):
            pix[x,y]=(r,g,b)
    d=ImageDraw.Draw(img,'RGBA')
    # moon/glows
    if variant=='far':
        d.ellipse((920,70,1070,220), fill=(70,130,170,30), outline=(120,220,255,80), width=3)
        # stars
        random.seed(4)
        for _ in range(110):
            x=random.randint(0,W-1); y=random.randint(0,260); a=random.randint(50,160)
            d.point((x,y), fill=(180,230,255,a))
        # mountains
        for layer, color, off in [(0,(10,25,50,255),0),(1,(13,30,61,255),60)]:
            pts=[(0,420+off)]
            for x in range(0,W+120,120):
                pts.append((x, random.randint(270+off,370+off)))
            pts.append((W,720)); pts.append((0,720))
            d.polygon(pts, fill=color)
        # far skyline
        random.seed(9)
        for x in range(-10,W,55):
            h=random.randint(110,240)
            d.rectangle((x,430-h,x+42,430), fill=(9,21,43,230))
            if random.random()<0.6:
                for wy in range(430-h+15,420,22):
                    d.rectangle((x+10,wy,x+15,wy+4), fill=(0,217,255,80))
    elif variant=='mid':
        # city ruins
        random.seed(10)
        for x in range(-30,W,75):
            h=random.randint(210,440)
            w=random.randint(45,95)
            top=520-h
            d.rectangle((x,top,x+w,520), fill=(14,25,47,245))
            # broken top
            pts=[(x,top+random.randint(0,45)),(x+w*0.3,top+random.randint(0,25)),(x+w*0.6,top+random.randint(0,60)),(x+w,top+random.randint(0,30)),(x+w,520),(x,520)]
            d.polygon(pts, fill=(13,24,47,255))
            for _ in range(random.randint(2,6)):
                wx=random.randint(x+5,x+w-10) if w>20 else x+5
                wy=random.randint(max(0,top+20),500)
                col=(0,217,255,90) if random.random()<0.5 else (255,113,34,80)
                d.rectangle((wx,wy,wx+8,wy+4), fill=col)
        # fog
        for i in range(9):
            y=410+i*23
            d.line((0,y,W,y+random.randint(-15,15)), fill=(80,220,255,18), width=20)
    else:
        # foreground pipes and platforms visual
        random.seed(12)
        for x in range(-50,W,140):
            h=random.randint(80,180)
            d.rectangle((x,540-h,x+80,620), fill=(18,27,45,235), outline=(0,217,255,55), width=2)
            d.line((x+10,560-h,x+70,560-h), fill=(255,113,34,80), width=4)
        for y in [555,590,625]:
            d.line((0,y,W,y+random.randint(-5,5)), fill=(75,90,120,130), width=12)
            d.line((0,y-3,W,y-3), fill=(0,217,255,80), width=2)
        # foreground haze
        d.rectangle((0,0,W,H), fill=(0,0,0,30))
    save(img.convert('RGBA'), f'background_{variant}.png')

for v in ['far','mid','front']:
    make_background(f'background_{v}.png', v)


def ground_tile():
    W,H=256,96
    img=Image.new('RGBA',(W,H),(0,0,0,0))
    d=ImageDraw.Draw(img)
    d.rounded_rectangle((0,0,W,H), radius=0, fill=(25,31,49,255))
    d.rectangle((0,0,W,18), fill=(48,59,83,255))
    d.line((0,17,W,17), fill=CYAN, width=2)
    for x in range(0,W,48):
        d.rectangle((x+3,24,x+41,84), fill=(33,40,60,255), outline=(70,84,112,255), width=2)
        d.line((x+8,32,x+36,78), fill=(18,24,37,255), width=2)
    for x in range(16,W,80):
        d.rectangle((x,8,x+24,12), fill=ORANGE)
    save(img,'ground_tile.png')

ground_tile()

# UI icons optional
