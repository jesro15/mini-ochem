import { test, expect } from '@playwright/test';
const camera = page => page.locator('mini-ochem').evaluate(app=>app.threeView.camera.position.toArray());
const distance = (a,b) => Math.hypot(...a.map((x,i)=>x-b[i]));
test('arrows rotate the view, preserve chemistry and reset orientation',async({page})=>{
 await page.goto('./?q=SMILES%3ACCC&view=3d');
 const stage=page.locator('#stage3d');
 await expect(stage.locator('canvas')).toBeVisible({timeout:25000});
 const before=await camera(page);
 const smiles=await page.locator('mini-ochem').evaluate(app=>app.state.resolved.smiles);
 for(const name of ['Rotate left','Rotate up','Rotate down','Rotate right']){
   const start=await camera(page);
   const button=stage.getByRole('button',{name,exact:true});
   const box=await button.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
   await button.click();
   await expect.poll(async()=>distance(start,await camera(page))).toBeGreaterThan(.1);
 }
 expect(distance(before,await camera(page))).toBeLessThan(.001);
 await stage.getByRole('button',{name:'Rotate left',exact:true}).focus();
 await page.keyboard.press('Enter');
 expect(distance(before,await camera(page))).toBeGreaterThan(.1);
 await stage.getByRole('button',{name:'Reset view',exact:true}).click();
 expect(distance(before,await camera(page))).toBeLessThan(.001);
 expect(await page.locator('mini-ochem').evaluate(app=>app.state.resolved.smiles)).toEqual(smiles);
 expect(await page.locator('mini-ochem').evaluate(app=>app.state.selection)).toBeNull();
 await page.screenshot({path:`test-results/${test.info().project.name}-arrows.png`,fullPage:true});
});
test('comparison arrows control only their own model',async({page})=>{
 await page.goto('./?q=dimethylcyclopropane');
 await page.getByRole('button',{name:'3D comparison',exact:true}).click();
 await expect(page.locator('.comparison-stage canvas')).toHaveCount(4,{timeout:40000});
 const cameras=()=>page.locator('mini-ochem').evaluate(app=>app.comparison.views.map(({view})=>view.camera.position.toArray()));
 const before=await cameras();
 await page.locator('.comparison-card').first().getByRole('button',{name:'Rotate right',exact:true}).click();
 const after=await cameras();
 expect(distance(before[0],after[0])).toBeGreaterThan(.1);
 expect(after.slice(1)).toEqual(before.slice(1));
});
