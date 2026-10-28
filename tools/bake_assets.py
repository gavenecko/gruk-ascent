# Regenerates assets/*.png + atlas.json from the procedural art code in game.js
import asyncio, subprocess, time, sys, json, base64, os
from playwright.async_api import async_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
async def main():
    srv=subprocess.Popen([sys.executable,'-m','http.server','8770'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(); await pg.goto('http://localhost:8770/index.html'); await pg.wait_for_timeout(500)
        r=await pg.evaluate("GRUK.exportArt()")
        os.makedirs(os.path.join(ROOT,'assets'),exist_ok=True)
        for n,d in r['files'].items(): open(os.path.join(ROOT,'assets',n),'wb').write(base64.b64decode(d.split(',')[1]))
        open(os.path.join(ROOT,'assets','atlas.json'),'w').write(r['json'])
        print('wrote',len(r['files']),'images'); await b.close()
    srv.terminate()
asyncio.run(main())
